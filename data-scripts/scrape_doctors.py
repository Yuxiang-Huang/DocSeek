from __future__ import annotations

import argparse
import html
import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urljoin

import psycopg
from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait

from shared import (
    DEFAULT_DB_NAME,
    DEFAULT_DB_PORT,
    build_specialty_search_text,
    create_database_if_needed,
    dedupe_preserve_order,
    ensure_schema,
    load_root_env,
)

BASE_URL = "https://providers.upmc.com"
SEARCH_URL = BASE_URL + "/search?sort=name&page={page}"
DEFAULT_DATA_FILE = Path(__file__).with_name("upmc_doctors.json")
PAGE_DELAY_SECONDS = 5

load_root_env()


@dataclass(slots=True)
class CardData:
    provider_id: int
    display_name: str
    specialty: str | None
    tags: list[str]
    ratings_url: str | None


def absolute_url(path_or_url: str | None) -> str | None:
    if not path_or_url:
        return None
    return urljoin(BASE_URL, path_or_url)


def extract_card_data(page_html: str) -> dict[int, CardData]:
    soup = BeautifulSoup(page_html, "lxml")
    cards: dict[int, CardData] = {}

    for card in soup.select('[data-testid="ProviderCard"]'):
        provider_id = int(card["id"])
        name_link = card.select_one("h2 a")
        specialty_node = card.select_one("p")
        rating_link = card.select_one('a[href*="#profile-reviews"]')
        tags = [
            chip.get_text(" ", strip=True)
            for chip in card.select('[data-testid="ProviderBadges"] span')
        ]

        cards[provider_id] = CardData(
            provider_id=provider_id,
            display_name=name_link.get_text(" ", strip=True) if name_link else "",
            specialty=specialty_node.get_text(" ", strip=True)
            if specialty_node
            else None,
            tags=dedupe_preserve_order(tags),
            ratings_url=absolute_url(rating_link.get("href")) if rating_link else None,
        )

    return cards


def parse_state_from_html(page_html: str) -> dict[str, Any]:
    soup = BeautifulSoup(page_html, "lxml")
    state_node = soup.select_one("meta#state")
    if state_node is None:
        raise ValueError("Unable to find serialized state in page HTML.")
    return json.loads(html.unescape(state_node["content"]))


def provider_has_video_visit(provider: dict[str, Any]) -> bool:
    if provider.get("video_visit") or provider.get("telehealth_badge"):
        return True
    for purpose in provider.get("appointment_ehr_purposes") or []:
        for ehr_data in purpose.get("ehr_data") or []:
            if ehr_data.get("visit_method") == "video":
                return True
    return False


def normalize_tags(card_tags: list[str], provider: dict[str, Any]) -> list[str]:
    tags = list(card_tags)
    if provider.get("accepting_new_patients"):
        tags.append("Accepting New Patients")
    if provider.get("book_online_override_url") or provider.get("book_online_url"):
        tags.append("Online booking")
    if provider_has_video_visit(provider):
        tags.append("Video Visit")
    return dedupe_preserve_order(tags)


