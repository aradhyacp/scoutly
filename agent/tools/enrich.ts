import { defineTool } from "eve/tools";
import { z } from "zod";
import { upsertCompany, type CompanyRecord } from "../lib/db";
import {
  MAX_ANNUAL_REVENUE_USD,
  MAX_TEAM_SIZE,
  MIN_FOUNDED_YEAR,
  checkRegion,
  checkRevenue,
} from "../lib/rules";

const fundingRoundSchema = z.object({
  round: z
    .string()
    .min(1)
    .describe('Round type, e.g. "Seed", "Series A", "Series B", "Pre-seed", "Grant".'),
  amount_usd: z
    .number()
    .nonnegative()
    .nullable()
    .describe("Amount raised in USD. Null when the amount was not disclosed."),
  date: z
    .string()
    .nullable()
    .describe('Announcement date as YYYY-MM or YYYY-MM-DD. Null when unknown.'),
});

const inputSchema = z.object({
  // Carried straight through from the scraped record.
  company_name: z.string().min(1).describe("Company name, exactly as scraped."),
  source_url: z
    .string()
    .url()
    .describe("The YC profile URL from the scraped record. This is the natural key — never invent or alter it."),
  country_or_location: z
    .string()
    .min(1)
    .describe(
      "Headquarters location. Use the scraped value when it names a country. If the scraped value is only 'Remote' or otherwise has no country in it, research the real headquarters first and pass the resolved location here, e.g. 'Berlin, Germany'.",
    ),
  team_size: z.number().int().positive().describe("Team size from the scraped record."),
  industry: z.string().describe("Industry from the scraped record."),
  description: z.string().describe("Description from the scraped record."),
  batch: z
    .string()
    .describe(
      'YC batch from the scraped record, e.g. "Summer 2017". Copy it straight through — it is already in the record and there is nothing to research here.',
    ),

  // Produced by research.
  is_b2b: z.boolean().describe("True if the company sells to businesses. A company can be both B2B and B2C."),
  is_b2c: z.boolean().describe("True if the company sells directly to consumers."),
  funding_rounds: z
    .array(fundingRoundSchema)
    .describe("Every disclosed funding round found, oldest first. Pass an empty array if the company has no publicly disclosed funding."),
  annual_revenue: z
    .number()
    .nonnegative()
    .describe(
      `Annual revenue in USD, as a plain number (12.5 million is 12500000). Always required — if research turns up no reported figure, estimate one from headcount, stage, and last round rather than leaving it out, and set is_annual_revenue_estimate to true. Companies at or above $${MAX_ANNUAL_REVENUE_USD.toLocaleString("en-US")} are rejected.`,
    ),
  is_annual_revenue_estimate: z
    .boolean()
    .describe(
      "False only when annual_revenue is a figure actually reported by a credible source. True whenever you made the number up from headcount, stage, funding, or comparable companies. Be honest here — it is the flag that tells everyone downstream how much to trust the figure.",
    ),
  founded_year: z
    .number()
    .int()
    .describe(
      `The year the company was founded, confirmed by research. The scraped record carries a year derived from the YC batch, which is often later than the real founding year — correct it here. Must be ${MIN_FOUNDED_YEAR} or later.`,
    ),
  revenue_basis: z
    .string()
    .min(1)
    .describe("One sentence on where the revenue figure came from: name the source if it was reported, or the reasoning if you estimated it."),
});

const outputSchema = z.object({
  stored: z.boolean(),
  status: z.enum(["inserted", "updated", "rejected"]),
  company_name: z.string(),
  source_url: z.string(),
  reason: z.string(),
});

export default defineTool({
  description: [
    "Validate a researched company against the qualification rules and, if it passes, write it to the database.",
    "",
    "This is the only way anything reaches the database. Call it once per company, after researching that company with web_fetch — never before, and never with placeholder or guessed values for the research fields.",
    "",
    "The tool enforces the rules itself and rejects the company if any fails:",
    `- headquarters must be in the US or Europe (checked against the country in country_or_location)`,
    `- annual_revenue must be under $${MAX_ANNUAL_REVENUE_USD.toLocaleString("en-US")} USD`,
    `- team_size must be ${MAX_TEAM_SIZE} or fewer`,
    `- founded_year must be ${MIN_FOUNDED_YEAR} or later`,
    "",
    "Revenue is never optional. When no figure is published, estimate one and set is_annual_revenue_estimate to true — an honest estimate is the expected outcome for most early-stage companies. Never pass 0 to mean \"unknown\".",
    "",
    "A rejected company is not stored and that is the correct outcome — report it and move on. Do not retry a rejection by adjusting the numbers; only call again if the reason says the location could not be resolved and you have since found the real headquarters.",
  ].join("\n"),
  inputSchema,
  outputSchema,
  label: {
    start: ({ company_name }) => `Enrich ${company_name}`,
    complete: (_input, output) =>
      output.stored ? `Stored ${output.company_name}` : `Rejected ${output.company_name}: ${output.reason}`,
  },
  async execute(input) {
    const rejected = (reason: string) => ({
      stored: false,
      status: "rejected" as const,
      company_name: input.company_name,
      source_url: input.source_url,
      reason,
    });

    const region = checkRegion(input.country_or_location);
    if (!region.qualified) {
      return rejected(`region: ${region.reason}`);
    }

    const revenue = checkRevenue(input.annual_revenue);
    if (!revenue.qualified) {
      return rejected(`revenue: ${revenue.reason}`);
    }

    if (input.team_size > MAX_TEAM_SIZE) {
      return rejected(`team size: ${input.team_size} is above the ${MAX_TEAM_SIZE} cap`);
    }

    if (input.founded_year < MIN_FOUNDED_YEAR) {
      return rejected(`founded year: ${input.founded_year} is before ${MIN_FOUNDED_YEAR}`);
    }

    // Normalize to the exact shape of the table before the write. By this point
    // every rule has passed, so nothing downstream needs to re-check anything.
    const record: CompanyRecord = {
      company_name: input.company_name.trim(),
      source_url: input.source_url.trim(),
      country_or_location: input.country_or_location.trim(),
      team_size: input.team_size,
      industry: input.industry.trim(),
      description: input.description.trim(),
      batch: input.batch.trim(),
      is_b2b: input.is_b2b,
      is_b2c: input.is_b2c,
      funding_rounds: input.funding_rounds.map((round) => ({
        round: round.round.trim(),
        amount_usd: round.amount_usd,
        date: round.date?.trim() || null,
      })),
      annual_revenue: input.annual_revenue,
      is_annual_revenue_estimate: input.is_annual_revenue_estimate,
      founded_year: input.founded_year,
    };

    const { inserted } = await upsertCompany(record);

    return {
      stored: true,
      status: inserted ? ("inserted" as const) : ("updated" as const),
      company_name: record.company_name,
      source_url: record.source_url,
      reason: `qualified — ${region.reason}, ${revenue.reason}`,
    };
  },
});
