"""CSRF double-submit dependency — Slice B (spec AS-5).

Protects state-changing requests (POST/PUT/PATCH/DELETE) that are
authenticated by the ``nc_access_token`` session cookie. The browser echoes
the non-httpOnly ``nc_csrf`` cookie value back in the ``X-CSRF-Token``
header; the API compares both with a constant-time compare.

Skip rules (defense in depth — SameSite=Lax is the primary layer):
- Safe methods GET/HEAD/OPTIONS are never checked (keeps SSE streams and
  silent-restore reads working).
- Requests WITHOUT the ``nc_access_token`` cookie are exempt: login/register
  (no session yet) and Bearer-header tooling/scripts never carry the cookie,
  so CSRF does not apply to them.
"""

from __future__ import annotations

import secrets

from fastapi import HTTPException, Request, status

ACCESS_TOKEN_COOKIE = "nc_access_token"
CSRF_COOKIE = "nc_csrf"
CSRF_HEADER = "X-CSRF-Token"

_SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})


async def require_csrf(request: Request) -> None:
    """Router-level dependency: enforce the double-submit CSRF check.

    Returns ``None`` (allows the request) when the method is safe, the
    session cookie is absent, or the CSRF header matches the cookie.
    Raises 403 on missing/mismatched tokens for cookie-authenticated
    mutations.
    """
    if request.method in _SAFE_METHODS:
        return
    if ACCESS_TOKEN_COOKIE not in request.cookies:
        return  # login/register/Bearer tooling — no cookie session

    cookie_value = request.cookies.get(CSRF_COOKIE)
    header_value = request.headers.get(CSRF_HEADER)
    if (
        not cookie_value
        or not header_value
        or not secrets.compare_digest(cookie_value, header_value)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="CSRF token missing/mismatch",
        )