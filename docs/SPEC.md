# Project Spec: YC Directory Pipeline

## Overview

A pipeline that scrapes the Y Combinator company directory, enriches each company
with an AI agent built on **eve** (Vercel's agent framework), stores only
qualified companies in Postgres, and displays them in a small internal web
console. The same agent can also be talked to in natural language to query the
database.

**Data source:** [ycombinator.com/companies](https://www.ycombinator.com/companies),
via its public Algolia search index — no auth required.

**Scope:** ~100 companies per run.

**Principle:** the database is the gold standard. Only clean, fully-enriched,
qualified rows are written. A company that fails a qualification rule is dropped,
not stored with a `false` flag.

---

## Architecture

```
Python Scraper
      │
      ▼
  raw.jsonl
      │
      ▼
Runner script (one row at a time)
      │
      ▼
eve Agent ── web_search ──► enrich ──► validated record
      │
      ▼
Upsert script ──► Supabase (Postgres)
      │
      ▼
Next.js Console ──► Vercel
```

Natural-language path (same agent, different entrypoint):

```
User ──► eve Agent ──► customQueryGenerator ──► queryValidator ──► customQueryExecutor ──► Supabase
```

---

## 1. Python Scraper

**Input:** YC's Algolia endpoint (`YCCompany_production` index).
**Output:** `raw.jsonl`, one JSON object per company, one per line, capped at
~100 records. JSON Lines rather than CSV: it preserves types (`team_size` as an
integer, `location_flagged` as a boolean), survives the long free-text
descriptions without quoting issues, and streams a record at a time to the agent.

Filtering happens in two passes:
1. Algolia query parameters restrict results to US/Europe at request time.
2. The script re-checks country/location on the returned records as a second pass,
   dropping anything outside the US/Europe allow-list before writing the file. If
   it is not sure, it keeps the row and marks it in the `location_flagged` column.

Conditions to go into the record:
1. Should be from US/EU.
2. Should have `team_size` <= 500.
3. Founded year should be >= 2015 (assumption is YC batch year) —
   e.g. `"batch": Summer 2012` is rejected.

### Fields collected per company

| Field | Type | Notes |
|---|---|---|
| `company_name` | string | |
| `source_url` | string | YC profile URL, used as the natural unique key downstream |
| `country_or_location` | string | |
| `batch` | string | raw YC batch, e.g. `Summer 2017` |
| `founded_year` | integer | year parsed out of `batch` |
| `team_size` | integer | |
| `industry` | string | |
| `description` | string | |
| `location_flagged` | boolean | not persisted to the DB; review signal only |

---

## 2. The eve Agent

The enrichment and query layer is an agent built with **eve**, Vercel's framework
for durable backend AI agents (`agent/` directory, compiled and run by the eve
CLI). A plain script could have done the scrape-to-DB write, but the agent is what
makes the research step possible: it decides what to look up, searches the web,
and returns a validated record.

### Tools

| Tool | Kind | Purpose |
|---|---|---|
| `web_search` | eve built-in | Research a company on the open web to find `is_b2b`, `is_b2c`, `funding_rounds`, `annual_revenue`, `founded_year` |
| `enrich` | authored | Normalize the researched values into the standard schema (types, units, USD amounts, canonical round names) |
| `customQueryGenerator` | authored | Turn a natural-language question into a SQL query against the `companies` table |
| `queryValidator` | authored | Reject unsafe or destructive SQL — no `DELETE`, `DROP`, `ALTER`, `UPDATE`, `TRUNCATE`, no multi-statement input; read-only queries only |
| `customQueryExecutor` | authored | Execute the validated query against Supabase and return the rows |

The query tools (`customQueryGenerator` → `queryValidator` → `customQueryExecutor`)
run **only** on the natural-language path, when a person is talking to the agent —
e.g. *"hey, pull info about this company xyz"*. They are never used by the
ingestion pipeline.

---

## 3. Enrichment

The runner script reads `raw.jsonl` and hands the agent **one record at a time**. For
each row the agent researches the company with `web_search`, then passes the
findings through `enrich` to produce a normalized record.

### Fields produced

| Field | Type | Notes |
|---|---|---|
| `is_b2b` | boolean | |
| `is_b2c` | boolean | |
| `funding_rounds` | array | each entry: round type, amount, date (where available) |
| `annual_revenue` | number (USD) | estimated where exact figures aren't public |
| `founded_year` | integer | confirms or corrects the batch-derived year from the scrape |

All enrichment output is validated against a fixed schema before it is allowed
downstream — no free-text or unvalidated fields reach storage.

Writing to the database is done by a **plain script, not the agent** — no tool
call is involved. By the time enrichment returns, the record is already in its
final, complete shape, so the script upserts it directly.

---

## 4. Qualification (a gate, not a column)

Qualification is enforced as the data moves through the pipeline. Nothing about it
is stored: a company either qualifies and is written, or it does not and is
dropped. The DB therefore contains qualified companies only.

| Rule | Condition | Enforced at |
|---|---|---|
| Region | `country_or_location` is in `{USA, Europe}` | scrape time and again in `web_search` even if its flagged in `raw.jsonl` or not flagged |
| Team size | `team_size <= 500` | scrape time |
| Founded year | `founded_year >= 2015` | scrape time (YC batch year) |
| Revenue | `annual_revenue < 200,000,000` (USD) | enrichment time — the value only exists after `web_search` |

The first three are already applied by the scraper ( exception in Region ), so a record in `raw.jsonl` has
passed them. The revenue rule is the only one checked after enrichment; a company
over the threshold is discarded and never upserted.

---

## 5. Database (Supabase / Postgres)

Single table: `companies`.

| Column | Type | Source |
|---|---|---|
| `id` | uuid, PK | generated |
| `company_name` | text | scraper |
| `source_url` | text, unique | scraper |
| `country_or_location` | text | scraper |
| `team_size` | integer | scraper |
| `industry` | text | scraper |
| `description` | text | scraper |
| `is_b2b` | boolean | enrichment |
| `is_b2c` | boolean | enrichment |
| `funding_rounds` | array | enrichment |
| `annual_revenue` | numeric | enrichment |
| `founded_year` | integer | scraper (from `batch`), confirmed by enrichment |
| `created_at` | timestamptz | generated |
| `updated_at` | timestamptz | generated |

`source_url` is the natural key — records are upserted on it, so re-running the
pipeline updates existing rows rather than duplicating them.

---

## 6. Pipeline Run

- `raw.jsonl` is read line by line; each record is one agent run (research → enrich).
- A record that fails validation or the revenue gate is logged and skipped; it does
  not stop the rest of the run.
- Each surviving record is upserted on `source_url`, so re-running the pipeline is
  idempotent per company.

---

## 7. Internal Console (Next.js)

Two pages:

1. **Companies** — table of all companies and their full field set (raw and
   enriched). Includes a search box (by name) and filters (by region, industry,
   B2B/B2C). Every row in the table is already qualified.
2. **Industries** — pie chart of company count by `industry`.

Data is read directly from Supabase.

---

## 8. Deployment

- Web app ( Next.js ) is only deployed to Vercel.
- Environment variables required: Supabase connection details, LLM provider API
  key (exact names documented in `.env.example`).
- Trigger.dev runs the ai pipeline 
- AI agent will be accessable via the Local Machine only

---

## Submission Checklist

- [ ] GitHub repository
- [ ] Deployed application URL
- [ ] Database schema (matches Section 5)
- [ ] README: how to run the pipeline locally, environment variables, how each
      stage of the pipeline works
