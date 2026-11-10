// web/src/components/scoutly/frame.tsx
import { cn } from "@/lib/utils";

/*
 * The site's ruled frame. Rails run down both edges of the content column on
 * every page; on the landing page, hatched bands separate the sections and
 * corner ticks pin each panel to the sheet.
 */

/** The two vertical rails, drawn behind a page's content. */
export function Rails() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 hidden sm:block">
      <div className="mx-auto h-full max-w-6xl border-x border-line" />
    </div>
  );
}

/** A hatched band the width of the frame, used as the gap between sections. */
export function Hatch({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className="border-y border-line">
      <div className={cn("hatch mx-auto h-14 max-w-6xl sm:h-20", className)} />
    </div>
  );
}

/** Four small ticks at the corners of the nearest positioned parent. */
export function Corners() {
  const tick = "pointer-events-none absolute size-3 border-ink-3";
  return (
    // Absolutely positioned, so a grid or flex parent never counts it as a cell.
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className={cn(tick, "-left-px -top-px border-l border-t")} />
      <span className={cn(tick, "-right-px -top-px border-r border-t")} />
      <span className={cn(tick, "-bottom-px -left-px border-b border-l")} />
      <span className={cn(tick, "-bottom-px -right-px border-b border-r")} />
    </span>
  );
}

/** The small label above a section title. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-ink-3">
      <span aria-hidden="true" className="size-1.5 rounded-full bg-signal" />
      {children}
    </p>
  );
}

export function SectionTitle({ id, children, className }: { id: string; children: React.ReactNode; className?: string }) {
  return (
    <h2 id={id} className={cn("type-hero text-[clamp(2rem,4.4vw,3.4rem)] text-ink", className)}>
      {children}
    </h2>
  );
}
