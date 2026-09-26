"use client";

import { AnimatePresence, motion } from "motion/react";
import { ExternalLink, X } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

import { IndustryTag, MarketTags } from "@/components/scoutly/industry-tag";
import { Revenue } from "@/components/scoutly/revenue";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { formatRoundDate, formatUsd, pluralise } from "@/lib/format";
import type { Company } from "@/lib/types";

/**
 * A company's full record.
 *
 * The motion is aceternity's expandable card: the panel shares a `layoutId`
 * with the row it opened from, so the row visibly grows into the card and
 * shrinks back. The rest is rebuilt — the demo's modal has no dialog role, no
 * focus handling, and resets body overflow unconditionally. This one is a real
 * modal: focus moves in on open, Tab stays inside, Escape and an outside press
 * close it, and focus goes back to the row that opened it.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function companyLayoutId(company: Company) {
  return `company-${company.id}`;
}

export function CompanyDialog({ company, onClose }: { company: Company | null; onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => onClose(), [onClose]);
  useOutsideClick(panelRef, close);

  useEffect(() => {
    if (!company) return;

    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      opener?.focus();
    };
  }, [company, close]);

  return (
    <AnimatePresence>
      {company && (
        <>
          <motion.div
            key="scrim"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-plane/80 backdrop-blur-sm"
          />
          <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
            <motion.div
              ref={panelRef}
              layoutId={companyLayoutId(company)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="company-dialog-title"
              // Radius as a style, not a class, so the shared-layout grow from a row keeps round corners.
              style={{ borderRadius: 16 }}
              className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border border-line-strong bg-overlay sm:h-auto sm:max-h-[88vh]"
            >
              <CompanyRecord company={company} closeRef={closeRef} onClose={close} />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function CompanyRecord({
  company,
  closeRef,
  onClose,
}: {
  company: Company;
  closeRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  const disclosedRounds = company.fundingRounds.filter((round) => round.amountUsd !== null).length;

  return (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-line px-6 pb-5 pt-6">
        <div className="min-w-0">
          <h2 id="company-dialog-title" className="type-title text-3xl text-ink">
            {company.name}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <IndustryTag industry={company.industry} />
            <span className="text-ink-2">{company.locations.filter((l) => l !== "Remote").join("; ") || company.primaryLocation}</span>
            {company.locations.includes("Remote") && <span className="text-ink-3">Remote-friendly</span>}
          </div>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-md text-ink-2 transition-colors hover:bg-raised hover:text-ink"
        >
          <X className="size-4" aria-hidden="true" />
          <span className="sr-only">Close</span>
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.12 } }}
        exit={{ opacity: 0, transition: { duration: 0.05 } }}
        className="overflow-y-auto px-6 pb-8 pt-6"
      >
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          <Fact label="Annual revenue">
            <Revenue value={company.annualRevenueUsd} estimate={company.revenueIsEstimate} className="text-lg" />
            <p className="mt-1 text-xs leading-snug text-ink-3">
              {company.revenueIsEstimate ? "Estimated — no published figure" : "Reported figure"}
            </p>
          </Fact>
          <Fact label="Team">
            <span className="text-lg">{pluralise(company.teamSize, "person", "people")}</span>
          </Fact>
          <Fact label="Founded">
            <span className="text-lg">{company.foundedYear}</span>
          </Fact>
          <Fact label="YC batch">
            <span className="text-lg">{company.batch}</span>
          </Fact>
          <Fact label="Sells to">
            <MarketTags isB2b={company.isB2b} isB2c={company.isB2c} />
          </Fact>
          <Fact label="Total raised">
            <span className="text-lg">
              {company.totalRaisedUsd === null ? "Undisclosed" : formatUsd(company.totalRaisedUsd)}
            </span>
          </Fact>
        </dl>

        {company.description && (
          <div className="mt-8 max-w-[64ch] space-y-3 text-[0.95rem] leading-relaxed text-ink-2">
            {company.description.split(/\n{2,}/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}

        {company.fundingRounds.length > 0 && (
          <section className="mt-9" aria-labelledby="funding-heading">
            <h3 id="funding-heading" className="text-sm font-semibold text-ink">
              Funding history
              <span className="ml-2 font-normal text-ink-3">
                {pluralise(company.fundingRounds.length, "round")}
                {disclosedRounds < company.fundingRounds.length && `, ${disclosedRounds} with a disclosed amount`}
              </span>
            </h3>
            {/* Oldest first: this list is a genuine sequence, so the rail reads as a timeline. */}
            <ol className="mt-4 border-l border-line-strong">
              {company.fundingRounds.map((round, index) => (
                <li key={index} className="relative pb-5 pl-5 last:pb-0">
                  <span aria-hidden="true" className="absolute -left-[3.5px] top-[0.45rem] size-1.5 rounded-full bg-ink-3" />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                    <span className="font-medium text-ink">{round.label}</span>
                    <span className="figures text-ink">
                      {round.amountUsd === null ? <span className="text-ink-3">Undisclosed</span> : formatUsd(round.amountUsd)}
                    </span>
                  </div>
                  {(round.date || round.note) && (
                    <p className="mt-1 text-sm leading-snug text-ink-3">
                      {[formatRoundDate(round.date), round.note].filter(Boolean).join(". ")}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <a
          href={company.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-9 inline-flex items-center gap-2 rounded-md text-sm font-medium text-signal underline-offset-4 hover:underline"
        >
          View on Y Combinator
          <ExternalLink className="size-3.5" aria-hidden="true" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      </motion.div>
    </>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="mt-1 text-ink">{children}</dd>
    </div>
  );
}
