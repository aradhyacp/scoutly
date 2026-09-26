import type { Metadata } from "next";

import { MethodPage } from "@/components/scoutly/method";
import { PageIntro } from "@/components/scoutly/page-intro";

export const metadata: Metadata = {
  title: "How it works",
};

export default function Method() {
  return (
    <>
      <PageIntro title="From a directory to a shortlist.">
        <p>
          Every company here went through the same five steps: scraped from YC, queued, researched by an
          AI agent, checked against four rules, and only then saved. Here is what happens at each one.
        </p>
      </PageIntro>
      <MethodPage />
    </>
  );
}
