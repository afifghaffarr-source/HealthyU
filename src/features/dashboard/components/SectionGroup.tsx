/**
 * SectionGroup — Visual section divider for the dashboard.
 *
 * Used to cluster cards into semantic groups (Stat Utama, Tracking, etc.)
 * with a small caps label + optional action link.
 */

import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function SectionGroup({
  label,
  actionLabel,
  actionHref,
  children,
}: {
  label: string;
  actionLabel?: string;
  actionHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3 animate-fade-up">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </h2>
        {actionLabel && actionHref && (
          <Link
            to={actionHref}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
          >
            {actionLabel}
            <ChevronRight className="size-3" />
          </Link>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
