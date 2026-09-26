"use client";

import useSWR from "swr";

import type { CompaniesResponse, IndustriesResponse } from "@/lib/types";

/**
 * The client's only view of the data: our own Route Handlers, via SWR.
 * Both the hero and the list read `/api/companies`, and SWR dedupes that into
 * a single request.
 */

export function useCompanies(industry?: string | null) {
  const key = industry ? `/api/companies?industry=${encodeURIComponent(industry)}` : "/api/companies";
  const { data, error, isLoading, isValidating, mutate } = useSWR<CompaniesResponse>(key);
  return { companies: data?.companies, error: error as Error | undefined, isLoading, isValidating, retry: () => mutate() };
}

export function useIndustries() {
  const { data, error, isLoading, mutate } = useSWR<IndustriesResponse>("/api/industries");
  return { data, error: error as Error | undefined, isLoading, retry: () => mutate() };
}
