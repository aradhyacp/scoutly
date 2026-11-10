import { Bento } from "@/components/scoutly/bento";
import { ClosingBanner, Horizon } from "@/components/scoutly/closing";
import { FeatureSteps } from "@/components/scoutly/feature-steps";
import { Hatch } from "@/components/scoutly/frame";
import { Hero } from "@/components/scoutly/hero";
import { ShortlistMap } from "@/components/scoutly/landing";
import { Problem } from "@/components/scoutly/product";
import { WorkflowGraph } from "@/components/scoutly/workflow-graph";

/*
 * The landing page reads as a product story on one ruled sheet: the promise
 * with the product running beside it, the pain, what Scoutly finds, how it
 * plugs in, what you get, where it starts, the live market, and the ask.
 * Hatched bands separate the sections.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Hatch />
      <Problem />
      <Hatch />
      <FeatureSteps />
      <Hatch />
      <WorkflowGraph />
      <Hatch />
      <Bento />
      <Hatch />
      <Horizon />
      <Hatch />
      <ShortlistMap />
      <Hatch />
      <ClosingBanner />
    </>
  );
}
