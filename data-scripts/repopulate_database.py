from __future__ import annotations

import argparse
import os
from pathlib import Path

import httpx
import psycopg

from generate_specialty_embeddings import (
    DEFAULT_BATCH_SIZE,
    DEFAULT_EMBEDDING_MODEL,
    DEFAULT_OPENAI_BASE_URL,
    populate_specialty_embeddings,
)
from shared import DEFAULT_DB_NAME, DEFAULT_DB_PORT, load_root_env

load_root_env()
DEFAULT_INPUT_FILE = Path(__file__).with_name("upmc_doctors.json")


def load_saved_records(input_path: Path) -> list[dict[str, object]]:
    from scrape_doctors import read_json

    return read_json(input_path)


def load_records_into_database(
    conn: psycopg.Connection[object], records: list[dict[str, object]]
) -> None:
    from scrape_doctors import load_records

    load_records(conn, records)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Repopulate Postgres from a saved UPMC doctors JSON file and refresh specialty embeddings."
    )
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_FILE)
    parser.add_argument("--database", default=DEFAULT_DB_NAME)
    parser.add_argument("--dsn", default=os.getenv("DATABASE_URL"))
    parser.add_argument(
        "--model",
        default=os.getenv("OPENAI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL),
    )
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--api-key", default=os.getenv("OPENAI_API_KEY"))
    parser.add_argument(
        "--base-url",
        default=os.getenv("OPENAI_BASE_URL", DEFAULT_OPENAI_BASE_URL),
    )
    return parser.parse_args()


def repopulate_database(
    *,
    input_path: Path,
    dsn: str,
    api_key: str,
    model: str,
    batch_size: int,
    base_url: str,
) -> tuple[int, int]:
    records = load_saved_records(input_path)

    with psycopg.connect(dsn) as conn:
        load_records_into_database(conn, records)

        with httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        ) as client:
            processed = populate_specialty_embeddings(
                conn,
                client=client,
                model=model,
                batch_size=batch_size,
                limit=None,
                force=True,
            )

    return len(records), processed


def main() -> None:
    args = parse_args()
    if not args.api_key:
        raise ValueError("OPENAI_API_KEY or --api-key is required.")

    dsn = (
        args.dsn
        or f"postgresql://docseek:docseek@localhost:{DEFAULT_DB_PORT}/{args.database}"
    )
    loaded, embedded = repopulate_database(
        input_path=args.input,
        dsn=dsn,
        api_key=args.api_key,
        model=args.model,
        batch_size=args.batch_size,
        base_url=args.base_url,
    )
    print(f"Loaded {loaded} doctors into {args.database}")
    print(f"Generated embeddings for {embedded} doctors using {args.model}")


if __name__ == "__main__":
    main()
