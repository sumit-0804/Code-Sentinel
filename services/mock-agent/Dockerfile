FROM node:20-alpine AS build
WORKDIR /repo
COPY package.json package-lock.json turbo.json tsconfig.base.json ./
COPY services/mock-agent ./services/mock-agent
RUN npm install --workspace=@code-sentinel/mock-agent --include-workspace-root
RUN npm run build --workspace=@code-sentinel/mock-agent

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/mock-agent/dist ./dist
COPY --from=build /repo/services/mock-agent/fixtures ./fixtures
COPY --from=build /repo/services/mock-agent/package.json ./
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 8081
CMD ["node", "dist/server.js"]
