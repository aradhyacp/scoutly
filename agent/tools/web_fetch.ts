import { defineTool } from "eve/tools";
import { webFetch } from "eve/tools/web_fetch";

/**
 * The built-in `web_fetch`, re-described for this project.
 *
 * The behaviour is eve's own — the value added here is the description: it tells
 * the model exactly which facts a company record needs, where to look for each
 * one, and when it has enough to stop. Research quality is the bottleneck for the
 * whole pipeline, so the checklist lives in the tool the model is reading at the
 * moment it decides what to fetch.
 */
export default defineTool({
  ...webFetch,
  description: [
    "Fetch a web page as text. This is how you research a company before calling enrich.",
    "",
    "Facts to collect for every company, in this order of preference for sources:",
    "",
    "1. **Headquarters country** — needed to confirm the company is US/Europe. Look at the YC profile, then the company's own site (footer, About, Contact, Careers, Privacy Policy).",
    "2. **Founded year** — the real founding year, not the YC batch year. Check the company's About page, Crunchbase, LinkedIn, or Wikipedia.",
    "3. **B2B / B2C** — read what the product is and who buys it. Pricing pages, the homepage headline, and 'for teams' vs 'for you' language are the clearest signals. Both can be true.",
    "4. **Funding rounds** — round name, amount in USD, and date. TechCrunch, Crunchbase, the company's own press/news page, and YC's profile all carry these.",
    "5. **Annual revenue** — a reported figure if one exists; otherwise an estimate. Growjo, Latka, PitchBook summaries, and press coverage are useful. When nothing is reported, estimate from team size, stage, and last round, and say so in revenue_basis.",
    "",
    "Where to start: the company's `source_url` (its YC profile) always works and usually links out to the company site. From there follow the company's own domain first — it is the most reliable source for location and what the product is. Use third-party sources for funding and revenue.",
    "",
    "Fetch as many pages as you need, but stop once you can fill every enrich field. Two to four pages is normal. If a fact genuinely is not findable, use the documented fallback for that field rather than fetching indefinitely: null for an unknown funding amount or date, and an explicit estimate for revenue.",
  ].join("\n"),
});
