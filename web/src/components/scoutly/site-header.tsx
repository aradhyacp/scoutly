"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/scoutly/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/companies", label: "Companies" },
  { href: "/industries", label: "Industries" },
  { href: "/method", label: "How it works" },
];

/*
 * Wide and bare over the hero, then it gathers into a pill once you scroll so
 * it stays out of the way of the list beneath it. The change answers the
 * scroll, so it is the one piece of chrome allowed to move.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  // The menu remembers the page it was opened on, so navigating closes it.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  const compact = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3">
      <motion.div
        initial={false}
        animate={{
          maxWidth: compact ? 760 : 1152,
          backgroundColor: compact ? "rgba(20, 37, 45, 0.82)" : "rgba(20, 37, 45, 0)",
          borderColor: compact ? "rgba(231, 239, 238, 0.12)" : "rgba(231, 239, 238, 0)",
          paddingLeft: compact ? 10 : 4,
          paddingRight: compact ? 6 : 4,
        }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        style={{ borderRadius: 999 }}
        className="mx-auto flex h-14 items-center justify-between gap-4 border backdrop-blur-md"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-ink" aria-label="Scoutly home">
          <Logo className="size-7" />
          <span className="type-title text-lg">Scoutly</span>
        </Link>

        <nav aria-label="Main" className="hidden sm:block">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative block rounded-full px-4 py-2 text-sm transition-colors",
                      active ? "text-ink" : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {/* The pill behind the current page slides between links rather than blinking. */}
                    {active && (
                      <motion.span
                        layoutId="nav-current"
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-full bg-overlay"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/companies"
            className={cn(
              "hidden h-10 items-center rounded-full bg-signal px-4 text-sm font-semibold text-on-signal transition-opacity hover:opacity-90 sm:inline-flex",
              pathname.startsWith("/companies") && "sm:hidden",
            )}
          >
            Browse companies
          </Link>
          <button
            type="button"
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="grid size-10 place-items-center rounded-full text-ink-2 hover:text-ink sm:hidden"
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            id="mobile-menu"
            aria-label="Main"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mx-auto mt-2 max-w-[760px] rounded-3xl border border-line-strong bg-raised/95 p-2 backdrop-blur-md sm:hidden"
          >
            <ul>
              {[{ href: "/", label: "Overview" }, ...LINKS].map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "block rounded-2xl px-4 py-3 text-base",
                        active ? "bg-overlay text-ink" : "text-ink-2 hover:text-ink",
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
