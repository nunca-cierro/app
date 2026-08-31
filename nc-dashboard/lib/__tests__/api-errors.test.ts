import { describe, expect, it } from "vitest";
import {
  extractErrorDetail,
  friendlyErrorMessage,
} from "@/lib/api-errors";

describe("extractErrorDetail (T6)", () => {
  it("extracts a string detail from a FastAPI error body", () => {
    expect(extractErrorDetail('{"detail":"Operation not permitted"}')).toBe(
      "Operation not permitted",
    );
  });

  it("joins FastAPI validation detail arrays into one message", () => {
    const body = JSON.stringify({
      detail: [
        { loc: ["body", "name"], msg: "field required", type: "missing" },
        { loc: ["body", "plan"], msg: "invalid plan", type: "value_error" },
      ],
    });
    expect(extractErrorDetail(body)).toBe("field required; invalid plan");
  });

  it("returns null for non-JSON bodies", () => {
    expect(extractErrorDetail("Bad Gateway")).toBeNull();
    expect(extractErrorDetail("")).toBeNull();
  });

  it("returns null for JSON without a detail key", () => {
    expect(extractErrorDetail('{"error":"boom"}')).toBeNull();
  });
});

describe("friendlyErrorMessage (T6 — no raw JSON to users)", () => {
  it("maps the raw 403 'Operation not permitted' to a friendly message", () => {
    expect(
      friendlyErrorMessage(403, '{"detail":"Operation not permitted"}'),
    ).toBe("No tenés permisos para esta acción");
  });

  it("maps 'Forbidden' to the same friendly permission message", () => {
    expect(friendlyErrorMessage(403, '{"detail":"Forbidden"}')).toBe(
      "No tenés permisos para esta acción",
    );
  });

  it("maps auth-failure details to a re-login message", () => {
    expect(friendlyErrorMessage(401, '{"detail":"Not authenticated"}')).toBe(
      "Tu sesión expiró. Volvé a iniciar sesión.",
    );
    expect(
      friendlyErrorMessage(401, '{"detail":"Invalid or expired token"}'),
    ).toBe("Tu sesión expiró. Volvé a iniciar sesión.");
  });

  it("keeps readable server details (e.g. 409 slug conflict)", () => {
    expect(
      friendlyErrorMessage(
        409,
        '{"detail":"Ya existe un negocio con ese nombre o slug."}',
      ),
    ).toBe("Ya existe un negocio con ese nombre o slug.");
  });

  it("maps 'Internal Server Error' to the generic message", () => {
    expect(
      friendlyErrorMessage(500, '{"detail":"Internal Server Error"}'),
    ).toBe("Ocurrió un error. Intenta de nuevo.");
  });

  it("falls back to a generic message for raw JSON without a readable detail", () => {
    expect(friendlyErrorMessage(500, '{"error":"boom"}')).toBe(
      "Ocurrió un error. Intenta de nuevo.",
    );
    expect(friendlyErrorMessage(500, "")).toBe("Ocurrió un error. Intenta de nuevo.");
  });

  it("gives a validation hint for 422 without a readable detail", () => {
    expect(friendlyErrorMessage(422, "")).toBe("Verifica los datos ingresados.");
  });

  it("passes through plain-text server errors (readable, not JSON)", () => {
    expect(friendlyErrorMessage(502, "Bad Gateway")).toBe("Bad Gateway");
  });
});