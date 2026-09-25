/**
 * Qualification rules. A company either passes every one of these and is written
 * to the database, or it is rejected and nothing is stored. There is no partial
 * or flagged state in the database.
 */

export const MAX_ANNUAL_REVENUE_USD = 200_000_000;
export const MAX_TEAM_SIZE = 500;
export const MIN_FOUNDED_YEAR = 2015;

/**
 * Country names accepted as US/Europe, matched case-insensitively against the
 * last comma-separated part of a location entry ("San Francisco, CA, USA").
 */
const ALLOWED_COUNTRIES = new Set([
  "usa", "united states", "united states of america", "us", "u.s.", "u.s.a.", "america",
  "albania", "andorra", "austria", "belarus", "belgium", "bosnia and herzegovina",
  "bulgaria", "croatia", "cyprus", "czechia", "czech republic", "denmark",
  "estonia", "finland", "france", "germany", "greece", "hungary", "iceland",
  "ireland", "italy", "kosovo", "latvia", "liechtenstein", "lithuania",
  "luxembourg", "malta", "moldova", "monaco", "montenegro", "netherlands",
  "the netherlands", "north macedonia", "norway", "poland", "portugal", "romania",
  "san marino", "serbia", "slovakia", "slovenia", "spain", "sweden", "switzerland",
  "ukraine", "united kingdom", "uk", "great britain", "england", "scotland",
  "wales", "northern ireland",
]);

/** Entries that say nothing about a country either way. */
const NEUTRAL_ENTRIES = new Set(["remote", "fully remote", "partly remote", "unspecified", ""]);

export type RegionCheck = {
  qualified: boolean;
  reason: string;
};

/**
 * Re-check the region at enrichment time. The scraper already filtered on YC's
 * own region tags, but those can be stale or wrong, and rows can arrive flagged
 * as unverified, so the agent confirms it against what research turned up.
 */
export function checkRegion(location: string): RegionCheck {
  const entries = location
    .split(";")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  let recognised = false;

  for (const entry of entries) {
    if (NEUTRAL_ENTRIES.has(entry.toLowerCase())) continue;

    const parts = entry.split(",");
    const country = parts[parts.length - 1]!.trim().toLowerCase().replace(/\.$/, "");

    if (ALLOWED_COUNTRIES.has(country)) {
      return { qualified: true, reason: `headquartered in ${country}` };
    }
    recognised = true;
  }

  if (!recognised) {
    return {
      qualified: false,
      reason: `no country could be determined from "${location}" — research the company's headquarters and call enrich again with a resolved location`,
    };
  }

  return { qualified: false, reason: `"${location}" is outside the US/Europe allow-list` };
}

export function checkRevenue(annualRevenue: number): RegionCheck {
  if (annualRevenue >= MAX_ANNUAL_REVENUE_USD) {
    return {
      qualified: false,
      reason: `estimated annual revenue $${annualRevenue.toLocaleString("en-US")} is at or above the $${MAX_ANNUAL_REVENUE_USD.toLocaleString("en-US")} cap`,
    };
  }
  return { qualified: true, reason: "under the revenue cap" };
}
