import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/chat/routes/ChatPage";
import { FeatureErrorBoundary } from "@/components/healthyu/feature-error-boundary";

export const Route = createFileRoute("/_authenticated/chat")({
  component: () => (
    <FeatureErrorBoundary feature="HealthyU AI Coach">
      <ChatPage />
    </FeatureErrorBoundary>
  ),
});
