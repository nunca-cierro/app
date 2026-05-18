"""Fernet symmetric encryption — encrypt/decrypt using ENCRYPTION_KEY env var.

Usage::

    from app.core.encryption import encrypt, decrypt

    ciphertext = encrypt({"bot_token": "..."})
    plaintext = decrypt(ciphertext)   # → {"bot_token": "..."}
"""

from __future__ import annotations

import json
import os

from cryptography.fernet import Fernet


def _get_key() -> bytes:
    """Retrieve the Fernet key from ``ENCRYPTION_KEY`` env var.

    The key MUST be a 32-byte URL-safe base64-encoded string
    (generated via ``cryptography.fernet.Fernet.generate_key()``).

    Raises:
        ValueError: If the env var is missing or invalid.
    """
    raw = os.environ.get("ENCRYPTION_KEY")
    if not raw:
        msg = "ENCRYPTION_KEY environment variable is not set"
        raise ValueError(msg)
    # Fernet validates the key format internally; let it raise if invalid
    return raw.encode("utf-8")


_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    """Lazy-init the Fernet instance so the module can be imported
    without ``ENCRYPTION_KEY`` being set.  The ``ValueError`` is only
    raised when encryption/decryption is actually attempted."""
    global _fernet  # noqa: PLW0603
    if _fernet is None:
        _fernet = Fernet(_get_key())
    return _fernet


def encrypt(data: object) -> str:
    """Encrypt *data* (must be JSON-serializable) and return a Fernet token string.

    Args:
        data: Any JSON-serializable Python object (dict, list, str, None, …).

    Returns:
        A URL-safe base64-encoded Fernet token (``str``).
    """
    payload = json.dumps(data, ensure_ascii=False).encode("utf-8")
    token = _get_fernet().encrypt(payload)
    return token.decode("utf-8")


def decrypt(token: str) -> object:
    """Decrypt a Fernet token back to the original Python object.

    Args:
        token: The Fernet token string returned by :func:`encrypt`.

    Returns:
        The original Python object.

    Raises:
        cryptography.fernet.InvalidToken: If the token is invalid or tampered.
    """
    payload = _get_fernet().decrypt(token.encode("utf-8"))
    return json.loads(payload.decode("utf-8"))
