/**
 * SSE event parsing helpers for the dashboard.
 *
 * The backend streams Server-Sent Events as ``data: {json}\n\n`` frames.
 * The browser EventSource exposes the JSON payload via ``event.data``.
 * These helpers parse that payload into a typed message and let callers
 * react to specific event types (e.g. ``connection_state_changed``).
 */

export interface SseMessage {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Parse the JSON payload of an SSE ``data:`` frame.
 *
 * Returns ``null`` when the payload is not valid JSON or lacks a ``type``
 * field — EventSource delivers keepalive comments separately (they never
 * reach ``onmessage``), but malformed/empty frames must not crash the UI.
 */
export function parseSseMessage(raw: string): SseMessage | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { type, data } = parsed as { type?: unknown; data?: unknown };
    if (typeof type !== "string" || !type) return null;
    return {
      type,
      data: (typeof data === "object" && data !== null
        ? data
        : {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * True when the message is a ``connection_state_changed`` event, i.e. the
 * WhatsApp connection status was updated by a webhook (QR scanned, phone
 * disconnected, etc.).
 */
export function isConnectionStateChanged(
  message: SseMessage | null,
): message is SseMessage {
  return message !== null && message.type === "connection_state_changed";
}
