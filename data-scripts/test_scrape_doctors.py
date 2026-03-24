from pathlib import Path

from scrape_doctors import (
    CardData,
    build_doctor_record,
    extract_card_data,
    normalize_tags,
)
from shared import SCHEMA_FILE, build_specialty_search_text

INIT_PGVECTOR_FILE = SCHEMA_FILE.parent / "init" / "001-enable-pgvector.sql"


def test_schema_file_lives_in_postgres_folder() -> None:
    assert SCHEMA_FILE.name == "schema.sql"
    assert SCHEMA_FILE.parent.name == "postgres"
    assert SCHEMA_FILE.is_file()


def test_pgvector_init_file_exists() -> None:
    assert INIT_PGVECTOR_FILE.name == "001-enable-pgvector.sql"
    assert INIT_PGVECTOR_FILE.parent.name == "init"
    assert INIT_PGVECTOR_FILE.is_file()


def test_schema_enables_pgvector_extension() -> None:
    schema = SCHEMA_FILE.read_text(encoding="utf-8")
    init_sql = INIT_PGVECTOR_FILE.read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS vector;" in schema
    assert "CREATE EXTENSION IF NOT EXISTS vector;" in init_sql
    assert "CREATE TABLE IF NOT EXISTS doctor_search_embeddings" in schema
    assert "embedding vector(1536)" in schema


def test_build_specialty_search_text_uses_specialties_only() -> None:
    record = {
        "primary_specialty": "Family Medicine",
        "specialties": [
            "Internal Medicine",
            "Family Medicine",
            "Internal Medicine",
        ],
    }

    assert (
        build_specialty_search_text(record)
        == "Specialty: Internal Medicine; Family Medicine"
    )


def test_extract_card_data_reads_name_specialty_tags_and_ratings_link() -> None:
    html = """
    <div data-testid="ProviderCard" id="1466136">
      <h2><a href="/provider/christopher-aaron/1466136?sort=name&page=1&from=search-list">Christopher Aaron, DO</a></h2>
      <div data-testid="ProviderRating">
        <a href="/provider/christopher-aaron/1466136?sort=name&page=1#profile-reviews">218 ratings, 43 reviews</a>
      </div>
      <p>Family Medicine</p>
      <div data-testid="ProviderBadges">
        <span>Accepting New Patients</span>
        <span>Online booking</span>
        <span>Video Visit</span>
      </div>
    </div>
    """

    cards = extract_card_data(html)

    assert cards[1466136] == CardData(
        provider_id=1466136,
        display_name="Christopher Aaron, DO",
        specialty="Family Medicine",
        tags=["Accepting New Patients", "Online booking", "Video Visit"],
        ratings_url="https://providers.upmc.com/provider/christopher-aaron/1466136?sort=name&page=1#profile-reviews",
    )


def test_normalize_tags_backfills_flags_from_provider_state() -> None:
    provider = {
        "accepting_new_patients": True,
        "book_online_url": "https://myupmc.upmc.com/open-scheduling?id=1806&linksource=findadoc",
        "appointment_ehr_purposes": [
            {"ehr_data": [{"visit_method": "video"}]},
        ],
    }

    assert normalize_tags([], provider) == [
        "Accepting New Patients",
        "Online booking",
        "Video Visit",
    ]


def test_build_doctor_record_uses_primary_location_and_related_lists() -> None:
    provider = {
        "id": 1466136,
        "npi": "1083879860",
        "name": {"full": "Christopher Aaron"},
        "provider_name": {
            "first_name": "Christopher",
            "middle_name": "L.",
            "last_name": "Aaron",
            "suffix": None,
        },
        "specialties": [{"name": "Family Medicine"}],
        "accepting_new_patients": True,
        "pmc_url": "https://providers.upmc.com/provider/christopher-l-aaron/1466136",
        "book_online_url": "https://myupmc.upmc.com/open-scheduling?id=1806&linksource=findadoc",
        "book_online_override_url": "https://myupmc.upmc.com/open-scheduling?id=1806&linksource=findadoc",
        "web_phone_number": "814-886-8161",
        "age_groups_seen": ["Child", "Adult"],
        "network_affiliations": [
            {"name": "UPMC Altoona", "type": "Hospital"},
            {"name": "Provider Enrollment and Credentialing", "type": "Hospital"},
        ],
        "locations": [
            {
                "id": 5427752,
                "name": "UPMC Primary Care, Mainline Medical Associates",
                "street1": "792 Gallitzin Road",
                "street2": "",
                "suite": "",
                "city": "Cresson",
                "state": "PA",
                "zip": "16630",
                "phone": "814-886-8161",
                "rank": 1,
            }
        ],
        "appointment_ehr_purposes": [{"ehr_data": [{"visit_method": "video"}]}],
    }
    card = CardData(
        provider_id=1466136,
        display_name="Christopher Aaron, DO",
        specialty="Family Medicine",
        tags=["Accepting New Patients"],
        ratings_url="https://providers.upmc.com/provider/christopher-aaron/1466136?sort=name&page=1#profile-reviews",
    )

    record = build_doctor_record(provider, card)

    assert record["full_name"] == "Christopher Aaron, DO"
    assert record["ratings_url"].endswith("#profile-reviews")
    assert record["book_appointment_url"] == "https://myupmc.upmc.com/open-scheduling?id=1806&linksource=findadoc"
    assert record["primary_location"] == "792 Gallitzin Road, Cresson, PA, 16630"
    assert record["primary_phone"] == "814-886-8161"
    assert record["tags"] == ["Accepting New Patients", "Online booking", "Video Visit"]
    assert record["hospitals"] == ["UPMC Altoona", "Provider Enrollment and Credentialing"]
    assert record["locations"][0]["source_location_id"] == 5427752
