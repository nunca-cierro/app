"""Shared business-category registry — single source of truth for category slugs.

Every business category in the product uses a canonical lowercase slug
(``restaurante``, ``barberia``, ``clinica``, ...). Agent templates and landing
demos must reference the same slugs so the dashboard selector, the seed, and
the demo gallery speak one vocabulary.

Aliases map legacy slugs (``restaurant``, ``beauty-studio``, ...) and display
labels (``Restaurante``, ``Clínica Dental``) to canonical slugs WITHOUT
touching stored data — canonicalization is applied at read time.

Adding a category = add ``slug: label`` here + a system template in
``SEED_TEMPLATES`` (see docs/business-creation-flow.md).
"""

from __future__ import annotations

import re
import unicodedata
from typing import Optional

# ── Canonical registry ───────────────────────────────────────────────────────
# slug -> display label. Keep labels unique and non-empty.
BUSINESS_CATEGORIES: dict[str, str] = {
    "restaurante": "Restaurante",
    "panaderia": "Panadería",
    "hamburgueseria": "Hamburguesería",
    "barberia": "Barbería",
    "clinica": "Clínica",
    "belleza": "Belleza",
    "gimnasio": "Gimnasio",
    "spa": "Spa",
}

# Categories that ship system templates in SEED_TEMPLATES (used by the
# dashboard template selector to show only categories with ready templates).
TEMPLATE_CATEGORIES: tuple[str, ...] = (
    "restaurante",
    "panaderia",
    "hamburgueseria",
    "barberia",
    "clinica",
)

# ── Aliases ───────────────────────────────────────────────────────────────────
# Legacy demo keys, english slugs and display labels -> canonical slug.
BUSINESS_CATEGORY_ALIASES: dict[str, str] = {
    # legacy demo keys (nc-dashboard/data/landing/demos)
    "restaurante-elite": "restaurante",
    "barberia-clasica": "barberia",
    "beauty-studio": "belleza",
    "gym-performance": "gimnasio",
    "spa-serenity": "spa",
    "clinica-dental-pro": "clinica",
    # english / alternate slugs
    "restaurant": "restaurante",
    "bakery": "panaderia",
    "burger": "hamburgueseria",
    "barbershop": "barberia",
    "barber": "barberia",
    "clinic": "clinica",
    "dental": "clinica",
    "beauty": "belleza",
    "gym": "gimnasio",
    # display labels (normalized without accents, lowercase)
    "restaurante": "restaurante",
    "panaderia": "panaderia",
    "hamburgueseria": "hamburgueseria",
    "barberia": "barberia",
    "clinica": "clinica",
    "clinica dental": "clinica",
    "clinica-dental": "clinica",
    "belleza": "belleza",
    "gimnasio": "gimnasio",
    "spa": "spa",
}

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _normalize(value: str) -> str:
    """Lowercase, strip accents, collapse non-alphanumerics to single dashes."""
    decomposed = unicodedata.normalize("NFKD", value)
    ascii_only = decomposed.encode("ascii", "ignore").decode("ascii")
    return _SLUG_RE.sub("-", ascii_only.lower()).strip("-")


def canonicalize_category(value: Optional[str]) -> Optional[str]:
    """Map any known alias/label to its canonical slug.

    Unknown values pass through unchanged (lowercased + normalized) so
    custom/legacy categories are never broken.
    """
    if value is None:
        return None
    normalized = _normalize(value)
    if not normalized:
        return ""
    return BUSINESS_CATEGORY_ALIASES.get(normalized, normalized)


def is_known_category(value: Optional[str]) -> bool:
    """True when *value* canonicalizes to a registered category slug."""
    canonical = canonicalize_category(value)
    return bool(canonical) and canonical in BUSINESS_CATEGORIES


def category_label(slug: Optional[str]) -> Optional[str]:
    """Display label for a canonical slug (or None if unknown)."""
    if slug is None:
        return None
    return BUSINESS_CATEGORIES.get(slug)
