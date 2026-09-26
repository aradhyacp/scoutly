/**
 * Fan scraper/raw.jsonl out to trigger.dev, one run per company.
 *
 * Run locally after scraping:
 *
 *   pnpm seed              # queue every company
 *   pnpm seed --limit 3    # queue the first 3, for a smoke test
 *   pnpm seed --dry-run    # parse and report, queue nothing
 *
 * The file stays on the machine that scraped it — the rows travel as run
 * payloads, so nothing has to be bundled into the deployed task. Needs
 * TRIGGER_SECRET_KEY in the environment.
 */

import { tasks } from "@trigger.dev/sdk";
import { readFile } from "node:fs/promises";
import type { processCompany, ScrapedCompany } from "../trigger/process-company";

const INPUT_PATH = "scraper/raw.jsonl";

function parseArgs() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  return {
    dryRun: args.includes("--dry-run"),
    limit: limitIndex === -1 ? undefined : Number(args[limitIndex + 1]),
  };
}

async function main() {
  const { dryRun, limit } = parseArgs();

  const raw = await readFile(INPUT_PATH, "utf8");
  const lines = raw.split("\n").filter((line) => line.trim().length > 0);

  let companies: ScrapedCompany[] = lines.map((line) => JSON.parse(line));
  if (limit !== undefined) companies = companies.slice(0, limit);

  // The scraper already upserts on source_url, but a duplicated line would
  // otherwise queue the same company twice and pay for the research twice.
  const seen = new Set<string>();
  companies = companies.filter((c) => !seen.has(c.source_url) && seen.add(c.source_url));

  console.log(`${lines.length} rows in ${INPUT_PATH}, ${companies.length} to queue`);

  if (dryRun) {
    for (const c of companies) console.log(`  would queue ${c.company_name} (${c.source_url})`);
    return;
  }

  const batch = await tasks.batchTrigger<typeof processCompany>(
    "process-company",
    companies.map((payload) => ({
      payload,
      // Re-running the seed will not double-queue a company already queued.
      options: { idempotencyKey: `company:${payload.source_url}` },
    })),
  );

  console.log(`queued ${companies.length} runs, batch ${batch.batchId}`);
  console.log("watch: https://cloud.trigger.dev -> Runs");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
