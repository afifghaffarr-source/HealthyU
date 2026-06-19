/**
 * MobileNav — responsive navigation for the landing page.
 *
 * Mobile (<lg): floating bottom-sheet nav (4 items + center FAB CTA)
 *   + top bar with hamburger drawer.
 * Desktop (>=lg): null (LandingNav renders the top sticky nav).
 *
 * The bottom-sheet pattern prevents menu items from accumulating in a
 * cramped horizontal strip on small screens and keeps thumb reach easy.
 */
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Scan, Salad, Activity, Brain, Sparkles, Menu as MenuIcon, X as XIcon } from "lucide-react";
import { APP_CONFIG } from "@/config/app";

const BOTTOM_ITEMS = [
  { icon: Scan, label: "Scan", href: "/scan" },
  { icon: Salad, label: "Resep", href: "/resep" },
  { icon: Activity, label: "BMI", href: "/kalkulator/bmi" },
  { icon: Brain, label: "Coach", href: "/chat" },
];

const DRAWER_LINKS = [
  { label: "Fitur", href: "#fitur" },
  { label: "Cara kerja", href: "#cara" },
  { label: "Testimoni", href: "#testimoni" },
  { label: "FAQ", href: "#faq" },
  { label: "Artikel", href: "/artikel" },
  { label: "Kalkulator", href: "/kalkulator" },
  { label: "Database kalori", href: "/kalori" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar (logo + hamburger) — only on small viewports */}
      <header className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-5 h-14">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="size-7 rounded-xl bg-primary text-primary-foreground grid place-items-center">
              <Sparkles className="size-4" strokeWidth={2} />
            </span>
            {APP_CONFIG.name}
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            className="size-10 grid place-items-center rounded-xl bg-muted active:scale-95 transition-transform"
          >
            <MenuIcon className="size-5" strokeWidth={1.75} />
          </button>
        </div>
      </header>

      {/* Drawer overlay (mobile only) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span className="font-semibold">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="size-10 grid place-items-center rounded-xl bg-muted active:scale-95"
              >
                <XIcon className="size-5" strokeWidth={1.75} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {DRAWER_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium hover:bg-muted transition-colors"
                >
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="p-4 border-t border-border space-y-2">
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="block w-full text-center bg-primary text-primary-foreground font-semibold rounded-full py-3 hover:bg-primary/90 transition-colors"
              >
                Mulai gratis
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* Bottom sheet nav (mobile only) */}
      <nav
        aria-label="Navigasi utama mobile"
        className="lg:hidden fixed bottom-4 inset-x-4 z-40 rounded-2xl bg-background/95 backdrop-blur-xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center justify-around py-2"
      >
        {BOTTOM_ITEMS.map(({ icon: Icon, label, href }) => (
          <Link
            key={href}
            to={href}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[11px] font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        ))}
        <Link
          to="/auth"
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold"
        >
          <Sparkles className="size-5" strokeWidth={1.75} />
          Mulai
        </Link>
      </nav>
    </>
  );
}
