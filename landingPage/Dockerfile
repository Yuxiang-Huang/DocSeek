# Node 20.19+ is required by Vite 7; Tailwind v4 @tailwindcss/oxide needs matching
# optional native binaries (use glibc Debian, not Alpine/musl, for reliable installs).
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/dist ./dist
COPY scripts/railway-serve.mjs ./scripts/railway-serve.mjs

ENV PORT=8080
EXPOSE 8080
USER node
CMD ["node", "scripts/railway-serve.mjs"]
