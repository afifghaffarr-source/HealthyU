import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { APP_CONFIG } from "@/config/app";

interface BreadcrumbItem {
  name: string;
  to: string;
}

interface CalculatorShellProps {
  title: string;
  description: string;
  breadcrumbs: BreadcrumbItem[];
  children: ReactNode;
  howTo?: ReactNode;
  faq?: ReactNode;
}

export function CalculatorShell({
  title,
  description,
  breadcrumbs,
  children,
  howTo,
  faq,
}: CalculatorShellProps) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-2">
          {breadcrumbs.map((b, i) => (
            <li key={b.to} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={b.to} className="hover:text-foreground">
                  {b.name}
                </Link>
              ) : (
                <span className="text-foreground">{b.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </header>
      <section className="rounded-xl border bg-card p-6 shadow-sm">{children}</section>
      {howTo && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground">Cara menghitung</h2>
          <div className="mt-3 text-sm text-muted-foreground">{howTo}</div>
        </section>
      )}
      {faq && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-foreground">Pertanyaan umum</h2>
          <div className="mt-3 space-y-3 text-sm">{faq}</div>
        </section>
      )}
    </main>
  );
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: `${APP_CONFIG.siteUrl}${b.to === "/" ? "" : b.to}`,
    })),
  };
}
