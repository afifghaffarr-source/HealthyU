import { APP_CONFIG } from "@/config/app";

export interface BreadcrumbItem {
  name: string;
  to: string;
}

/**
 * JSON-LD BreadcrumbList schema for SEO. Kept in a separate non-tsx file
 * so `CalculatorShell` (calculator-shell.tsx) can import it without
 * violating `react-refresh/only-export-components`.
 */
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
