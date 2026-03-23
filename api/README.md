# DocSeek API

Backend service for DocSeek built with Bun and Hono.

## Setup

Install dependencies:

```sh
bun install
```

Create a repo root `.env` with at least `OPENAI_API_KEY` and `DATABASE_URL`. The API bootstrap loads that file explicitly and will fail at startup if `OPENAI_API_KEY` is missing.

## Run

Start the API in development mode:

```sh
bun run dev
```

The API runs on `http://localhost:3000` by default.
