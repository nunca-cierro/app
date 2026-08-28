"""Tests for PaymentStatusRequest schema."""

from __future__ import annotations

import pytest

from app.modules.tenants.schemas import PaymentStatusRequest


class TestPaymentStatusRequest:
    """PaymentStatusRequest schema validation."""

    @pytest.mark.asyncio
    async def test_active_status_is_valid(self):
        """Setting payment_status to 'active' is valid."""
        req = PaymentStatusRequest(payment_status="active")
        assert req.payment_status == "active"

    @pytest.mark.asyncio
    async def test_inactive_status_is_valid(self):
        """Setting payment_status to 'inactive' is valid."""
        req = PaymentStatusRequest(payment_status="inactive")
        assert req.payment_status == "inactive"

    @pytest.mark.asyncio
    async def test_invalid_status_raises_validation_error(self):
        """An invalid payment_status value raises a Pydantic validation error."""
        with pytest.raises(Exception):  # Pydantic ValidationError
            PaymentStatusRequest(payment_status="pending")
