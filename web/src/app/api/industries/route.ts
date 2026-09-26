import { countByIndustry } from "@/lib/server/companies";
import type { ApiError, IndustriesResponse } from "@/lib/types";

/** GET /api/industries — company count per industry, largest first. */
export async function GET() {
  try {
    const industries = await countByIndustry();
    const total = industries.reduce((sum, row) => sum + row.count, 0);
    return Response.json({ total, industries } satisfies IndustriesResponse);
  } catch (error) {
    console.error("[api/industries]", error);
    return Response.json(
      { error: "Couldn't load industries from the database." } satisfies ApiError,
      { status: 503 },
    );
  }
}
