from __future__ import annotations

import argparse
import os
from typing import Any

import httpx
import psycopg

from shared import DEFAULT_DB_NAME, DEFAULT_DB_PORT, ensure_schema, load_root_env

DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_BATCH_SIZE = 100
DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1"

load_root_env()


def build_embedding_request_payload(contents: list[str], model: str) -> dict[str, Any]:
    return {
        "input": contents,
        "model": model,
    }


def extract_embeddings(payload: dict[str, Any]) -> list[list[float]]:
    return [
        item["embedding"]
        for item in sorted(payload["data"], key=lambda item: item["index"])
    ]


def format_vector_literal(embedding: list[float]) -> str:
    return "[" + ",".join(format(value, ".17g") for value in embedding) + "]"


def ensure_specialty_search_rows(conn: psycopg.Connection[Any]) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                WITH specialty_content AS (
                    SELECT
                        d.id AS doctor_id,
                        CASE
                            WHEN d.primary_specialty IS NOT NULL AND d.primary_specialty <> '' THEN
                                'Specialty: ' || d.primary_specialty ||
                                COALESCE(
                                    (
                                        SELECT '; ' || string_agg(extra.name, '; ' ORDER BY extra.name)
                                        FROM doctor_specialties ds2
                                        JOIN specialties extra ON extra.id = ds2.specialty_id
                                        WHERE ds2.doctor_id = d.id
                                          AND extra.name IS NOT NULL
                                          AND extra.name <> ''
                                          AND extra.name <> d.primary_specialty
                                    ),
                                    ''
                                )
                            ELSE COALESCE(
                                (
                                    SELECT 'Specialty: ' || string_agg(s.name, '; ' ORDER BY s.name)
                                    FROM doctor_specialties ds
                                    JOIN specialties s ON s.id = ds.specialty_id
                                    WHERE ds.doctor_id = d.id
                                      AND s.name IS NOT NULL
                                      AND s.name <> ''
                                ),
                                'Specialty'
                            )
                        END AS content
                    FROM doctors d
                )
                INSERT INTO doctor_search_embeddings (doctor_id, content, source_field)
                SELECT sc.doctor_id, sc.content, 'specialty'
                FROM specialty_content sc
                LEFT JOIN doctor_search_embeddings dse ON dse.doctor_id = sc.doctor_id
                WHERE dse.doctor_id IS NULL
                """
            )


def reset_specialty_embeddings(
    conn: psycopg.Connection[Any],
) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE doctor_search_embeddings
                SET embedding = NULL,
                    embedding_model = NULL,
                    updated_at = NOW()
                WHERE source_field = 'specialty'
                """
            )


def fetch_pending_rows(
    conn: psycopg.Connection[Any],
    model: str,
    limit: int,
    force: bool,
) -> list[tuple[int, str]]:
    with conn.cursor() as cur:
        return cur.execute(
            """
            SELECT doctor_id, content
            FROM doctor_search_embeddings
            WHERE source_field = 'specialty'
              AND content <> ''
              AND (%s OR embedding IS NULL OR embedding_model IS DISTINCT FROM %s)
            ORDER BY doctor_id
            LIMIT %s
            """,
            (force, model, limit),
        ).fetchall()


def request_embeddings(
    client: httpx.Client,
    contents: list[str],
    model: str,
) -> list[list[float]]:
    response = client.post(
        "/embeddings",
        json=build_embedding_request_payload(contents, model),
    )
    response.raise_for_status()
    return extract_embeddings(response.json())


def update_embeddings(
    conn: psycopg.Connection[Any],
    doctor_ids: list[int],
    embeddings: list[list[float]],
    model: str,
) -> None:
    with conn.transaction():
        with conn.cursor() as cur:
            cur.executemany(
                """
                UPDATE doctor_search_embeddings
                SET embedding = %s::vector,
                    embedding_model = %s,
                    updated_at = NOW()
                WHERE doctor_id = %s
                """,
                [
                    (format_vector_literal(embedding), model, doctor_id)
                    for doctor_id, embedding in zip(doctor_ids, embeddings, strict=True)
                ],
            )


def populate_specialty_embeddings(
    conn: psycopg.Connection[Any],
    client: httpx.Client,
    model: str,
    batch_size: int,
    limit: int | None,
    force: bool,
) -> int:
    ensure_schema(conn)
    ensure_specialty_search_rows(conn)
    if force:
        reset_specialty_embeddings(conn)

    total_processed = 0
    remaining = limit

    while True:
        current_limit = batch_size if remaining is None else min(batch_size, remaining)
        if current_limit <= 0:
            break

        rows = fetch_pending_rows(conn, model=model, limit=current_limit, force=False)
        if not rows:
            print("No more pending rows to process.")
            break
        print(f"Processing batch of {len(rows)} doctors...")

        doctor_ids = [doctor_id for doctor_id, _ in rows]
        contents = [content for _, content in rows]
        embeddings = request_embeddings(client, contents, model)
        update_embeddings(conn, doctor_ids, embeddings, model)

        total_processed += len(rows)
        if remaining is not None:
            remaining -= len(rows)

    return total_processed


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate specialty embeddings for doctors already loaded into Postgres."
    )
    parser.add_argument("--database", default=DEFAULT_DB_NAME)
    parser.add_argument("--dsn", default=os.getenv("DATABASE_URL"))
    parser.add_argument(
        "--model",
        default=os.getenv("OPENAI_EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL),
    )
    parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--api-key", default=os.getenv("OPENAI_API_KEY"))
    parser.add_argument(
        "--base-url",
        default=os.getenv("OPENAI_BASE_URL", DEFAULT_OPENAI_BASE_URL),
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not args.api_key:
        raise ValueError("OPENAI_API_KEY or --api-key is required.")

    dsn = (
        args.dsn
        or f"postgresql://docseek:docseek@localhost:{DEFAULT_DB_PORT}/{args.database}"
    )
    base_url = args.base_url.rstrip("/")

    with httpx.Client(
        base_url=base_url,
        headers={
            "Authorization": f"Bearer {args.api_key}",
            "Content-Type": "application/json",
        },
        timeout=30.0,
    ) as client:
        with psycopg.connect(dsn) as conn:
            processed = populate_specialty_embeddings(
                conn,
                client=client,
                model=args.model,
                batch_size=args.batch_size,
                limit=args.limit,
                force=args.force,
            )

    print(f"Generated embeddings for {processed} doctors using {args.model}")


if __name__ == "__main__":
    main()
