import Link from "next/link";
import type { ReactNode } from "react";

export function FeatureNavigationCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 transition-colors hover:bg-emerald-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      href={href}
    >
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-emerald-800">
          {description}
        </span>
      </span>
      <span aria-hidden="true" className="text-xl">
        →
      </span>
    </Link>
  );
}

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
    >
      ← {children}
    </Link>
  );
}
