from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import psycopg

DEFAULT_DB_NAME = "docseek_upmc"
DEFAULT_DB_PORT = 55432
SCHEMA_FILE = Path(__file__).parent / "postgres" / "schema.sql"
ROOT_ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


def load_root_env() -> None:
    if not ROOT_ENV_FILE.is_file():
        return

    for raw_line in ROOT_ENV_FILE.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if not key or key in os.environ:
            continue

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]

        os.environ[key] = value


def dedupe_preserve_order(values: list[str | None]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.add(value)
            ordered.append(value)
    return ordered


def build_specialty_search_text(record: dict[str, Any]) -> str:
    specialties = dedupe_preserve_order(
        [
            *(record.get("specialties") or []),
            record.get("primary_specialty"),
        ]
    )
    if not specialties:
        return "Specialty"
    return f"Specialty: {'; '.join(specialties)}"


def create_database_if_needed(admin_dsn: str, database_name: str) -> None:
    with psycopg.connect(admin_dsn, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s", (database_name,)
            )
            if cur.fetchone() is None:
                cur.execute(f'CREATE DATABASE "{database_name}"')


def ensure_schema(conn: psycopg.Connection[Any]) -> None:
    conn.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
