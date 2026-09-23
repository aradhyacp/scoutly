# Project Spec: YC Directory Pipeline

## Overview

A pipeline that scrapes the Y Combinator company directory, enriches each company
using an AI agent, scores it against a fixed set of qualification rules, stores the
result in Postgres, and displays it in a small internal web console.

**Data source:** [ycombinator.com/companies](https://www.ycombinator.com/companies),
via its public Algolia search index — no auth required.

**Scope:** ~100 companies per run.

---

## Architecture

```
Python Scraper
      │
      ▼
   raw.csv
      │
      ▼
trigger.dev  ──►  eve Agent (enrichment)  ──►  Scoring (deterministic)
      │
      ▼
  Supabase (Postgres)
      │
      ▼
Next.js Console  ──►  Vercel
```

---

## 1. Python Scraper

**Input:** YC's Algolia endpoint (`YCCompany_production` index).
**Output:** `raw.csv`, one row per company, capped at ~100 rows.

Filtering happens in two passes:
1. Algolia query parameters restrict results to US/Europe at request time.
2. The script re-checks country/location on the returned records as a second pass,
   dropping anything outside the US/Europe allow-list before writing the CSV.

### Fields collected per company

| Field | Type | Notes |
|---|---|---|
| `company_name` | string | |
| `source_url` | string | YC profile URL, used as the natural unique key downstream |
| `country_or_location` | string | |
| `team_size` | integer | |
| `industry` | string | |
| `description` | string | |

---

## 2. LLM Enrichment

An AI agent, given one raw company record, researches and returns structured
enrichment fields. Enrichment is additive — it never overwrites the raw scrape
fields, only adds to them.

### Fields produced

| Field | Type | Notes |
|---|---|---|
| `normalized_company_name` | string | cleaned/canonical form of `company_name` |
| `is_b2b` | boolean | |
| `is_b2c` | boolean | |
| `funding_rounds` | array | each entry: round type, amount, date (where available) |
| `annual_revenue` | number (USD) | estimated where exact figures aren't public |
| `founded_year` | integer | |

All enrichment output is validated against a fixed schema before it is allowed
downstream — no free-text or unvalidated fields reach storage.

---

## 3. Scoring Rules

Computed per company, after enrichment, against the qualification thresholds below.
Each is stored as its own boolean column so the console can filter on them
independently.

| Rule | Condition |
|---|---|
| `size_qualified` | `team_size <= 500` |
| `founded_year_qualified` | `founded_year >= 2015` |
| `revenue_qualified` | `annual_revenue < 200,000,000` (USD) |
| `region_qualified` | `country_or_location` is in `{USA, Europe}` |

A company's overall qualification is the logical AND of all four, also stored as a
single derived column for convenient filtering.

---

## 4. Database (Supabase / Postgres)

Single table: `companies`.

| Column | Type | Source |
|---|---|---|
| `id` | uuid, PK | generated |
| `company_name` | text | scraper |
| `normalized_company_name` | text | enrichment |
| `source_url` | text, unique | scraper |
| `country_or_location` | text | scraper |
| `team_size` | integer | scraper |
| `industry` | text | scraper |
| `description` | text | scraper |
| `is_b2b` | boolean | enrichment |
| `is_b2c` | boolean | enrichment |
| `funding_rounds` | jsonb | enrichment |
| `annual_revenue` | numeric | enrichment |
| `founded_year` | integer | enrichment |
| `size_qualified` | boolean | scoring |
| `founded_year_qualified` | boolean | scoring |
| `revenue_qualified` | boolean | scoring |
| `region_qualified` | boolean | scoring |
| `overall_qualified` | boolean | scoring |
| `created_at` | timestamptz | generated |
| `updated_at` | timestamptz | generated |

`source_url` is the natural key — records are upserted on it, so re-running the
pipeline updates existing rows rather than duplicating them.

---

## 5. Workflow Orchestration (trigger.dev)

- One task, `processCompany`, takes a single raw company record as its payload:
  runs enrichment → scoring → upsert, for that one company.
- The pipeline entrypoint reads `raw.csv` and triggers `processCompany` once per
  row via a single batch call, so all ~100 companies are queued together and
  processed with bounded concurrency.
- Each company's processing is independently retried on failure; one bad row does
  not block the rest of the batch.
- Re-running the pipeline is idempotent per company (keyed on `source_url`).

---

## 6. Internal Console (Next.js)

Two pages:

1. **Companies** — table of all companies and their full field set (raw, enriched,
   and scored). Includes a search box (by name) and filters (by qualification
   status, region, industry, B2B/B2C).
2. **Industries** — pie chart of company count by `industry`.

Data is read directly from Supabase.

---

## 7. Deployment

- Web console deployed to Vercel.
- Environment variables required: Supabase connection details, LLM provider API
  key, trigger.dev API key (exact names documented in `.env.example`).

---

## Submission Checklist

- [ ] GitHub repository
- [ ] Deployed application URL
- [ ] Database schema (matches Section 4)
- [ ] README: how to run the pipeline locally, environment variables, how each
      stage of the pipeline works