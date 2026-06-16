import { createFileRoute } from "@tanstack/react-router";
import { PengaturanChatPage } from "@/features/pengaturan/routes/PengaturanChatPage";
import { FeatureErrorBoundary } from "@/components/healthyu/feature-error-boundary";

export const Route = createFileRoute("/_authenticated/pengaturan/chat")({
  component: () => (
    <FeatureErrorBoundary feature="Pengaturan Chat">
      <PengaturanChatPage />
    </FeatureErrorBoundary>
  ),
});
