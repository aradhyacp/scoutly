import "server-only";

import { getPool } from "./db";
import type { Company, FundingRound, IndustryCount, Region } from "@/lib/types";

/**
 * Read-side queries and the row -> API mapping.
 *
 * The table stores what the enrichment agent wrote, which is close to but not
 * quite presentation-ready: `annual_revenue` is a Postgres numeric and arrives
 * as a string, `funding_rounds` is a text[] of JSON strings, and some scraped
 * descriptions carry literal "\r\n" escape text instead of line breaks. All of
 * that is normalised here, once, so the client only ever sees clean values.
 */

type CompanyRow = {
  id: string;
  company_name: string;
  source_url: string;
  country_or_location: string | null;
  team_size: number | null;
  industry: string | null;
  description: string | null;
  batch: string | null;
  founded_year: number | null;
  is_b2b: boolean | null;
  is_b2c: boolean | null;
  funding_rounds: string[] | null;
  annual_revenue: string | null;
  is_annual_revenue_estimate: boolean | null;
  updated_at: Date;
};

const COLUMNS = `
  id, company_name, source_url, country_or_location, team_size, industry,
  description, batch, founded_year, is_b2b, is_b2c, funding_rounds,
  annual_revenue, is_annual_revenue_estimate, updated_at
`;

const US_NAMES = new Set(["usa", "us", "u.s.", "u.s.a.", "united states", "united states of america"]);

const EUROPE_NAMES = new Set([
  "albania", "andorra", "austria", "belarus", "belgium", "bosnia and herzegovina",
  "bulgaria", "croatia", "cyprus", "czechia", "czech republic", "denmark", "estonia",
  "finland", "france", "germany", "greece", "hungary", "iceland", "ireland", "italy",
  "kosovo", "latvia", "liechtenstein", "lithuania", "luxembourg", "malta", "moldova",
  "monaco", "montenegro", "netherlands", "the netherlands", "north macedonia", "norway",
  "poland", "portugal", "romania", "san marino", "serbia", "slovakia", "slovenia", "spain",
  "sweden", "switzerland", "ukraine", "united kingdom", "uk", "great britain", "england",
  "scotland", "wales", "northern ireland",
]);

const NON_PLACES = new Set(["remote", "fully remote", "partly remote", "unspecified"]);

function splitLocations(raw: string | null): string[] {
  return (raw ?? "")
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** The country is the last comma-separated part of an entry: "Berlin, Germany". */
function resolvePlace(locations: string[]): { primary: string; country: string | null; region: Region } {
  const places = locations.filter((entry) => !NON_PLACES.has(entry.toLowerCase()));
  const primary = places[0] ?? locations[0] ?? "Unknown";

  for (const place of places) {
    const parts = place.split(",");
    const country = parts[parts.length - 1]!.trim();
    const key = country.toLowerCase().replace(/\.$/, "");
    if (US_NAMES.has(key)) return { primary, country: "United States", region: "United States" };
    if (EUROPE_NAMES.has(key)) return { primary, country, region: "Europe" };
  }

  return { primary, country: null, region: "Unknown" };
}

/** Turn literal escape text into real line breaks and tidy the whitespace. */
function cleanDescription(raw: string | null): string {
  return (raw ?? "")
    .replace(/\\r\\n|\\n|\\r/g, "\n")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * The agent often folds investors into the round name:
 * "Series B (led by Tamarack Global; with Sunbelt Rentals, ...)". Split that
 * into a short label for the row and a note for the detail view.
 */
function splitRoundName(round: string): { label: string; note: string | null } {
  const match = round.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (!match || !match[1]!.trim()) return { label: round.trim(), note: null };
  return { label: match[1]!.trim(), note: match[2]!.trim() || null };
}

function parseRounds(raw: string[] | null): FundingRound[] {
  return (raw ?? []).flatMap((value) => {
    try {
      const round = JSON.parse(value) as { round?: string; amount_usd?: number | null; date?: string | null };
      if (!round.round) return [];
      return [
        {
          round: round.round,
          ...splitRoundName(round.round),
          amountUsd: typeof round.amount_usd === "number" ? round.amount_usd : null,
          date: round.date ?? null,
        },
      ];
    } catch {
      // One malformed element should cost that round, not the whole company.
      return [];
    }
  });
}

function toCompany(row: CompanyRow): Company {
  const locations = splitLocations(row.country_or_location);
  const place = resolvePlace(locations);
  const fundingRounds = parseRounds(row.funding_rounds);
  const disclosed = fundingRounds.filter((round) => round.amountUsd !== null);

  return {
    id: row.id,
    name: row.company_name,
    sourceUrl: row.source_url,
    locations,
    primaryLocation: place.primary,
    country: place.country,
    region: place.region,
    teamSize: row.team_size ?? 0,
    industry: row.industry || "Unspecified",
    description: cleanDescription(row.description),
    batch: row.batch ?? "",
    foundedYear: row.founded_year ?? 0,
    isB2b: row.is_b2b ?? false,
    isB2c: row.is_b2c ?? false,
    fundingRounds,
    totalRaisedUsd: disclosed.length
      ? disclosed.reduce((sum, round) => sum + (round.amountUsd ?? 0), 0)
      : null,
    annualRevenueUsd: Number(row.annual_revenue ?? 0),
    revenueIsEstimate: row.is_annual_revenue_estimate ?? false,
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listCompanies(options: { industry?: string } = {}): Promise<Company[]> {
  const pool = getPool();

  const result = options.industry
    ? await pool.query<CompanyRow>(
        `SELECT ${COLUMNS} FROM companies WHERE industry = $1 ORDER BY annual_revenue DESC NULLS LAST, company_name`,
        [options.industry],
      )
    : await pool.query<CompanyRow>(
        `SELECT ${COLUMNS} FROM companies ORDER BY annual_revenue DESC NULLS LAST, company_name`,
      );

  return result.rows.map(toCompany);
}

export async function countByIndustry(): Promise<IndustryCount[]> {
  const result = await getPool().query<{ industry: string | null; count: number }>(
    `SELECT COALESCE(NULLIF(industry, ''), 'Unspecified') AS industry, count(*)::int AS count
     FROM companies GROUP BY 1 ORDER BY 2 DESC, 1`,
  );
  return result.rows.map((row) => ({ industry: row.industry ?? "Unspecified", count: row.count }));
}
