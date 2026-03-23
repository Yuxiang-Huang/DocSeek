import sys

from generate_specialty_embeddings import (
    build_embedding_request_payload,
    ensure_specialty_search_rows,
    extract_embeddings,
    format_vector_literal,
    parse_args,
    populate_specialty_embeddings,
    reset_specialty_embeddings,
)


def test_build_embedding_request_payload_uses_model_and_inputs() -> None:
    assert build_embedding_request_payload(
        ["Specialty: Family Medicine", "Specialty: Cardiology"],
        "text-embedding-3-small",
    ) == {
        "input": ["Specialty: Family Medicine", "Specialty: Cardiology"],
        "model": "text-embedding-3-small",
    }


def test_extract_embeddings_returns_response_order_by_index() -> None:
    payload = {
        "data": [
            {"index": 1, "embedding": [0.3, 0.4]},
            {"index": 0, "embedding": [0.1, 0.2]},
        ]
    }

    assert extract_embeddings(payload) == [[0.1, 0.2], [0.3, 0.4]]


def test_format_vector_literal_serializes_pgvector_input() -> None:
    assert format_vector_literal([0.125, -0.5, 1.0]) == "[0.125,-0.5,1]"


def test_parse_args_uses_openai_embedding_model_env(monkeypatch) -> None:
    monkeypatch.setenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-large")
    monkeypatch.setattr(sys, "argv", ["generate_specialty_embeddings.py"])

    args = parse_args()

    assert args.model == "text-embedding-3-large"


def test_ensure_specialty_search_rows_bootstraps_from_doctors_table() -> None:
    executed_sql: list[str] = []

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql: str) -> None:
            executed_sql.append(sql)

    class FakeTransaction:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeConnection:
        def transaction(self):
            return FakeTransaction()

        def cursor(self):
            return FakeCursor()

    ensure_specialty_search_rows(FakeConnection())

    assert "INSERT INTO doctor_search_embeddings" in executed_sql[0]
    assert "FROM doctors d" in executed_sql[0]
    assert "LEFT JOIN doctor_search_embeddings dse" in executed_sql[0]


def test_reset_specialty_embeddings_clears_existing_vectors() -> None:
    executed_sql: list[str] = []

    class FakeCursor:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, sql: str) -> None:
            executed_sql.append(sql)

    class FakeTransaction:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    class FakeConnection:
        def transaction(self):
            return FakeTransaction()

        def cursor(self):
            return FakeCursor()

    reset_specialty_embeddings(FakeConnection())

    assert "UPDATE doctor_search_embeddings" in executed_sql[0]
    assert "SET embedding = NULL" in executed_sql[0]
    assert "WHERE source_field = 'specialty'" in executed_sql[0]


def test_populate_specialty_embeddings_bootstraps_rows_before_fetching(monkeypatch) -> None:
    calls: list[str] = []

    monkeypatch.setattr(
        "generate_specialty_embeddings.ensure_schema",
        lambda conn: calls.append("ensure_schema"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.ensure_specialty_search_rows",
        lambda conn: calls.append("ensure_specialty_search_rows"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.reset_specialty_embeddings",
        lambda conn: calls.append("reset_specialty_embeddings"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.fetch_pending_rows",
        lambda conn, model, limit, force: [],
    )

    processed = populate_specialty_embeddings(
        conn=object(),
        client=object(),
        model="text-embedding-3-small",
        batch_size=100,
        limit=None,
        force=False,
    )

    assert processed == 0
    assert calls == ["ensure_schema", "ensure_specialty_search_rows"]


def test_populate_specialty_embeddings_resets_rows_once_before_forced_refresh(
    monkeypatch,
) -> None:
    calls: list[object] = []

    monkeypatch.setattr(
        "generate_specialty_embeddings.ensure_schema",
        lambda conn: calls.append("ensure_schema"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.ensure_specialty_search_rows",
        lambda conn: calls.append("ensure_specialty_search_rows"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.reset_specialty_embeddings",
        lambda conn: calls.append("reset_specialty_embeddings"),
    )
    monkeypatch.setattr(
        "generate_specialty_embeddings.fetch_pending_rows",
        lambda conn, model, limit, force: calls.append(
            ("fetch_pending_rows", model, limit, force)
        )
        or [],
    )

    processed = populate_specialty_embeddings(
        conn=object(),
        client=object(),
        model="text-embedding-3-small",
        batch_size=100,
        limit=None,
        force=True,
    )

    assert processed == 0
    assert calls == [
        "ensure_schema",
        "ensure_specialty_search_rows",
        "reset_specialty_embeddings",
        ("fetch_pending_rows", "text-embedding-3-small", 100, False),
    ]
