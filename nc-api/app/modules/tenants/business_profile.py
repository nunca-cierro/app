"""Business profile validation for tenants (task 5).

A ``Tenant.business_profile`` is a flat dict whose keys MUST match the
template placeholder vocabulary (single source of truth:
``app/modules/agents/templates.PLACEHOLDER_KEYS``). This module validates at
the API boundary:

- unknown keys are DROPPED (spec edge case: extra keys silently ignored),
- known keys MUST hold string values (an int/None breaks prompt building),
- the result is a normalized dict ready to store.

Together with ``Tenant.category`` canonicalization, a new tenant configures
name, city (location), schedule, services (per template), tone and CTA
(``business_cta``) without touching code.
"""

from __future__ import annotations

from typing import Any, Optional

from app.modules.agents.templates import PLACEHOLDER_KEYS

# Keys a tenant profile may carry — exactly the placeholder vocabulary.
BUSINESS_PROFILE_KEYS: set[str] = PLACEHOLDER_KEYS


def validate_business_profile(profile: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
    """Validate and normalize a tenant ``business_profile`` dict.

    Args:
        profile: Raw profile from the API, or ``None``.

    Returns:
        The normalized profile (only known keys, all string values), or ``None``.

    Raises:
        ValueError: when a known key holds a non-string value, or the input
            is not a dict/None.
    """
    if profile is None:
        return None
    if not isinstance(profile, dict):
        raise ValueError("business_profile must be a JSON object")

    normalized: dict[str, Any] = {}
    for key, value in profile.items():
        if key not in BUSINESS_PROFILE_KEYS:
            continue  # unknown keys are silently ignored
        if not isinstance(value, str):
            raise ValueError(f"business_profile.{key} must be a string")
        normalized[key] = value
    return normalized
