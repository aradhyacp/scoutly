import { task, queue, logger } from "@trigger.dev/sdk";
import { runTurn, type AgentConfig } from "./agent-client";

/**
 * One trigger.dev run = one company = one session on the deployed eve agent.
 *
 * The division of labour: eve owns researching and qualifying a single company,
 * trigger.dev owns the other ninety-nine — queueing, concurrency, per-company
 * retries, and a run log you can read afterwards.
 */

export type ScrapedCompany = {
  company_name: string;
  source_url: string;
  country_or_location: string;
  batch: string;
  founded_year: number;
  team_size: number;
  industry: string;
  description: string;
  location_flagged: boolean;
};

export type EnrichmentResult = {
  stored: boolean;
  status: "inserted" | "updated" | "rejected";
  company_name: string;
  source_url: string;
  reason: string;
};

/** What the agent must return, as JSON Schema for the turn's outputSchema. */
const RESULT_SCHEMA = {
  type: "object",
  properties: {
    stored: { type: "boolean" },
    status: { type: "string", enum: ["inserted", "updated", "rejected"] },
    company_name: { type: "string" },
    source_url: { type: "string" },
    reason: { type: "string" },
  },
  required: ["stored", "status", "company_name", "source_url", "reason"],
  additionalProperties: false,
} as const;

/**
 * Concurrency lives here, not in eve. Raising it is bounded by the model
 * provider's rate limits and by Supabase connections, since every concurrent
 * run holds one through the agent.
 */
export const enrichmentQueue = queue({
  name: "enrichment",
  concurrencyLimit: Number(process.env.ENRICHMENT_CONCURRENCY ?? 3),
});

export const processCompany = task({
  id: "process-company",
  queue: enrichmentQueue,
  maxDuration: 900,
  retry: { maxAttempts: 3, minTimeoutInMs: 10_000, factor: 2 },

  run: async (company: ScrapedCompany) => {
    const config: AgentConfig = {
      baseUrl: requireEnv("EVE_AGENT_URL").replace(/\/$/, ""),
      username: requireEnv("ROUTE_AUTH_BASIC_USERNAME"),
      password: requireEnv("ROUTE_AUTH_BASIC_PASSWORD"),
    };

    logger.info("Enriching", { company: company.company_name, url: company.source_url });

    const { sessionId, data } = await runTurn<EnrichmentResult>(
      config,
      [
        "Process this scraped company.",
        "Research it with web_fetch, then call enrich exactly once with what you found.",
        "Carry the scraped fields through unchanged.",
        "",
        JSON.stringify(company),
      ].join("\n"),
      RESULT_SCHEMA,
    );

    // A rejection is a correct outcome, not a failure: the company did not
    // qualify and nothing was written. Returning it normally keeps the run
    // green and leaves the reason in the run log.
    logger.info(data.stored ? "Stored" : "Rejected", { reason: data.reason, sessionId });

    return data;
  },
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}
