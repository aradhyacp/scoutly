import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * Research search, backed by Parallel's Search API (POST /v1/search).
 *
 * This replaces eve's built-in `web_fetch`. The difference matters: a fetch
 * needed a URL, so the model had to guess where a fact lived before it could go
 * and read it. Parallel takes a natural-language objective instead and returns
 * excerpts from the pages that actually answer it, so one call does the work of
 * several blind fetches.
 *
 * The company's identity is not left to prose. `company_name` and `source_url`
 * are their own fields, and this tool — not the model — folds them into the
 * objective and into every search query. A query that drifts onto a
 * similarly-named company is the failure mode that quietly poisons a record,
 * and pinning the name in code is what stops it.
 */

const ENDPOINT = "https://api.parallel.ai/v1/search";

/**
 * Excerpt budget. Enrichment runs ~100 companies with several searches each, so
 * the cost of a loose budget is paid every time; these keep one call to roughly
 * a few thousand tokens while still returning enough to settle a fact.
 */
const MAX_RESULTS = 8;
const MAX_CHARS_PER_RESULT = 3_000;
const MAX_CHARS_TOTAL = 20_000;

type SearchResult = {
  url: string;
  title: string | null;
  publish_date: string | null;
  excerpts: string[];
};

type SearchResponse = {
  search_id: string;
  results: SearchResult[];
  warnings: { type?: string; message?: string }[] | null;
};

/**
 * Parallel reads the objective as the question behind the queries, so the
 * company and its YC profile go in first and the model's own ask goes last.
 */
function composeObjective(companyName: string, sourceUrl: string, objective: string): string {
  return [
    `Research the Y Combinator company "${companyName}". Its YC profile is ${sourceUrl}.`,
    "Treat that profile and the company's own website as authoritative for headquarters, founding year, and what the product is.",
    "Use press coverage, Crunchbase, TechCrunch, LinkedIn, Growjo and Latka for funding rounds and revenue.",
    `Only report facts about this specific company. ${objective}`,
  ].join(" ");
}

/** Keep every query anchored to the company, without doubling the name when it is already there. */
function anchorQuery(companyName: string, query: string): string {
  return query.toLowerCase().includes(companyName.toLowerCase()) ? query : `${companyName} ${query}`;
}

export default defineTool({
  description: [
    "Search the web for facts about one company. This is how you research a company before calling enrich.",
    "",
    "You do not pass a URL. You pass the company's identity (`company_name` and its YC `source_url`), an `objective` saying what you are trying to establish, and two to four short `search_queries`. The tool anchors every query to the company itself, so your queries should name the fact, not the company — \"annual revenue estimate\", not \"Acme Inc annual revenue estimate\".",
    "",
    "Facts to collect for every company:",
    "",
    "1. **Headquarters country** — needed to confirm the company is US/Europe. The YC profile and the company's own site (footer, About, Contact, Careers) are the reliable sources.",
    "2. **Founded year** — the real founding year, not the YC batch year. About page, Crunchbase, LinkedIn, Wikipedia.",
    "3. **B2B / B2C** — who buys the product. Pricing pages, the homepage headline, and 'for teams' vs 'for you' language are the clearest signals. Both can be true.",
    "4. **Funding rounds** — round name, amount in USD, and date. TechCrunch, Crunchbase, the company's press page, the YC profile.",
    "5. **Annual revenue** — a reported figure if one exists, otherwise an estimate. Growjo, Latka, PitchBook summaries, press coverage. When nothing is reported, estimate from team size, stage and last round, and say so in revenue_basis.",
    "",
    "One search per group of related facts works best: a first call for what the company is and where it is, a second for funding and revenue. Two or three calls is normal. Stop once you can fill every enrich field — if a fact genuinely is not findable, use the documented fallback for that field (null for an unknown funding amount or date, an explicit estimate for revenue) rather than searching indefinitely.",
  ].join("\n"),

  inputSchema: z.object({
    company_name: z.string().min(1).describe("The company's name, exactly as it appears in the scraped record."),
    source_url: z.string().url().describe("The company's YC profile URL from the scraped record. Never invent or alter it."),
    objective: z
      .string()
      .min(1)
      .describe(
        "What this search needs to establish, in a sentence. E.g. \"Find the headquarters city and country, the year it was founded, and whether it sells to businesses, consumers, or both.\"",
      ),
    search_queries: z
      .array(z.string().min(1))
      .min(1)
      .max(5)
      .describe(
        "Two to four short queries, three to six words each, naming the facts you want. The company name is added automatically, so leave it out. E.g. [\"headquarters location\", \"founded year\", \"pricing for teams\"].",
      ),
    mode: z
      .enum(["turbo", "fast", "basic", "advanced"])
      .optional()
      .describe("Search depth. Omit for `advanced`, the highest quality, which is what research should use."),
  }),

  label: {
    start: ({ company_name, objective }) => `Search: ${company_name} — ${objective.slice(0, 60)}`,
  },

  async execute({ company_name, source_url, objective, search_queries, mode }, ctx) {
    const apiKey = process.env.PARALLEL_API_KEY;
    if (!apiKey) {
      throw new Error("PARALLEL_API_KEY is not set. Research cannot run without it.");
    }

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      signal: ctx.abortSignal,
      body: JSON.stringify({
        objective: composeObjective(company_name, source_url, objective),
        search_queries: search_queries.map((query) => anchorQuery(company_name, query)),
        mode: mode ?? "advanced",
        max_chars_total: MAX_CHARS_TOTAL,
        advanced_settings: {
          max_results: MAX_RESULTS,
          excerpt_settings: { max_chars_per_result: MAX_CHARS_PER_RESULT },
        },
      }),
    });

    if (!response.ok) {
      // The body carries Parallel's own reason; surfacing it is what lets the
      // model tell a bad query apart from an outage it should stop retrying.
      const detail = await response.text().catch(() => "");
      throw new Error(`Parallel search failed with ${response.status}: ${detail.slice(0, 500) || response.statusText}`);
    }

    const body = (await response.json()) as SearchResponse;

    return {
      search_id: body.search_id,
      company_name,
      result_count: body.results.length,
      results: body.results.map((result) => ({
        url: result.url,
        title: result.title ?? null,
        published: result.publish_date ?? null,
        excerpts: result.excerpts,
      })),
      warnings: body.warnings?.map((warning) => warning.message ?? warning.type ?? "unknown").filter(Boolean) ?? [],
    };
  },
});
