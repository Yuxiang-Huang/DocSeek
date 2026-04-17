# Static Vite + TanStack Router SPA. Serves `dist/` (index.html + assets) with Caddy — no Node/Bun
# at runtime and no DocSeek API in this image (that stays a separate service).
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

COPY --from=builder /app/dist ./dist

ENV PORT=3000
EXPOSE 3000

# /health is handled in Caddyfile. Use printenv so the check follows runtime PORT (e.g. Railway).
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD ["/bin/sh", "-c", "hp=$(printenv PORT); [ -n \"$hp\" ] || hp=3000; wget -q -O /dev/null \"http://127.0.0.1:${hp}/health\" || exit 1"]

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
