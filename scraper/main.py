"""Scrape the YC company directory into raw.jsonl.

Pulls companies from YC's public Algolia index, applies the qualification rules
that can be checked at scrape time (region, team size, founded year), and writes
one JSON object per surviving company, one per line.
"""

import json
import re
from pathlib import Path

import requests

DIRECTORY_URL = "https://www.ycombinator.com/companies"
INDEX = "YCCompany_production"

TARGET_RECORDS = 100
HITS_PER_PAGE = 100
MAX_PAGES = 20

MAX_TEAM_SIZE = 500
MIN_FOUNDED_YEAR = 2015

OUTPUT_PATH = Path(__file__).parent / "raw.jsonl"

# Second-pass allow-list, matched against the country at the end of each entry in
# `all_locations`. Algolia's region filter is the first pass; this catches records
# tagged US/Europe that actually sit somewhere else.
ALLOWED_COUNTRIES = {
    "usa", "united states", "united states of america", "us", "u.s.", "u.s.a.",
    "albania", "andorra", "austria", "belarus", "belgium", "bosnia and herzegovina",
    "bulgaria", "croatia", "cyprus", "czechia", "czech republic", "denmark",
    "estonia", "finland", "france", "germany", "greece", "hungary", "iceland",
    "ireland", "italy", "kosovo", "latvia", "liechtenstein", "lithuania",
    "luxembourg", "malta", "moldova", "monaco", "montenegro", "netherlands",
    "north macedonia", "norway", "poland", "portugal", "romania", "san marino",
    "serbia", "slovakia", "slovenia", "spain", "sweden", "switzerland", "ukraine",
    "united kingdom", "uk", "england", "scotland", "wales", "northern ireland",
}

# Entries that say nothing about a country either way.
NEUTRAL_LOCATIONS = {"remote", "fully remote", "partly remote", "unspecified", ""}


def get_algolia_credentials():
    """Lift the public Algolia app id and search key out of the directory page."""
    html = requests.get(DIRECTORY_URL, timeout=30).text
    match = re.search(r"window\.AlgoliaOpts\s*=\s*(\{.*?\});", html, re.DOTALL)
    if not match:
        raise RuntimeError("Could not find Algolia configuration")
    config = json.loads(match.group(1))
    return config["app"], config["key"]


def fetch_page(app_id, api_key, page):
    url = f"https://{app_id.lower()}-dsn.algolia.net/1/indexes/{INDEX}/query"
    headers = {
        "X-Algolia-Application-Id": app_id,
        "X-Algolia-API-Key": api_key,
        "Content-Type": "application/json",
    }
    params = (
        f"query=&hitsPerPage={HITS_PER_PAGE}&page={page}"
        '&filters=(regions:"United States of America" OR regions:"Europe")'
    )
    response = requests.post(url, headers=headers, json={"params": params}, timeout=30)
    response.raise_for_status()
    return response.json()


def founded_year(hit):
    """YC batch year stands in for the founding year, e.g. 'Summer 2013' -> 2013."""
    match = re.search(r"(19|20)\d{2}", hit.get("batch") or "")
    return int(match.group(0)) if match else None


def check_location(hit):
    """Return (keep, flagged) for the second-pass location check.

    Each entry in `all_locations` looks like 'San Francisco, CA, USA'; the country
    is the last comma-separated part. A record is kept when at least one entry is
    in the allow-list, and flagged when no entry is recognisable either way.
    """
    raw = (hit.get("all_locations") or "").strip()
    entries = [entry.strip() for entry in raw.split(";") if entry.strip()]

    recognised = False
    for entry in entries:
        if entry.lower() in NEUTRAL_LOCATIONS:
            continue
        country = entry.split(",")[-1].strip().lower().rstrip(".")
        if country in ALLOWED_COUNTRIES:
            return True, False
        recognised = True

    # Nothing recognisable: trust Algolia's region filter but mark it for review.
    if not recognised:
        return True, True

    # Every entry named a country and none of them qualified.
    return False, False


def to_record(hit):
    """Return a record for a qualifying hit, or None if it fails a scrape-time rule."""
    team_size = hit.get("team_size")
    if not isinstance(team_size, int) or team_size <= 0 or team_size > MAX_TEAM_SIZE:
        return None

    year = founded_year(hit)
    if year is None or year < MIN_FOUNDED_YEAR:
        return None

    keep, flagged = check_location(hit)
    if not keep:
        return None

    slug = hit.get("slug")
    if not slug:
        return None

    return {
        "company_name": hit.get("name") or "",
        "source_url": f"{DIRECTORY_URL}/{slug}",
        "country_or_location": hit.get("all_locations") or "",
        "batch": hit.get("batch") or "",
        "founded_year": year,
        "team_size": team_size,
        "industry": hit.get("industry") or "",
        "description": hit.get("long_description") or hit.get("one_liner") or "",
        "location_flagged": flagged,
    }


def scrape():
    app_id, api_key = get_algolia_credentials()

    records = []
    seen_urls = set()

    for page in range(MAX_PAGES):
        data = fetch_page(app_id, api_key, page)
        hits = data.get("hits", [])
        if not hits:
            break

        for hit in hits:
            record = to_record(hit)
            if record is None or record["source_url"] in seen_urls:
                continue
            seen_urls.add(record["source_url"])
            records.append(record)
            if len(records) >= TARGET_RECORDS:
                return records

        if page + 1 >= data.get("nbPages", 0):
            break

    return records


def main():
    records = scrape()

    with OUTPUT_PATH.open("w", encoding="utf-8") as f:
        for record in records:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    flagged = sum(1 for record in records if record["location_flagged"])
    print(f"Wrote {len(records)} companies to {OUTPUT_PATH} ({flagged} location-flagged)")


if __name__ == "__main__":
    main()
