import { CompanyMarquee } from "@/components/scoutly/company-marquee";
import { Hero } from "@/components/scoutly/hero";
import { Pipeline, ShortlistMap, TopCompanies } from "@/components/scoutly/landing";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CompanyMarquee />
      <div className="h-24 sm:h-32" />
      <ShortlistMap />
      <Pipeline />
      <TopCompanies />
    </>
  );
}
