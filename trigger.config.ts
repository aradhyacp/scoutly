import { defineConfig } from "@trigger.dev/sdk";
import { additionalFiles } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  // From the trigger.dev dashboard (Project settings -> Project ref).
  project: process.env.TRIGGER_PROJECT_REF ?? "<your-project-ref>",
  dirs: ["./trigger"],
  runtime: "node-24",

  // One company takes roughly 1-4 minutes of live web research against the
  // deployed agent. 15 minutes leaves room for a slow research path without
  // letting a wedged run hold a queue slot indefinitely.
  maxDuration: 900,

  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 10_000,
      maxTimeoutInMs: 60_000,
      factor: 2,
      randomize: true,
    },
  },

  build: {
    extensions: [
      // Ship the scraped input so seed-companies can read it. Only this file
      // travels — the eve agent is deployed separately on Vercel and none of
      // agent/ or database/ is part of this bundle.
      additionalFiles({ files: ["scraper/raw.jsonl"] }),
    ],
  },
});
