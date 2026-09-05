"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Queue" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/mappings", label: "Mappings" },
  { href: "/admin/sync", label: "Sync" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line/80 bg-ink-soft/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.2em] text-cyan">BWW ADMIN</p>
          <p className="text-lg font-semibold">Job Queue</p>
        </div>
        <nav className="flex flex-wrap items-center gap-2">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  active ? "bg-cyan/15 text-cyan" : "text-muted hover:text-paper"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/" className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-paper">
            Public
          </Link>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-line px-3 py-1.5 text-sm hover:border-bad/60 hover:text-bad"
          >
            Log out
          </button>
        </nav>
      </div>
    </header>
  );
}
