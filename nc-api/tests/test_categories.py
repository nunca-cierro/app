"""Unit tests for the shared business-category registry (canonical slugs + aliases).

The registry is the single source of truth for category vocabulary across
agent templates (backend) and landing demos (frontend mirror). Aliases let
legacy slugs and display labels map to canonical slugs without data changes.
"""

from __future__ import annotations

from app.modules.agents.categories import (
    BUSINESS_CATEGORIES,
    TEMPLATE_CATEGORIES,
    canonicalize_category,
    category_label,
    is_known_category,
)


class TestCategoryRegistry:
    def test_registry_covers_template_categories(self) -> None:
        assert BUSINESS_CATEGORIES["restaurante"] == "Restaurante"
        assert BUSINESS_CATEGORIES["panaderia"] == "Panadería"
        assert BUSINESS_CATEGORIES["hamburgueseria"] == "Hamburguesería"
        assert BUSINESS_CATEGORIES["barberia"] == "Barbería"
        assert BUSINESS_CATEGORIES["clinica"] == "Clínica"

    def test_template_categories_are_subset_of_registry(self) -> None:
        for slug in TEMPLATE_CATEGORIES:
            assert slug in BUSINESS_CATEGORIES

    def test_registry_labels_are_unique_and_non_empty(self) -> None:
        labels = list(BUSINESS_CATEGORIES.values())
        assert len(labels) == len(set(labels))
        assert all(labels)

    def test_demo_categories_are_known(self) -> None:
        # Categories shipped by the landing demos (display labels) all map to a slug.
        for label in ["Restaurante", "Barbería", "Belleza", "Dental", "Gimnasio", "Spa"]:
            assert is_known_category(canonicalize_category(label))


class TestCanonicalizeCategory:
    def test_canonical_slug_passes_through(self) -> None:
        assert canonicalize_category("restaurante") == "restaurante"

    def test_legacy_demo_key_aliases(self) -> None:
        assert canonicalize_category("restaurante-elite") == "restaurante"
        assert canonicalize_category("barberia-clasica") == "barberia"
        assert canonicalize_category("beauty-studio") == "belleza"
        assert canonicalize_category("gym-performance") == "gimnasio"
        assert canonicalize_category("spa-serenity") == "spa"
        assert canonicalize_category("clinica-dental-pro") == "clinica"

    def test_english_slug_aliases(self) -> None:
        assert canonicalize_category("restaurant") == "restaurante"
        assert canonicalize_category("beauty") == "belleza"
        assert canonicalize_category("gym") == "gimnasio"
        assert canonicalize_category("dental") == "clinica"

    def test_display_labels_normalize_to_slug(self) -> None:
        assert canonicalize_category("Restaurante") == "restaurante"
        assert canonicalize_category("Barbería") == "barberia"
        assert canonicalize_category("Clínica Dental") == "clinica"
        assert canonicalize_category("Hamburguesería") == "hamburgueseria"

    def test_unknown_value_is_kept_unchanged(self) -> None:
        # Non-breaking: custom/unknown categories survive canonicalization.
        assert canonicalize_category("mi-rubro-custom") == "mi-rubro-custom"

    def test_none_and_empty(self) -> None:
        assert canonicalize_category(None) is None
        assert canonicalize_category("") == ""


class TestCategoryHelpers:
    def test_is_known_category(self) -> None:
        assert is_known_category("restaurante") is True
        assert is_known_category("gimnasio") is True
        assert is_known_category("mi-rubro-custom") is False
        assert is_known_category("") is False

    def test_category_label(self) -> None:
        assert category_label("restaurante") == "Restaurante"
        assert category_label("unknown-slug") is None
