import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isConnectionStateChanged,
  openSseStream,
  parseSseMessage,
  type SseMessage,
} from "@/lib/sse";

describe("parseSseMessage", () => {
  it("parses a valid connection_state_changed frame", () => {
    const raw = JSON.stringify({
      type: "connection_state_changed",
      data: { status: "connected", state: "open" },
    });
    const msg = parseSseMessage(raw);
    expect(msg?.type).toBe("connection_state_changed");
    expect(msg?.data).toEqual({ status: "connected", state: "open" });
  });

  it("parses a message_received frame", () => {
    const raw = JSON.stringify({
      type: "message_received",
      data: { id: "abc" },
    });
    const msg = parseSseMessage(raw);
    expect(msg?.type).toBe("message_received");
  });

  it("returns null for malformed JSON", () => {
    expect(parseSseMessage("not-json{")).toBeNull();
  });

  it("returns null for JSON without a type field", () => {
    expect(parseSseMessage(JSON.stringify({ data: { status: "connected" } }))).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseSseMessage("")).toBeNull();
  });
});

describe("isConnectionStateChanged", () => {
  it("returns true for connection_state_changed", () => {
    const msg = parseSseMessage(
      JSON.stringify({ type: "connection_state_changed", data: {} }),
    );
    expect(isConnectionStateChanged(msg)).toBe(true);
  });

  it("returns false for other event types", () => {
    const msg = parseSseMessage(
      JSON.stringify({ type: "message_received", data: {} }),
    );
    expect(isConnectionStateChanged(msg)).toBe(false);
  });

  it("returns false when the message is null/unparseable", () => {
    expect(isConnectionStateChanged(null)).toBe(false);
    expect(isConnectionStateChanged(parseSseMessage("garbage"))).toBe(false);
  });
});

/* ── openSseStream — fetch-based SSE reader with header auth ── */

function streamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function stubFetchOk(
  body: ReadableStream<Uint8Array> | null,
  init?: { status?: number },
) {
  const fetchMock = vi.fn(
    async (_url: string | URL, _init?: RequestInit) =>
      new Response(body, { status: init?.status ?? 200 }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("openSseStream", () => {
  it("forwards parsed messages from complete frames", async () => {
    stubFetchOk(
      streamFromChunks([
        'data: {"type":"connection_state_changed","data":{"status":"connected"}}\n\n',
      ]),
    );
    const messages: SseMessage[] = [];
    const onError = vi.fn();

    openSseStream("/events", { onMessage: (m) => messages.push(m), onError });

    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(messages[0].type).toBe("connection_state_changed");
    expect(messages[0].data).toEqual({ status: "connected" });
  });

  it("reassembles frames split across chunk boundaries", async () => {
    stubFetchOk(
      streamFromChunks([
        'data: {"type":"connection_state_chan',
        'ged","data":{"status":"connected"}}\n',
        '\ndata: {"type":"message_received","data":{"id":"abc"}}\n\n',
      ]),
    );
    const messages: SseMessage[] = [];

    openSseStream("/events", { onMessage: (m) => messages.push(m) });

    await vi.waitFor(() => expect(messages).toHaveLength(2));
    expect(messages[0].type).toBe("connection_state_changed");
    expect(messages[1].type).toBe("message_received");
  });

  it("ignores comment lines and comment-only frames", async () => {
    stubFetchOk(
      streamFromChunks([
        ': connected\n\n: keepalive\ndata: {"type":"ping","data":{}}\n\n:\n\n',
      ]),
    );
    const messages: SseMessage[] = [];

    openSseStream("/events", { onMessage: (m) => messages.push(m) });

    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(messages[0].type).toBe("ping");
  });

  it("joins multi-line data fields with newlines", async () => {
    stubFetchOk(
      streamFromChunks(['data: {"type":"multi",\ndata: "data":{"k":1}}\n\n']),
    );
    const messages: SseMessage[] = [];

    openSseStream("/events", { onMessage: (m) => messages.push(m) });

    await vi.waitFor(() => expect(messages).toHaveLength(1));
    expect(messages[0].type).toBe("multi");
    expect(messages[0].data).toEqual({ k: 1 });
  });

  it("passes the Authorization header and calls onOpen with the response", async () => {
    const fetchMock = stubFetchOk(streamFromChunks([]));
    const onOpen = vi.fn();

    openSseStream("/events", {
      token: "tok-123",
      onOpen,
      onMessage: () => {},
    });

    await vi.waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    const [, requestInit] = fetchMock.mock.calls[0];
    expect((requestInit?.headers as Record<string, string>).Authorization).toBe(
      "Bearer tok-123",
    );
  });

  it("omits the Authorization header when no token is given", async () => {
    const fetchMock = stubFetchOk(streamFromChunks([]));

    openSseStream("/events", { onMessage: () => {} });

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit?.headers).toEqual({});
  });

  it("calls onError when fetch rejects", async () => {
    const boom = new Error("network down");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw boom;
      }),
    );
    const onError = vi.fn();

    openSseStream("/events", { onMessage: () => {}, onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith(boom));
  });

  it("calls onError when the response is not ok", async () => {
    stubFetchOk(null, { status: 500 });
    const onError = vi.fn();

    openSseStream("/events", { onMessage: () => {}, onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("calls onError when the stream ends", async () => {
    stubFetchOk(streamFromChunks([]));
    const onError = vi.fn();

    openSseStream("/events", { onMessage: () => {}, onError });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });

  it("close aborts the fetch, is idempotent, and stays silent after close", async () => {
    // A live stream: one chunk delivered, never closes on its own.
    const encoder = new TextEncoder();
    const liveStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"type":"ping","data":{}}\n\n'),
        );
        // intentionally never close() — simulates an open SSE connection
      },
    });
    const fetchMock = stubFetchOk(liveStream);
    const messages: SseMessage[] = [];
    const onError = vi.fn();

    const close = openSseStream("/events", {
      onMessage: (m) => messages.push(m),
      onError,
    });

    await vi.waitFor(() => expect(messages).toHaveLength(1));

    const [, requestInit] = fetchMock.mock.calls[0];
    const signal = (requestInit as RequestInit & { signal: AbortSignal })
      .signal;

    close();
    close(); // idempotent — must not throw or double-abort

    expect(signal.aborted).toBe(true);
    // Give any pending async rejection a chance to surface...
    await new Promise((resolve) => setTimeout(resolve, 20));
    // ...the abort must be silent: no onError after an explicit close.
    expect(onError).not.toHaveBeenCalled();
  });
});
