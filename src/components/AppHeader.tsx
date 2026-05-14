"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { useAuth } from "@/components/AuthProvider";

export function AppHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const navItems = [
    { href: "/", label: "Workspace" },
    { href: "/applications", label: "Applications" },
    { href: "/profile", label: "Account" },
  ];

  return (
    <header className="border-b border-white/10 bg-[var(--color-rail)] text-[var(--color-rail-text)]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-5 py-4 md:px-8 lg:flex-row lg:items-center">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-ochre)] font-display text-lg italic text-white">
              j
            </span>
            <span className="font-display text-2xl italic tracking-[-0.03em] text-white">
              job deck
            </span>
          </Link>
          {user ? (
            <nav className="hidden items-center gap-1 lg:flex">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-[var(--color-rail-hi)] text-white"
                        : "text-[var(--color-rail-text)] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
        <div className="lg:ml-auto">
          {user ? (
            <AuthPanel />
          ) : (
            <p className="text-sm text-[var(--color-rail-muted)]">
              Document-first application workflow.
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
