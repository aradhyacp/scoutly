/**
 * The `companies` table, mirrored from `database/SCHEMA.md`.
 *
 * This is the only shape the query tools are allowed to work with: the generator
 * builds SQL from these columns, the validator rejects anything that reaches for
 * a table or column not listed here, and the instructions show the model the same
 * list so it knows what it can ask for.
 */

export const TABLE_NAME = "companies";

export const COLUMNS = {
  id: "uuid",
  company_name: "text",
  source_url: "text",
  country_or_location: "text",
  team_size: "integer",
  industry: "text",
  description: "text",
  batch: "text",
  is_b2b: "boolean",
  is_b2c: "boolean",
  funding_rounds: "text[]",
  annual_revenue: "numeric",
  is_annual_revenue_estimate: "boolean",
  founded_year: "integer",
  created_at: "timestamptz",
  updated_at: "timestamptz",
} as const;

export type ColumnName = keyof typeof COLUMNS;

export const COLUMN_NAMES = Object.keys(COLUMNS) as ColumnName[];

export function isColumn(name: string): name is ColumnName {
  return Object.hasOwn(COLUMNS, name);
}

/** Columns written by the scraper stage, carried through enrichment unchanged. */
export const SCRAPED_COLUMNS = [
  "company_name",
  "source_url",
  "country_or_location",
  "team_size",
  "industry",
  "description",
  "batch",
] as const;

/** Columns the agent produces by researching the company. */
export const ENRICHED_COLUMNS = [
  "is_b2b",
  "is_b2c",
  "funding_rounds",
  "annual_revenue",
  "is_annual_revenue_estimate",
  "founded_year",
] as const;
