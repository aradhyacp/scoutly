// web/src/components/scoutly/site-footer.tsx
import Link from "next/link";

import { Logo } from "@/components/scoutly/logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-[44ch]">
          <Link href="/" className="inline-flex items-center gap-2.5 rounded-full text-ink">
            <Logo className="size-6" />
            <span className="type-title">Scoutly</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-ink-3">
            Companies come from Y Combinator&rsquo;s public directory. Revenue, funding, and location are
            researched by an AI agent and can be wrong, so check the YC profile before relying on a figure.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex gap-6 text-sm text-ink-2">
            <li>
              <Link href="/companies" className="rounded hover:text-ink">
                Companies
              </Link>
            </li>
            <li>
              <Link href="/industries" className="rounded hover:text-ink">
                Industries
              </Link>
            </li>
            <li>
              <a href="https://www.ycombinator.com/companies" target="_blank" rel="noreferrer" className="rounded hover:text-ink">
                YC directory<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
