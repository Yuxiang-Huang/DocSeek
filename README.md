# DocSeek

Minimal monorepo for the DocSeek frontend and API.

The detailed setup and run instructions live in the subfolder READMEs:

- `api/README.md`
- `client/README.md`

## Docker Compose

From the repo root you can start Postgres, the API, and the client together with:

```bash
docker compose up
```

Service endpoints:

- `client`: `http://localhost:5173`
- `api`: `http://localhost:3000`
- `postgres`: `localhost:55432`

The scraper is still intended to be run from the host machine because the UPMC site blocked headless/containerized requests during implementation. Once Compose is up, load scraped data into the Dockerized Postgres with:

```bash
cd scraper
DATABASE_URL=postgresql://docseek:docseek@localhost:55432/docseek_upmc uv run python main.py --mode scrape-load
```

## Tech stack

- Frontend: React, Vite, TanStack Router
- Backend: Hono on Bun
