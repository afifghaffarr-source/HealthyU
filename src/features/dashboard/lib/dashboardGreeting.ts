/**
 * Get a time-of-day greeting in Indonesian for the dashboard header.
 * Used by the route to pass into DashboardHeader's `greeting` prop.
 *
 * Lives in a .ts file (not .tsx) so it doesn't trip the
 * `react-refresh/only-export-components` lint rule. Co-located with
 * the dashboard feature so it's discoverable but not bundled into
 * the component file (which would break React Fast Refresh).
 */
export function dashboardGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}
