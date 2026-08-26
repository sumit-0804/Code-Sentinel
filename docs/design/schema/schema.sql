-- Code-Sentinel — PostgreSQL schema (System Design Document, Deliverable 4)
-- Target: PostgreSQL 15+. Every table traces to at least one functional requirement in the BRD.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------

CREATE TYPE org_role          AS ENUM ('admin', 'member');
CREATE TYPE agent_kind        AS ENUM ('security', 'style', 'performance', 'logic', 'documentation');
CREATE TYPE review_trigger    AS ENUM ('github_pull_request', 'vscode_on_demand', 'dashboard_manual');
CREATE TYPE review_status     AS ENUM ('queued', 'running', 'completed', 'partial', 'failed');
CREATE TYPE check_conclusion  AS ENUM ('pass', 'fail', 'neutral');
CREATE TYPE agent_run_status  AS ENUM ('pending', 'running', 'succeeded', 'timed_out', 'failed', 'skipped');
CREATE TYPE severity          AS ENUM ('critical', 'warning', 'info');
CREATE TYPE fix_kind          AS ENUM ('deterministic', 'ai_suggested');
CREATE TYPE suggestion_state  AS ENUM ('proposed', 'accepted', 'rejected', 'superseded');

-- ---------------------------------------------------------------------------
-- Tenancy and identity  (FR-GW-02, FR-WEB-01, NFR-13)
-- ---------------------------------------------------------------------------

CREATE TABLE organizations (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_org_login            TEXT        NOT NULL UNIQUE,
    github_org_id               BIGINT      NOT NULL UNIQUE,
    display_name                TEXT        NOT NULL,
    default_confidence_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.800
        CHECK (default_confidence_threshold BETWEEN 0 AND 1),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_user_id    BIGINT      NOT NULL UNIQUE,
    github_login      TEXT        NOT NULL,
    email             TEXT,
    avatar_url        TEXT,
    last_seen_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id         UUID        NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    role            org_role    NOT NULL DEFAULT 'member',
    added_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, user_id)
);

-- Installation token itself is never stored; it is minted per request from the App private key.
CREATE TABLE github_installations (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    github_installation_id BIGINT     NOT NULL UNIQUE,
    account_login         TEXT        NOT NULL,
    webhook_secret_ref    TEXT        NOT NULL,
    suspended_at          TIMESTAMPTZ,
    installed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    uninstalled_at        TIMESTAMPTZ
);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    token_hash      BYTEA       NOT NULL UNIQUE,
    user_agent      TEXT,
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    label           TEXT        NOT NULL,
    key_prefix      TEXT        NOT NULL,
    key_hash        BYTEA       NOT NULL UNIQUE,
    last_used_at    TIMESTAMPTZ,
    revoked_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user     ON sessions(user_id)  WHERE revoked_at IS NULL;
CREATE INDEX idx_api_keys_user     ON api_keys(user_id)  WHERE revoked_at IS NULL;
CREATE INDEX idx_org_members_user  ON organization_members(user_id);

-- ---------------------------------------------------------------------------
-- Repositories and per-repository configuration  (FR-WEB-02, FR-WEB-03, FR-ORC-06)
-- ---------------------------------------------------------------------------

CREATE TABLE repositories (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id       UUID        NOT NULL REFERENCES organizations(id)        ON DELETE CASCADE,
    github_installation_id UUID       NOT NULL REFERENCES github_installations(id) ON DELETE CASCADE,
    github_repo_id        BIGINT      NOT NULL UNIQUE,
    full_name             TEXT        NOT NULL,
    default_branch        TEXT        NOT NULL DEFAULT 'main',
    primary_language      TEXT,
    is_private            BOOLEAN     NOT NULL DEFAULT TRUE,
    review_enabled        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organization_id, full_name)
);