def build_doctor_record(
    provider: dict[str, Any],
    card: CardData | None,
) -> dict[str, Any]:
    locations = provider.get("locations") or []
    primary_location = locations[0] if locations else None
    specialties = [
        item["name"] for item in provider.get("specialties") or [] if item.get("name")
    ]
    hospital_affiliations = [
        affiliation["name"]
        for affiliation in provider.get("network_affiliations") or []
        if affiliation.get("type") == "Hospital" and affiliation.get("name")
    ]
    profile_url = provider.get("pmc_url")
    rating_url = (
        card.ratings_url
        if card and card.ratings_url
        else (f"{profile_url}#profile-reviews" if profile_url else None)
    )
    booking_url = provider.get("book_online_override_url") or provider.get(
        "book_online_url"
    )
    location_summary = None
    if primary_location:
        address_bits = [
            primary_location.get("street1"),
            primary_location.get("street2"),
            primary_location.get("suite"),
            primary_location.get("city"),
            primary_location.get("state"),
            primary_location.get("zip"),
        ]
        location_summary = ", ".join(bit for bit in address_bits if bit)

    return {
        "source_provider_id": provider["id"],
        "npi": provider.get("npi"),
        "full_name": card.display_name
        if card and card.display_name
        else provider["name"]["full"],
        "first_name": provider.get("provider_name", {}).get("first_name"),
        "middle_name": provider.get("provider_name", {}).get("middle_name"),
        "last_name": provider.get("provider_name", {}).get("last_name"),
        "suffix": provider.get("provider_name", {}).get("suffix"),
        "primary_specialty": card.specialty
        if card and card.specialty
        else (specialties[0] if specialties else None),
        "accepting_new_patients": bool(provider.get("accepting_new_patients")),
        "profile_url": profile_url,
        "ratings_url": rating_url,
        "book_appointment_url": booking_url,
        "primary_location": location_summary,
        "primary_phone": (
            primary_location.get("phone")
            if primary_location and primary_location.get("phone")
            else provider.get("web_phone_number")
        ),
        "age_groups_seen": provider.get("age_groups_seen") or [],
        "tags": normalize_tags(card.tags if card else [], provider),
        "specialties": specialties,
        "hospitals": dedupe_preserve_order(hospital_affiliations),
        "locations": [
            {
                "source_location_id": location["id"],
                "name": location.get("name"),
                "street1": location.get("street1"),
                "street2": location.get("street2"),
                "suite": location.get("suite"),
                "city": location.get("city"),
                "state": location.get("state"),
                "zip_code": location.get("zip"),
                "phone": location.get("phone"),
                "rank": location.get("rank"),
            }
            for location in locations
        ],
    }


def page_is_blocked(page_html: str) -> bool:
    lowered = page_html.lower()
    return (
        "request unsuccessful. incapsula incident id" in lowered
        or "cwudnsai" in lowered
    )


def build_driver(headless: bool) -> webdriver.Chrome:
    options = Options()
    if headless:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1440,2200")
    return webdriver.Chrome(options=options)


def fetch_page_html(
    driver: webdriver.Chrome, page: int, wait_seconds: int, retries: int
) -> str:
    wait = WebDriverWait(driver, wait_seconds)
    last_error: Exception | None = None

    for attempt in range(1, retries + 1):
        driver.get(SEARCH_URL.format(page=page))
        try:
            wait.until(
                lambda current_driver: len(
                    current_driver.find_elements(
                        By.CSS_SELECTOR, '[data-testid="ProviderCard"]'
                    )
                )
                > 0
                and current_driver.find_elements(By.CSS_SELECTOR, "meta#state")
            )
            page_html = driver.page_source
            if page_is_blocked(page_html):
                raise RuntimeError(f"UPMC blocked page {page}.")
            return page_html
        except (
            Exception
        ) as exc:  # pragma: no cover - exercised in real scrape, not unit tests
            last_error = exc
            time.sleep(min(2 * attempt, 10))

    raise RuntimeError(
        f"Failed to fetch page {page} after {retries} attempts."
    ) from last_error


def scrape_providers(
    start_page: int,
    end_page: int | None,
    wait_seconds: int,
    retries: int,
    headless: bool,
) -> list[dict[str, Any]]:
    driver = build_driver(headless=headless)
    doctors: dict[int, dict[str, Any]] = {}

    try:
        page = start_page
        total_pages = end_page

        while True:
            page_html = fetch_page_html(
                driver, page, wait_seconds=wait_seconds, retries=retries
            )
            state = parse_state_from_html(page_html)
            cards = extract_card_data(page_html)

            if total_pages is None:
                total_pages = int(state["searchV9"]["totalPages"])

            for provider_id in state["searchV9"]["providerIds"]:
                provider = state["providers"][str(provider_id)]
                doctors[provider_id] = build_doctor_record(
                    provider, cards.get(provider_id)
                )

            print(f"Scraped page {page}/{total_pages} ({len(doctors)} doctors so far)")

            if page >= total_pages:
                break
            time.sleep(PAGE_DELAY_SECONDS)
            page += 1

    finally:
        driver.quit()

    return list(doctors.values())


