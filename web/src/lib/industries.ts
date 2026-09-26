/**
 * Industry -> colour, fixed per industry and never by rank.
 *
 * A reader who learns "Healthcare is aqua" on one visit must see aqua on the
 * next, however the counts shift — so colour is keyed to the name, not to the
 * slice's position in a sorted list.
 *
 * The order below is also the donut's slice order, and it matters: it is the
 * validated adjacency. Walking the ring blue > orange > aqua > yellow > magenta
 * > green > (back to blue), every neighbouring pair clears the colour-blind
 * separation target on this surface. Sorting slices by size would put untested
 * pairs next to each other.
 *
 * YC's other top-level industries (Education, Government, Unspecified) and
 * anything new fold into a neutral "Other" rather than getting a generated
 * seventh hue, which would be indistinguishable under colour-blindness.
 */

export const NAMED_INDUSTRIES = [
  "B2B",
  "Consumer",
  "Healthcare",
  "Industrials",
  "Fintech",
  "Real Estate and Construction",
] as const;

export const OTHER = "Other";

const COLOUR: Record<string, string> = {
  B2B: "var(--series-1)",
  Consumer: "var(--series-2)",
  Healthcare: "var(--series-3)",
  Industrials: "var(--series-4)",
  Fintech: "var(--series-5)",
  "Real Estate and Construction": "var(--series-6)",
};

export function industryColour(industry: string): string {
  return COLOUR[industry] ?? "var(--series-other)";
}

/** The bucket an industry is drawn in: itself if named, otherwise Other. */
export function industryBucket(industry: string): string {
  return industry in COLOUR ? industry : OTHER;
}

/** Position in the validated ring; Other always sits last. */
export function industryOrder(bucket: string): number {
  const index = (NAMED_INDUSTRIES as readonly string[]).indexOf(bucket);
  return index === -1 ? NAMED_INDUSTRIES.length : index;
}