-- NULL threshold means "inherit": org default, else the platform default of 0.800 (FR-ORC-06).
CREATE TABLE repository_settings (
    repository_id                UUID PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    confidence_threshold_override NUMERIC(4,3)
        CHECK (confidence_threshold_override BETWEEN 0 AND 1),
    agent_timeout_ms             INTEGER     NOT NULL DEFAULT 20000 CHECK (agent_timeout_ms BETWEEN 1000 AND 120000),
    auto_fix_style               BOOLEAN     NOT NULL DEFAULT TRUE,
    post_inline_comments         BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_by                   UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repository_agent_config (
    repository_id UUID        NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    agent         agent_kind  NOT NULL,
    enabled       BOOLEAN     NOT NULL DEFAULT TRUE,
    updated_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (repository_id, agent)
);

CREATE INDEX idx_repositories_org ON repositories(organization_id) WHERE review_enabled;

-- ---------------------------------------------------------------------------
-- Review jobs  (FR-ORC-01..04, FR-GH-01, FR-GH-02, FR-VSC-01, NFR-04)
-- ---------------------------------------------------------------------------

CREATE TABLE reviews (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id        UUID           NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    repository_id          UUID           NOT NULL REFERENCES repositories(id)  ON DELETE CASCADE,
    trigger                review_trigger NOT NULL,
    triggered_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    pr_number              INTEGER,
    pr_title               TEXT,
    head_sha               TEXT           NOT NULL,
    base_sha               TEXT,
    head_ref               TEXT,
    base_ref               TEXT,
    changed_files_count    INTEGER        NOT NULL DEFAULT 0,
    changed_lines_count    INTEGER        NOT NULL DEFAULT 0,
    status                 review_status  NOT NULL DEFAULT 'queued',
    confidence_threshold   NUMERIC(4,3)   NOT NULL,
    github_check_run_id    BIGINT,
    check_conclusion       check_conclusion,
    duration_ms            INTEGER,
    error_message          TEXT,
    delivery_id            TEXT,
    started_at             TIMESTAMPTZ,
    completed_at           TIMESTAMPTZ,
    created_at             TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CHECK (trigger <> 'github_pull_request' OR pr_number IS NOT NULL)
);

-- Guards against a redelivered webhook starting a duplicate job for the same commit (FR-GH-01).
CREATE UNIQUE INDEX uq_reviews_pr_head
    ON reviews(repository_id, pr_number, head_sha)
    WHERE trigger = 'github_pull_request';

CREATE UNIQUE INDEX uq_reviews_delivery ON reviews(delivery_id) WHERE delivery_id IS NOT NULL;
CREATE INDEX idx_reviews_history ON reviews(organization_id, created_at DESC);
CREATE INDEX idx_reviews_repo    ON reviews(repository_id, created_at DESC);
CREATE INDEX idx_reviews_status  ON reviews(status) WHERE status IN ('queued', 'running');

-- One row per agent invoked, written even on timeout so NFR-12 has per-agent latency and failures.
CREATE TABLE agent_runs (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id      UUID             NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    agent          agent_kind       NOT NULL,
    status         agent_run_status NOT NULL DEFAULT 'pending',
    service_version TEXT,
    llm_provider   TEXT,
    llm_model      TEXT,
    llm_fallback_depth SMALLINT     NOT NULL DEFAULT 0,
    findings_count INTEGER          NOT NULL DEFAULT 0,
    latency_ms     INTEGER,
    timeout_ms     INTEGER          NOT NULL,
    attempt        SMALLINT         NOT NULL DEFAULT 1,
    error_code     TEXT,
    error_message  TEXT,
    started_at     TIMESTAMPTZ,
    finished_at    TIMESTAMPTZ,
    UNIQUE (review_id, agent, attempt)
);

CREATE INDEX idx_agent_runs_review ON agent_runs(review_id);
CREATE INDEX idx_agent_runs_slow   ON agent_runs(agent, latency_ms DESC) WHERE status = 'succeeded';

-- ---------------------------------------------------------------------------
-- Findings and suggested fixes  (FR-ORC-03, FR-ORC-04, FR-GH-03, FR-GH-04, FR-SEC-03)
-- ---------------------------------------------------------------------------

CREATE TABLE findings (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id      UUID        NOT NULL REFERENCES reviews(id)    ON DELETE CASCADE,
    agent_run_id   UUID        NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    agent          agent_kind  NOT NULL,
    rule_id        TEXT        NOT NULL,
    title          TEXT        NOT NULL,
    description    TEXT        NOT NULL,
    file_path      TEXT        NOT NULL,
    line_start     INTEGER     NOT NULL CHECK (line_start > 0),
    line_end       INTEGER     NOT NULL CHECK (line_end >= line_start),
    severity       severity    NOT NULL,
    confidence     NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    severity_rank  SMALLINT    NOT NULL,
    cwe_id         TEXT,
    dedupe_key     TEXT        NOT NULL,
    duplicate_of   UUID REFERENCES findings(id) ON DELETE SET NULL,
    duplicate_count SMALLINT   NOT NULL DEFAULT 1,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- dedupe_key = hash(file_path, line range, rule/issue type); collapses agents reporting the same issue.
CREATE UNIQUE INDEX uq_findings_dedupe ON findings(review_id, dedupe_key) WHERE duplicate_of IS NULL;
CREATE INDEX idx_findings_review  ON findings(review_id, severity_rank, confidence DESC);
CREATE INDEX idx_findings_agent   ON findings(review_id, agent);
CREATE INDEX idx_findings_file    ON findings(review_id, file_path);

CREATE TABLE suggestions (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    finding_id             UUID             NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    kind                   fix_kind         NOT NULL,
    state                  suggestion_state NOT NULL DEFAULT 'proposed',
    original_snippet       TEXT             NOT NULL,
    suggested_snippet      TEXT             NOT NULL,
    explanation            TEXT,
    posted_to_github       BOOLEAN          NOT NULL DEFAULT FALSE,
    github_comment_id      BIGINT,
    resolved_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at            TIMESTAMPTZ,
    resolution_commit_sha  TEXT,
    created_at             TIMESTAMPTZ      NOT NULL DEFAULT now()
);

-- Deterministic style fixes never need review; AI fixes must carry an explicit accept/reject (FR-GH-04, NFR-07).
ALTER TABLE suggestions ADD CONSTRAINT ck_ai_fix_needs_action
    CHECK (kind = 'deterministic' OR state <> 'accepted' OR resolved_by_user_id IS NOT NULL);

CREATE INDEX idx_suggestions_finding ON suggestions(finding_id);
CREATE INDEX idx_suggestions_open    ON suggestions(state) WHERE state = 'proposed';

-- ---------------------------------------------------------------------------
-- Vector database bookkeeping  (FR-VDB-01, FR-VDB-02)
-- Vectors live in ChromaDB; PostgreSQL keeps the mapping so a finding can be traced both ways.
-- ---------------------------------------------------------------------------

CREATE TABLE finding_embeddings (
    finding_id      UUID PRIMARY KEY REFERENCES findings(id) ON DELETE CASCADE,
    organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    collection      TEXT        NOT NULL,
    vector_id       TEXT        NOT NULL,
    embedding_model TEXT        NOT NULL,
    indexed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (collection, vector_id)
);

CREATE TABLE finding_similarities (
    finding_id         UUID         NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    similar_finding_id UUID         NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
    similarity_score   NUMERIC(5,4) NOT NULL CHECK (similarity_score BETWEEN 0 AND 1),
    retrieved_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (finding_id, similar_finding_id),
    CHECK (finding_id <> similar_finding_id)
);

CREATE INDEX idx_similarities_score ON finding_similarities(finding_id, similarity_score DESC);
CREATE INDEX idx_embeddings_org     ON finding_embeddings(organization_id);
