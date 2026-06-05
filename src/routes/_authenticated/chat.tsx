import { createFileRoute } from "@tanstack/react-router";
import { ChatPage } from "@/features/chat/routes/ChatPage";

export const Route = createFileRoute("/_authenticated/chat")({
  component: ChatPage,
});
