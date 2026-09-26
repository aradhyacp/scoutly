import { task, logger } from "@trigger.dev/sdk";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { processCompany, type ScrapedCompany } from "./process-company";

/**
 * Fan a slice of the scraped file out to `process-company`, one run each.
 *
 * `raw.jsonl` is shipped into this deployment by the `additionalFiles` build
 * extension, so the batch can be started from the trigger.dev dashboard without
 * anything running locally.
 *
 * Process companies in slices with `offset`:
 *   { "limit": 30 }               -> companies 1-30
 *   { "limit": 30, "offset": 30 } -> companies 31-60
 */

export type SeedPayload = {
  limit?: number;
  offset?: number;
  dryRun?: boolean;
};

const INPUT_PATH = join(process.cwd(), "scraper", "raw.jsonl");

export const seedCompanies = task({
  id: "seed-companies",
  maxDuration: 300,

  run: async ({ limit = 30, offset = 0, dryRun = false }: SeedPayload) => {
    const raw = await readFile(INPUT_PATH, "utf8");
    const all: ScrapedCompany[] = raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line));

    const slice = all.slice(offset, offset + limit);

    // A duplicated line would otherwise queue the same company twice and pay
    // for the research twice.
    const seen = new Set<string>();
    const companies = slice.filter((c) => !seen.has(c.source_url) && seen.add(c.source_url));

    logger.info("Seeding", {
      total: all.length,
      offset,
      limit,
      queueing: companies.length,
      remainingAfter: Math.max(0, all.length - (offset + companies.length)),
    });

    if (dryRun) {
      return {
        dryRun: true,
        total: all.length,
        wouldQueue: companies.map((c) => c.company_name),
      };
    }

    const batch = await processCompany.batchTrigger(
      companies.map((payload) => ({
        payload,
        // Re-running a slice will not re-queue a company already queued.
        options: { idempotencyKey: `company:${payload.source_url}` },
      })),
    );

    return {
      total: all.length,
      offset,
      queued: companies.length,
      nextOffset: offset + companies.length,
      remaining: Math.max(0, all.length - (offset + companies.length)),
      batchId: batch.batchId,
    };
  },
});
