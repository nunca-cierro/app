import { describe, expect, it } from "vitest";
import {
  isConnectionStateChanged,
  parseSseMessage,
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
