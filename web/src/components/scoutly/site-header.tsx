"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Companies" },
  { href: "/industries", label: "Industries" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="type-title rounded text-lg text-ink">
          Scoutly
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-1">
            {LINKS.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm transition-colors",
                      active ? "text-ink" : "text-ink-2 hover:text-ink",
                    )}
                  >
                    {link.label}
                    {/* The underline carries "you are here", not colour alone. */}
                    <span
                      aria-hidden="true"
                      className={cn(
                        "mt-1 block h-px bg-signal transition-opacity",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
