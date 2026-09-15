import { describe, expect, it, vi } from "vitest";

import type { Finding, SimilarPastIssue } from "../types.js";
import { SimilarIssueLookup } from "./similar-issue-lookup.js";
import type { VectorRepository } from "./vector-repository.js";

function finding(overrides: Partial<Finding> = {}): Finding {
  return {
    agent: "security",
    ruleId: "security/hardcoded-secret",
    title: "Hardcoded secret",
    description: "An API key is committed in source.",
    location: { filePath: "src/pay.ts", lineStart: 10, lineEnd: 10 },
    severity: "critical",
    confidence: 0.9,
    ...overrides,
  };
}

class FakeVectorRepository implements VectorRepository {
  constructor(
    private readonly similar: SimilarPastIssue[] = [],
    private readonly fail = false,
  ) {}

  async index(): Promise<void> {
    if (this.fail) throw new Error("index failed");
  }

  async querySimilar(): Promise<SimilarPastIssue[]> {
    if (this.fail) throw new Error("query failed");
    return this.similar;
  }
}

describe("SimilarIssueLookup", () => {
  it("attaches similar past issues to each finding", async () => {
    const similar: SimilarPastIssue[] = [
      { findingId: "old-1", similarityScore: 0.92, title: "Same hardcoded secret" },
    ];
    const lookup = new SimilarIssueLookup(new FakeVectorRepository(similar));

    const result = await lookup.attach([finding()], "org-1");

    expect(result[0]?.similarPastIssues).toEqual(similar);
  });

  it("returns findings unchanged when the repository throws", async () => {
    const lookup = new SimilarIssueLookup(new FakeVectorRepository([], true));
    const input = finding();

    const result = await lookup.attach([input], "org-1");

    expect(result[0]).toEqual(input);
    expect(result[0]?.similarPastIssues).toBeUndefined();
  });

  it("swallows errors from index and does not throw", async () => {
    const lookup = new SimilarIssueLookup(new FakeVectorRepository([], true));

    await expect(lookup.index([finding()], "org-1")).resolves.toBeUndefined();
  });

  it("indexes every finding through the repository", async () => {
    const repo = new FakeVectorRepository();
    const indexSpy = vi.spyOn(repo, "index");
    const lookup = new SimilarIssueLookup(repo);

    await lookup.index([finding(), finding({ ruleId: "security/xss" })], "org-1");

    expect(indexSpy).toHaveBeenCalledTimes(2);
  });
});
