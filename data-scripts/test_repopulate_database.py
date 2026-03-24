from pathlib import Path
import sys

from repopulate_database import parse_args, repopulate_database


def test_parse_args_uses_json_default_and_env_model(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setattr(sys, "argv", ["repopulate_database.py"])

    args = parse_args()

    assert args.input.name == "upmc_doctors.json"
    assert args.model == "text-embedding-3-large"


def test_repopulate_database_reuses_load_and_embedding_pipeline(monkeypatch, tmp_path: Path) -> None:
    calls: list[object] = []
    json_path = tmp_path / "upmc_doctors.json"
    records = [{"source_provider_id": 1}, {"source_provider_id": 2}]

    class FakeConnection:
        def __enter__(self):
            calls.append("conn_enter")
            return self

        def __exit__(self, exc_type, exc, tb):
            calls.append("conn_exit")
            return False

    class FakeClient:
        def __init__(self, **kwargs):
            calls.append(("client_init", kwargs))

        def __enter__(self):
            calls.append("client_enter")
            return self

        def __exit__(self, exc_type, exc, tb):
            calls.append("client_exit")
            return False

    fake_connection = FakeConnection()

    monkeypatch.setattr(
        "repopulate_database.load_saved_records",
        lambda path: records if path == json_path else [],
    )
    monkeypatch.setattr("repopulate_database.psycopg.connect", lambda dsn: calls.append(("connect", dsn)) or fake_connection)
    monkeypatch.setattr(
        "repopulate_database.load_records_into_database",
        lambda conn, loaded_records: calls.append(("load_records", conn, loaded_records)),
    )
    monkeypatch.setattr("repopulate_database.httpx.Client", FakeClient)
    monkeypatch.setattr(
        "repopulate_database.populate_specialty_embeddings",
        lambda conn, client, model, batch_size, limit, force: calls.append(
            ("populate", conn, client, model, batch_size, limit, force)
        )
        or 2,
    )

    loaded, embedded = repopulate_database(
        input_path=json_path,
        dsn="postgresql://example",
        api_key="secret",
        model="text-embedding-3-small",
        batch_size=50,
        base_url="https://api.openai.com/v1/",
    )

    assert (loaded, embedded) == (2, 2)
    assert calls[0] == ("connect", "postgresql://example")
    assert calls[1] == "conn_enter"
    assert calls[2] == ("load_records", fake_connection, records)
    assert calls[3] == (
        "client_init",
        {
            "base_url": "https://api.openai.com/v1",
            "headers": {
                "Authorization": "Bearer secret",
                "Content-Type": "application/json",
            },
            "timeout": 30.0,
        },
    )
    assert calls[4] == "client_enter"
    assert calls[5][0] == "populate"
    assert calls[5][1] is fake_connection
    assert calls[5][3:] == ("text-embedding-3-small", 50, None, True)
    assert calls[6] == "client_exit"
    assert calls[7] == "conn_exit"
