/**
 * Image moderation via Lovable AI Gateway (vision model).
 * Classifies an image as: safe | nudity | violence | spam | medical_graphic | other.
 *
 * Cheap call (~tier 2). Returns "safe" on infra error to fail-open (logged).
 * Call BEFORE storing user-uploaded images (chat attachments, progress photos, scan photos).
 */

export type ModerationLabel = "safe" | "nudity" | "violence" | "spam" | "medical_graphic" | "other";

export interface ModerationResult {
  label: ModerationLabel;
  confidence: number;
  blocked: boolean;
  reason?: string;
}

const SYSTEM_PROMPT =
  "You are an image safety classifier. Classify the image into exactly one label: " +
  '"safe", "nudity", "violence", "spam", "medical_graphic", or "other". ' +
  'Reply ONLY with compact JSON: {"label":"...","confidence":0-1,"reason":"short"}. ' +
  'Treat exposed genitalia/sexual content as "nudity". Medical wound close-ups are "medical_graphic". ' +
  'Memes, advertisements, watermarked stock images, or unrelated promotional content are "spam".';

export async function moderateImage(
  imageBase64: string,
  imageMime: string = "image/jpeg",
): Promise<ModerationResult> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    console.error("[imageMod] LOVABLE_API_KEY missing — failing open");
    return { label: "safe", confidence: 0, blocked: false };
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Classify this image." },
              { type: "image_url", image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });
    if (!res.ok) {
      console.error("[imageMod] upstream", res.status);
      return { label: "safe", confidence: 0, blocked: false };
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content ?? "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { label: "safe", confidence: 0, blocked: false };
    const parsed = JSON.parse(match[0]) as Partial<ModerationResult>;
    const label: ModerationLabel = (parsed.label as ModerationLabel) ?? "safe";
    const confidence = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    const blocked = label !== "safe" && label !== "medical_graphic" && confidence >= 0.6;
    return { label, confidence, blocked, reason: parsed.reason };
  } catch (err) {
    console.error("[imageMod] error", (err as Error).message);
    return { label: "safe", confidence: 0, blocked: false };
  }
}
