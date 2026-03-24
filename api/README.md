# DocSeek API

Backend service for DocSeek built with Bun and Hono.

## Setup

Install dependencies:

```sh
bun install
```

Create a repo root `.env` with at least `OPENAI_API_KEY` and `DATABASE_URL`. Set `CORS_ALLOWED_ORIGINS` to a comma-separated list of allowed frontend origins, for example `http://localhost:5173,http://127.0.0.1:5173`. The API bootstrap loads that file explicitly and will fail at startup if `OPENAI_API_KEY` is missing.

## Run

Start the API in development mode:

```sh
bun run dev
```

The API runs on `http://localhost:3000` by default.
