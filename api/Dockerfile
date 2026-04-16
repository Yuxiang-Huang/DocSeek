# Bun API (Hono). Build with context = this directory, e.g. from repo root:
#   docker build -f api/Dockerfile api
# On Railway, set the service Root Directory to `api` when using this path in railway.json.

FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock tsconfig.json ./
COPY src ./src

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
