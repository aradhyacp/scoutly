import type { NextRequest } from "next/server";

import { listCompanies } from "@/lib/server/companies";
import type { ApiError, CompaniesResponse } from "@/lib/types";

/**
 * GET /api/companies            every stored company
 * GET /api/companies?industry=X only that industry
 *
 * Most readers never reach this: the layout renders the unfiltered list into
 * the page and seeds SWR with it. What is left is the per-industry filter and
 * the retry path, and since the table only changes when the enrichment
 * pipeline runs, both are safe to serve from the CDN for a few minutes.
 */
const CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";
export async function GET(request: NextRequest) {
  const industry = request.nextUrl.searchParams.get("industry")?.trim() || undefined;

  try {
    const companies = await listCompanies({ industry });
    return Response.json({ companies } satisfies CompaniesResponse, {
      headers: { "Cache-Control": CACHE_CONTROL },
    });
  } catch (error) {
    console.error("[api/companies]", error);
    return Response.json(
      { error: "Couldn't load companies from the database." } satisfies ApiError,
      { status: 503 },
    );
  }
}
