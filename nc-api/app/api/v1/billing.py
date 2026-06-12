"""Billing endpoints — payment info for the frontend."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.modules.auth.deps import get_current_user
from app.modules.auth.models import User
from app.modules.tenants.schemas import BillingInfoResponse, PaymentMethod

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/payment-info", response_model=BillingInfoResponse)
async def get_payment_info(
    current_user: User = Depends(get_current_user),
) -> BillingInfoResponse:
    """Return platform-wide payment info (QR URLs, methods, account holder).

    All authenticated users can access this. The QR URLs are relative paths
    the frontend resolves from its own origin.
    """
    return BillingInfoResponse(
        qr_urls={
            "basic": "/payment/QRBasico.jpeg",
            "professional": "/payment/QRProfesional.jpeg",
            "enterprise": "/payment/QREmpresarial.jpeg",
        },
        methods=[
            PaymentMethod(
                name="Bre-B",
                number=settings.payment_breb_number,
                logo="/payment/breb-logo.png",
            ),
        ],
        account_holder=settings.payment_account_holder,
    )
