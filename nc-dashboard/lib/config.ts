/* ------------------------------------------------------------------ */
/*  Application configuration                                          */
/* ------------------------------------------------------------------ */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL
  ?? process.env.NEXT_PUBLIC_API_URL_LOCAL
  ?? "http://localhost:8000";
