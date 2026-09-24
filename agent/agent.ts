import { defineAgent } from "eve";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export default defineAgent({
  model: openrouter("stealth/space-bunny-alpha"),
  modelContextWindowTokens: 1_000_000,
});
