# Bun API (Hono). Build context = repository root:
#   docker build -f api/Dockerfile .

FROM oven/bun:1 AS deps
WORKDIR /app

COPY api/package.json api/bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY api/package.json api/bun.lock api/tsconfig.json ./
COPY api/src ./src

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
