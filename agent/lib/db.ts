/**
 * Database access for the agent's tools, on top of the shared pool in
 * `database/db.ts`.
 *
 * Two entry points, deliberately separated: `upsertCompany` is the only write
 * path in the whole agent, and `runReadOnlyQuery` is the only read path. The
 * read path runs inside a read-only transaction, so even a query that slipped
 * past the validator cannot modify anything.
 */

import pool from "../../database/db";
import { TABLE_NAME } from "./schema";

export type FundingRound = {
  round: string;
  amount_usd: number | null;
  date: string | null;
};

export type CompanyRecord = {
  company_name: string;
  source_url: string;
  country_or_location: string;
  team_size: number;
  industry: string;
  description: string;
  batch: string;
  is_b2b: boolean;
  is_b2c: boolean;
  funding_rounds: FundingRound[];
  annual_revenue: number;
  is_annual_revenue_estimate: boolean;
  founded_year: number;
};

/**
 * `funding_rounds` is `text[]`, so each round goes in as its own JSON string.
 * That keeps the round/amount/date structure intact and parseable by whatever
 * reads the table, which a flattened display string would not.
 */
function encodeFundingRounds(rounds: FundingRound[]): string[] {
  return rounds.map((round) => JSON.stringify(round));
}

/** Read `funding_rounds` back out of the text[] column. */
export function decodeFundingRounds(values: string[] | null): FundingRound[] {
  return (values ?? []).flatMap((value) => {
    try {
      return [JSON.parse(value) as FundingRound];
    } catch {
      return [];
    }
  });
}

/**
 * Write one qualified company. `source_url` is the natural key, so re-running the
 * pipeline updates the existing row instead of duplicating it.
 */
export async function upsertCompany(record: CompanyRecord): Promise<{ inserted: boolean }> {
  const fundingRounds = encodeFundingRounds(record.funding_rounds);

  const result = await pool.query<{ inserted: boolean }>(
    `INSERT INTO ${TABLE_NAME} (
       company_name, source_url, country_or_location, team_size, industry,
       description, batch, is_b2b, is_b2c, funding_rounds, annual_revenue,
       is_annual_revenue_estimate, founded_year
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (source_url) DO UPDATE SET
       company_name = EXCLUDED.company_name,
       country_or_location = EXCLUDED.country_or_location,
       team_size = EXCLUDED.team_size,
       industry = EXCLUDED.industry,
       description = EXCLUDED.description,
       batch = EXCLUDED.batch,
       is_b2b = EXCLUDED.is_b2b,
       is_b2c = EXCLUDED.is_b2c,
       funding_rounds = EXCLUDED.funding_rounds,
       annual_revenue = EXCLUDED.annual_revenue,
       is_annual_revenue_estimate = EXCLUDED.is_annual_revenue_estimate,
       founded_year = EXCLUDED.founded_year,
       updated_at = now()
     RETURNING (xmax = 0) AS inserted`,
    [
      record.company_name,
      record.source_url,
      record.country_or_location,
      record.team_size,
      record.industry,
      record.description,
      record.batch,
      record.is_b2b,
      record.is_b2c,
      fundingRounds,
      record.annual_revenue,
      record.is_annual_revenue_estimate,
      record.founded_year,
    ],
  );

  return { inserted: result.rows[0]?.inserted ?? false };
}

/**
 * Run a validated SELECT. The read-only transaction is the backstop: the
 * validator is the first line of defence, this is the one that cannot be talked
 * around. The statement timeout keeps a runaway scan from holding a connection.
 */
export async function runReadOnlyQuery(
  sql: string,
  params: unknown[] = [],
): Promise<{ rows: Record<string, unknown>[]; rowCount: number }> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = 10000");

    const result = await client.query(sql, params);

    await client.query("COMMIT");
    return { rows: result.rows, rowCount: result.rowCount ?? result.rows.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}