def write_json(records: list[dict[str, Any]], output_path: Path) -> None:
    output_path.write_text(json.dumps(records, indent=2), encoding="utf-8")


def read_json(input_path: Path) -> list[dict[str, Any]]:
    return json.loads(input_path.read_text(encoding="utf-8"))


def load_records(conn: psycopg.Connection[Any], records: list[dict[str, Any]]) -> None:
    ensure_schema(conn)

    with conn.transaction():
        with conn.cursor() as cur:
            cur.execute(
                """
                TRUNCATE doctor_search_embeddings, doctor_hospitals,
                         doctor_locations, doctor_specialties, doctor_age_groups,
                         doctor_tags, feedback, hospitals, locations, specialties,
                         age_groups, tags, doctors
                RESTART IDENTITY;
                """
            )

            cur.executemany(
                """
                INSERT INTO doctors (
                    source_provider_id, npi, full_name, first_name, middle_name, last_name, suffix,
                    primary_specialty, accepting_new_patients, profile_url, ratings_url,
                    book_appointment_url, primary_location, primary_phone
                ) VALUES (
                    %(source_provider_id)s, %(npi)s, %(full_name)s, %(first_name)s, %(middle_name)s,
                    %(last_name)s, %(suffix)s, %(primary_specialty)s, %(accepting_new_patients)s,
                    %(profile_url)s, %(ratings_url)s, %(book_appointment_url)s, %(primary_location)s,
                    %(primary_phone)s
                )
                """,
                records,
            )

            specialty_names = sorted(
                {name for record in records for name in record["specialties"] if name}
            )
            age_group_names = sorted(
                {name for record in records for name in record["age_groups_seen"] if name}
            )
            tag_names = sorted(
                {name for record in records for name in record["tags"] if name}
            )
            hospital_names = sorted(
                {name for record in records for name in record["hospitals"] if name}
            )

            cur.executemany(
                "INSERT INTO specialties (name) VALUES (%s)",
                [(name,) for name in specialty_names],
            )
            cur.executemany(
                "INSERT INTO age_groups (name) VALUES (%s)",
                [(name,) for name in age_group_names],
            )
            cur.executemany(
                "INSERT INTO tags (name) VALUES (%s)", [(name,) for name in tag_names]
            )
            cur.executemany(
                "INSERT INTO hospitals (name) VALUES (%s)",
                [(name,) for name in hospital_names],
            )

            location_rows = [
                (
                    location["source_location_id"],
                    location["name"],
                    location["street1"],
                    location["street2"],
                    location["suite"],
                    location["city"],
                    location["state"],
                    location["zip_code"],
                    location["phone"],
                )
                for record in records
                for location in record["locations"]
            ]
            cur.executemany(
                """
                INSERT INTO locations (
                    source_location_id, name, street1, street2, suite, city, state, zip_code, phone
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (source_location_id) DO NOTHING
                """,
                location_rows,
            )

            doctor_map = dict(
                cur.execute("SELECT source_provider_id, id FROM doctors").fetchall()
            )
            specialty_map = dict(
                cur.execute("SELECT name, id FROM specialties").fetchall()
            )
            age_group_map = dict(cur.execute("SELECT name, id FROM age_groups").fetchall())
            tag_map = dict(cur.execute("SELECT name, id FROM tags").fetchall())
            hospital_map = dict(cur.execute("SELECT name, id FROM hospitals").fetchall())
            location_map = dict(
                cur.execute("SELECT source_location_id, id FROM locations").fetchall()
            )

            doctor_specialty_rows = []
            doctor_age_group_rows = []
            doctor_tag_rows = []
            doctor_hospital_rows = []
            doctor_location_rows = []
            doctor_search_rows = []

            for record in records:
                doctor_id = doctor_map[record["source_provider_id"]]

                for specialty in record["specialties"]:
                    doctor_specialty_rows.append((doctor_id, specialty_map[specialty]))
                for age_group in record["age_groups_seen"]:
                    doctor_age_group_rows.append((doctor_id, age_group_map[age_group]))
                for tag in record["tags"]:
                    doctor_tag_rows.append((doctor_id, tag_map[tag]))
                for hospital in record["hospitals"]:
                    doctor_hospital_rows.append((doctor_id, hospital_map[hospital]))
                for location in record["locations"]:
                    doctor_location_rows.append(
                        (
                            doctor_id,
                            location_map[location["source_location_id"]],
                            location["rank"],
                            location["rank"] == 1,
                        )
                    )
                doctor_search_rows.append(
                    (
                        doctor_id,
                        build_specialty_search_text(record),
                    )
                )

            cur.executemany(
                "INSERT INTO doctor_specialties (doctor_id, specialty_id) VALUES (%s, %s)",
                doctor_specialty_rows,
            )
            cur.executemany(
                "INSERT INTO doctor_age_groups (doctor_id, age_group_id) VALUES (%s, %s)",
                doctor_age_group_rows,
            )
            cur.executemany(
                "INSERT INTO doctor_tags (doctor_id, tag_id) VALUES (%s, %s)",
                doctor_tag_rows,
            )
            cur.executemany(
                "INSERT INTO doctor_hospitals (doctor_id, hospital_id) VALUES (%s, %s)",
                doctor_hospital_rows,
            )
            cur.executemany(
                """
                INSERT INTO doctor_locations (doctor_id, location_id, rank, is_primary)
                VALUES (%s, %s, %s, %s)
                """,
                doctor_location_rows,
            )
            cur.executemany(
                """
                INSERT INTO doctor_search_embeddings (doctor_id, content)
                VALUES (%s, %s)
                """,
                doctor_search_rows,
            )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape UPMC provider data and load it into Postgres."
    )
    parser.add_argument("--start-page", type=int, default=1)
    parser.add_argument("--end-page", type=int, default=None)
    parser.add_argument("--wait-seconds", type=int, default=40)
    parser.add_argument("--retries", type=int, default=4)
    parser.add_argument("--headless", action="store_true")
    parser.add_argument("--output", type=Path, default=DEFAULT_DATA_FILE)
    parser.add_argument(
        "--admin-dsn",
        default=os.getenv(
            "POSTGRES_ADMIN_DSN",
            f"postgresql:///postgres?host=/tmp&port={DEFAULT_DB_PORT}",
        ),
    )
    parser.add_argument("--database", default=DEFAULT_DB_NAME)
    parser.add_argument("--dsn", default=os.getenv("DATABASE_URL"))
    parser.add_argument(
        "--mode",
        choices=("scrape", "load", "scrape-load"),
        default="scrape-load",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    dsn = (
        args.dsn
        or f"postgresql://docseek:docseek@localhost:{DEFAULT_DB_PORT}/{args.database}"
    )

    if args.mode in {"scrape", "scrape-load"}:
        records = scrape_providers(
            start_page=args.start_page,
            end_page=args.end_page,
            wait_seconds=args.wait_seconds,
            retries=args.retries,
            headless=args.headless,
        )
        write_json(records, args.output)
        print(f"Wrote {len(records)} doctors to {args.output}")

    if args.mode in {"load", "scrape-load"}:
        create_database_if_needed(args.admin_dsn, args.database)
        records = read_json(args.output)
        with psycopg.connect(dsn) as conn:
            load_records(conn, records)
        print(f"Loaded {len(records)} doctors into {args.database}")


if __name__ == "__main__":
    main()
