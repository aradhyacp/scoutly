import { countByIndustry } from "@/lib/server/companies";
import type { ApiError, IndustriesResponse } from "@/lib/types";

/**
 * GET /api/industries — company count per industry, largest first.
 *
 * Seeded into the page by the layout, so this is the retry path. Counts move
 * only when the pipeline runs; a few minutes at the CDN costs nothing.
 */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

export async function GET() {
  try {
    const industries = await countByIndustry();
    const total = industries.reduce((sum, row) => sum + row.count, 0);
    return Response.json({ total, industries } satisfies IndustriesResponse, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    console.error("[api/industries]", error);
    return Response.json(
      { error: "Couldn't load industries from the database." } satisfies ApiError,
      { status: 503 },
    );
  }
}
