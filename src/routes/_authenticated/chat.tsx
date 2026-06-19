import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/chat/routes/ChatPage";
import { FeatureErrorBoundary } from "@/components/healthyu/feature-error-boundary";

/**
 * Skeleton shown while chat data + stream loads. Reduces perceived latency
 * for users on 3G by giving immediate visual feedback instead of blank screen.
 */
function ChatLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Memuat percakapan"
      className="min-h-dvh bg-background px-4 pt-4 pb-24 max-w-md mx-auto"
    >
      <div className="h-12 bg-muted/50 rounded-xl mb-4 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
            <div
              className={`h-16 ${i % 2 === 0 ? "w-3/4" : "w-2/3"} bg-muted/50 rounded-2xl animate-pulse`}
            />
          </div>
        ))}
      </div>
      <div className="h-14 bg-muted/50 rounded-2xl mt-6 animate-pulse" />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/chat")({
  component: () => (
    <FeatureErrorBoundary feature="HealthyU AI Coach">
      <ChatPage />
    </FeatureErrorBoundary>
  ),
  pendingComponent: ChatLoadingSkeleton,
});
