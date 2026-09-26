import type { NextRequest } from "next/server";

import { listCompanies } from "@/lib/server/companies";
import type { ApiError, CompaniesResponse } from "@/lib/types";

/**
 * GET /api/companies            every stored company
 * GET /api/companies?industry=X only that industry
 *
 * Reads at request time — Route Handlers are not cached by default, and the
 * table changes whenever the enrichment pipeline runs.
 */
export async function GET(request: NextRequest) {
  const industry = request.nextUrl.searchParams.get("industry")?.trim() || undefined;

  try {
    const companies = await listCompanies({ industry });
    return Response.json({ companies } satisfies CompaniesResponse);
  } catch (error) {
    console.error("[api/companies]", error);
    return Response.json(
      { error: "Couldn't load companies from the database." } satisfies ApiError,
      { status: 503 },
    );
  }
}
