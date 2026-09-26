// web/src/app/companies/page.tsx
import type { Metadata } from "next";

import { CompanyExplorer } from "@/components/scoutly/company-explorer";
import { PageIntro } from "@/components/scoutly/page-intro";

export const metadata: Metadata = {
  title: "Companies",
};

export default function CompaniesPage() {
  return (
    <>
      <PageIntro title="Every company on the shortlist.">
        <p>
          Search by name, narrow by region, industry, or who they sell to, and select any company to see
          its full record and funding history. The bar below is the list&rsquo;s industry mix; press a
          colour to filter by it.
        </p>
      </PageIntro>
      <CompanyExplorer />
    </>
  );
}
