# Static frontend only (TanStack Start SPA). Serves `dist/client` with Caddy — no Node/Bun runtime,
# no SSR, and no DocSeek API (that stays a separate service). Build enables `spa` in vite.config.ts.
#
# Build context: `client/`
#   docker build -f client/Dockerfile client \
#     --build-arg VITE_API_BASE_URL=https://your-api.example

FROM oven/bun:1 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN bun run build

FROM caddy:2-alpine

WORKDIR /app

COPY Caddyfile /etc/caddy/Caddyfile
RUN caddy fmt --overwrite /etc/caddy/Caddyfile

COPY --from=builder /app/dist/client ./dist

EXPOSE 3000

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
