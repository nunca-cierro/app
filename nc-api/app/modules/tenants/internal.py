"""Internal-tenant detection — payment exemption driven by configuration.

The product's own tenant (default slug ``nuncacierro``) is exempt from
payment enforcement. Instead of hardcoding the slug across auth/tenants/handler
modules, every call site delegates to :func:`is_internal_tenant` with the
configured ``Settings.internal_tenant_slug``, so adapting the platform to
another business is a config change, not a code change.
"""

from __future__ import annotations

from typing import Optional


def is_internal_tenant(slug: Optional[str], internal_tenant_slug: Optional[str]) -> bool:
    """True when *slug* matches the configured internal tenant.

    Safe fallback: an empty/missing ``internal_tenant_slug`` exempts NOBODY,
    so an unconfigured deployment never accidentally grants payment freedom
    to a random tenant.
    """
    if not internal_tenant_slug:
        return False
    return slug == internal_tenant_slug
