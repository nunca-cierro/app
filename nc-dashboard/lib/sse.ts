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

export interface OpenSseStreamOptions {
  /** Called once the fetch response arrives (headers/status available). */
  onOpen?: (res: Response) => void;
  /** Called for every successfully parsed SSE message. */
  onMessage: (msg: SseMessage) => void;
  /** Called on fetch failure, non-ok response, or when the stream ends. */
  onError?: (err: unknown) => void;
}

/**
 * Open an SSE stream via ``fetch`` and deliver parsed messages to
 * ``onMessage`` — the browser EventSource equivalent.
 *
 * Auth (Slice B, spec AS-7): the session travels in the httpOnly
 * ``nc_access_token`` cookie, so the request uses ``credentials: "include"``
 * — no Authorization header, no ``?token=`` query parameter (which leaked
 * the JWT into server/proxy logs), and no localStorage reads.
 *
 * Frame handling follows the SSE spec: chunks are buffered and split on
 * blank lines, ``:``-prefixed comment lines (e.g. keepalives) are ignored,
 * and multi-line ``data:`` fields are joined with newlines. Each frame is
 * parsed with {@link parseSseMessage}; unparseable frames are dropped.
 *
 * The returned close function aborts the stream via an ``AbortController``
 * and is idempotent. Aborting is silent — ``onError`` never fires for an
 * explicit close.
 */
export function openSseStream(
  url: string,
  opts: OpenSseStreamOptions,
): () => void {
  const { onOpen, onMessage, onError } = opts;
  const controller = new AbortController();
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    controller.abort();
  };

  const processFrame = (frame: string) => {
    const dataLines = frame
      .split("\n")
      .filter((line) => !line.startsWith(":")) // comments / keepalives
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).replace(/^ /, ""));
    if (dataLines.length === 0) return;
    const msg = parseSseMessage(dataLines.join("\n"));
    if (msg) onMessage(msg);
  };

  void (async () => {
    try {
      const res = await fetch(url, {
        credentials: "include",
        signal: controller.signal,
      });
      if (closed) return;
      if (!res.ok || !res.body) {
        throw new Error(`SSE request failed with status ${res.status}`);
      }
      onOpen?.(res);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (closed) return;
        if (done) break;
        // Normalize CRLF line endings (chunk boundaries may split \r\n,
        // so re-normalize the whole buffer before scanning for frames).
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(
          /\r\n/g,
          "\n",
        );
        let idx: number;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          processFrame(frame);
          if (closed) return;
        }
      }
      // Flush a final frame not terminated by a blank line.
      if (buffer.trim()) processFrame(buffer);
      if (!closed) onError?.(new Error("SSE stream ended"));
    } catch (err) {
      if (!closed) onError?.(err);
    }
  })();

  return close;
}
