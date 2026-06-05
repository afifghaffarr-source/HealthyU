import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ReminderScheduler } from "@/components/reminder-scheduler";
import { DesktopSidebar } from "@/components/healthyu/desktop-sidebar";
import { CommandPalette } from "@/components/healthyu/command-palette";
import { QuickActionFab } from "@/components/healthyu/quick-action-fab";
import { KeyboardShortcutsDialog } from "@/components/healthyu/keyboard-shortcuts-dialog";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedAppShell,
});

function AuthenticatedAppShell() {
  return (
    <>
      <ReminderScheduler />
      <DesktopSidebar />
      <div className="lg:pl-64">
        <Outlet />
      </div>
      <CommandPalette />
      <QuickActionFab />
      <KeyboardShortcutsDialog />
    </>
  );
}
