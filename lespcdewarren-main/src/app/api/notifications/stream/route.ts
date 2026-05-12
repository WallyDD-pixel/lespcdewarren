import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { subscribeToUser } from "@/lib/notifier";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sseHeaders() {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  } as Record<string, string>;
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const te = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: any) => {
        try {
          const line = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(te.encode(line));
        } catch {
          // ignore
        }
      };

      // Initial hello
      send({ type: "connected", ts: Date.now() });

      // Subscribe to user channel
      const unsubscribe = subscribeToUser(session.user!.id, (payload) => {
        send(payload);
      });

      // Heartbeat to keep the connection alive
      const ping = setInterval(() => send({ type: "ping", ts: Date.now() }), 15000);

      const close = () => {
        clearInterval(ping);
        unsubscribe();
        try { controller.close(); } catch {}
      };

      // Close when client disconnects
      req.signal.addEventListener("abort", close);

      // Also guard against GC (optional)
      // @ts-ignore
      (globalThis as any).__sseConnections ||= new Set();
      // @ts-ignore
      (globalThis as any).__sseConnections.add(close);
    },
    cancel() {
      // no-op
    },
  });

  return new Response(stream, { headers: sseHeaders() });
}
