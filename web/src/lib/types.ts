/**
 * The shapes the API returns. Shared by the Route Handlers that produce them
 * and the client components that render them, so neither side can drift.
 */

export type Region = "United States" | "Europe" | "Unknown";

export type FundingRound = {
  /** The round's name as the agent recorded it. */
  round: string;
  /** Just the round type, e.g. "Series B" out of "Series B (led by Tamarack Global; ...)". */
  label: string;
  /** The parenthetical detail — usually who led or joined — if there was one. */
  note: string | null;
  amountUsd: number | null;
  date: string | null;
};

export type Company = {
  id: string;
  name: string;
  sourceUrl: string;
  /** Every location the company lists, e.g. ["San Francisco, CA, USA", "Remote"]. */
  locations: string[];
  /** The first location that names a place, used wherever only one fits. */
  primaryLocation: string;
  country: string | null;
  region: Region;
  teamSize: number;
  industry: string;
  description: string;
  batch: string;
  foundedYear: number;
  isB2b: boolean;
  isB2c: boolean;
  fundingRounds: FundingRound[];
  /** Sum of every round with a disclosed amount. Null when none were disclosed. */
  totalRaisedUsd: number | null;
  annualRevenueUsd: number;
  /** True when the agent estimated revenue because no figure was published. */
  revenueIsEstimate: boolean;
  updatedAt: string;
};

export type CompaniesResponse = {
  companies: Company[];
};

export type IndustryCount = {
  industry: string;
  count: number;
};

export type IndustriesResponse = {
  total: number;
  industries: IndustryCount[];
};

export type ApiError = {
  error: string;
};
