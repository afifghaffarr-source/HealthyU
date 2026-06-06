const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

export function sseResponse(stream: ReadableStream<Uint8Array>) {
  return new Response(stream, { headers: SSE_HEADERS });
}

export function staticReplyStream(meta: Record<string, unknown>, reply: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: reply })}\n\n`));
      controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      controller.close();
    },
  });
  return sseResponse(stream);
}

export type ProxyHandlers = {
  onComplete: (fullText: string) => Promise<void> | void;
};

export function proxyUpstreamStream(
  upstreamBody: ReadableStream<Uint8Array>,
  meta: Record<string, unknown>,
  handlers: ProxyHandlers,
  extraTail?: string,
): Response {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`));
      const reader = upstreamBody.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const raw of lines) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string | undefined = json?.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
              }
            } catch {
              /* ignore parse errors */
            }
          }
        }
        if (fullText) {
          if (extraTail) {
            fullText += extraTail;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: extraTail })}\n\n`));
          }
          await handlers.onComplete(fullText);
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (err) {
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify({ message: String(err) })}\n\n`),
        );
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}
