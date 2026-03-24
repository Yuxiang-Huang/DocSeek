# Data Scripts

This folder contains host-run data workflows for DocSeek.

Scripts:

- `scrape_doctors.py`: scrape UPMC doctor data, write JSON, and load Postgres tables.
- `generate_specialty_embeddings.py`: read `doctor_search_embeddings.content` rows and backfill vectors using the OpenAI embeddings API.
- `repopulate_database.py`: reload Postgres from `upmc_doctors.json` and force-refresh specialty embeddings using the existing load and embedding flows.
