import { defineAgent } from "eve";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

export default defineAgent({
  model: openrouter("stealth/space-bunny-alpha"),
  // This agent researches and queries; it has no business running shell commands
  // or writing files, and dropping the sandbox-backed defaults keeps the tool
  // surface to the five tools in agent/tools.
  defaultTools: false,
  modelContextWindowTokens: 1_000_000,
});
