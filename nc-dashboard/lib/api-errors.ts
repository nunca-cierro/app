/**
 * Friendly API error messages (T6).
 *
 * The raw response body was previously surfaced verbatim (ApiError.message =
 * raw JSON like `{"detail":"Operation not permitted"}`), which leaked
 * backend JSON into user-facing toasts. This module maps common backend
 * details to readable Spanish messages (the app's UI language), keeps
 * already-readable server details (e.g. 409 slug conflicts), and falls back
 * to a generic message so raw JSON NEVER reaches the user. The raw body is
 * still logged via console.error in apiClient for debugging.
 */

const KNOWN_DETAILS: Record<string, string> = {
  // deps.RoleChecker + tenants client field-restriction (T1)
  "Operation not permitted": "No tenés permisos para esta acción",
  "Forbidden": "No tenés permisos para esta acción",
  // auth failures — session is dead, re-login
  "Not authenticated": "Tu sesión expiró. Volvé a iniciar sesión.",
  "Invalid or expired token": "Tu sesión expiró. Volvé a iniciar sesión.",
  "Invalid token": "Tu sesión expiró. Volvé a iniciar sesión.",
  "User not found": "Tu sesión expiró. Volvé a iniciar sesión.",
  // generic server errors → generic user message
  "Internal Server Error": "Ocurrió un error. Intenta de nuevo.",
};

/**
 * Pull a readable `detail` out of a FastAPI error body, if there is one.
 * Returns null for non-JSON, JSON without `detail`, or empty details.
 */
export function extractErrorDetail(rawBody: string): string | null {
  if (!rawBody) return null;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "detail" in parsed
    ) {
      const detail = (parsed as { detail: unknown }).detail;
      if (typeof detail === "string" && detail.trim()) return detail;
      if (Array.isArray(detail)) {
        // FastAPI validation errors: [{loc, msg, type}, ...]
        const msgs = detail
          .map((entry) => {
            if (
              entry &&
              typeof entry === "object" &&
              "msg" in entry &&
              typeof (entry as { msg: unknown }).msg === "string"
            ) {
              return (entry as { msg: string }).msg;
            }
            return "";
          })
          .filter(Boolean);
        return msgs.length > 0 ? msgs.join("; ") : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Map an API failure (status + raw body) to a user-friendly message.
 */
export function friendlyErrorMessage(status: number, rawBody: string): string {
  const detail = extractErrorDetail(rawBody);
  if (detail && KNOWN_DETAILS[detail]) return KNOWN_DETAILS[detail];
  if (detail) return detail; // already-readable server message

  const trimmed = rawBody.trim();
  if (trimmed && !trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return trimmed; // plain-text server error (e.g. proxy "Bad Gateway")
  }

  if (status === 422) return "Verifica los datos ingresados.";
  return "Ocurrió un error. Intenta de nuevo.";
}