"""Tests for the encryption module — Fernet wrapper with ENCRYPTION_KEY."""

from __future__ import annotations

import os

import pytest

# Ensure key is set before importing the module
os.environ.setdefault("ENCRYPTION_KEY", "dGhpcyBpcyBhIDE2LWJ5dGUgZXhhbXBsZSBrZXkgISE=")

from app.core.encryption import encrypt, decrypt


class TestEncryptionRoundtrip:
    """Encrypt → decrypt should return the original data."""

    def test_dict_roundtrip(self) -> None:
        data = {"bot_token": "12345:ABC", "webhook_url": "https://example.com/hook"}
        encrypted = encrypt(data)
        assert encrypted != str(data), "encrypted text should differ from plaintext"
        decrypted = decrypt(encrypted)
        assert decrypted == data

    def test_empty_dict(self) -> None:
        data: dict = {}
        encrypted = encrypt(data)
        decrypted = decrypt(encrypted)
        assert decrypted == data

    def test_nested_dict(self) -> None:
        data = {"inner": {"key": "value", "count": 42}}
        encrypted = encrypt(data)
        decrypted = decrypt(encrypted)
        assert decrypted == data

    def test_string_value(self) -> None:
        data = "just a plain string"
        encrypted = encrypt(data)
        decrypted = decrypt(encrypted)
        assert decrypted == data

    def test_none_value(self) -> None:
        encrypted = encrypt(None)  # type: ignore[arg-type]
        decrypted = decrypt(encrypted)
        assert decrypted is None


class TestEncryptionEdgeCases:
    """Boundary and error conditions."""

    def test_encrypted_output_is_string(self) -> None:
        data = {"foo": "bar"}
        encrypted = encrypt(data)
        assert isinstance(encrypted, str)

    def test_decrypt_none_raises(self) -> None:
        with pytest.raises(Exception):
            decrypt(None)  # type: ignore[arg-type]

    def test_decrypt_empty_string_raises(self) -> None:
        with pytest.raises(Exception):
            decrypt("")


class TestEncryptionKeyMissing:
    """Behaviour when ENCRYPTION_KEY is not set."""

    def test_import_succeeds_without_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """The module can be imported without ENCRYPTION_KEY (lazy init)."""
        monkeypatch.delenv("ENCRYPTION_KEY", raising=False)
        import importlib
        import app.core.encryption as encryption_module  # noqa: F811

        # Should NOT raise — import is safe
        importlib.reload(encryption_module)

    def test_encrypt_raises_without_key(self, monkeypatch: pytest.MonkeyPatch) -> None:
        """Calling encrypt() without ENCRYPTION_KEY raises ValueError."""
        monkeypatch.delenv("ENCRYPTION_KEY", raising=False)
        import importlib
        import app.core.encryption as encryption_module  # noqa: F811

        importlib.reload(encryption_module)
        expected = "ENCRYPTION_KEY environment variable is not set"
        with pytest.raises(ValueError, match=expected):
            encryption_module.encrypt({"test": "data"})



