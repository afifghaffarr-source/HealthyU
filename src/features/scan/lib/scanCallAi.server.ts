import { callAiWithGuards } from "@/features/ai/lib/aiGateway.server";

export function makeScanAiCaller(feature: string) {
  return async function callAI(
    prompt: string,
    system: string,
    userId: string | null = null,
  ) {
    return callAiWithGuards({
      userId,
      feature,
      // Scan/AI vision is expensive — deny if rate-limit check fails.
      failClosed: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
  };
}