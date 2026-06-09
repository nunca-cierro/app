"""Unit tests for PlaceholderResolver — pure function tests, no DB required."""

from __future__ import annotations

import copy

import pytest

from app.modules.agents.templates import PlaceholderResolver


# ── Fixtures ────────────────────────────────────────────────────────────────

FULL_PROFILE = {
    "business_name": "La Casa de las Arepas",
    "business_description": "Restaurante de comida tradicional colombiana",
    "business_schedule": "Lun–Sáb 8:00–22:00, Dom 9:00–18:00",
    "business_phone": "+57 300 123 4567",
    "business_location": "Calle 45 #23-12, Bogotá",
    "business_website": "https://lacasaarepas.com",
    "business_social": "@lacasaarepas",
}

PARTIAL_PROFILE = {
    "business_name": "Panadería El Trigal",
    "business_schedule": "Lun–Dom 6:00–21:00",
}

EMPTY_PROFILE: dict = {}

CONTENT_WITH_PLACEHOLDERS = {
    "instructions": "Eres un asistente para {{business_name}}.",
    "business_info": {
        "name": "{{business_name}}",
        "description": "{{business_description}}",
        "schedule": "{{business_schedule}}",
        "phone": "{{business_phone}}",
        "location": "{{business_location}}",
        "website": "{{business_website}}",
        "social": "{{business_social}}",
    },
    "products_services": [
        {"name": "Arepa tradicional", "price": "5000", "duration": ""},
        {"name": "Jugo natural", "price": "3000", "duration": ""},
    ],
    "faq": [
        {
            "question": "¿Cuál es el horario?",
            "answer": "Abrimos {{business_schedule}}. ¡Te esperamos!",
        },
        {
            "question": "¿Dónde están ubicados?",
            "answer": "Estamos en {{business_location}}. También puedes llamarnos al {{business_phone}}.",
        },
    ],
    "tone": "amigable y profesional",
    "keywords_to_escalate": ["queja", "reclamo"],
    "fallback_message": "Un asesor te ayudará en breve.",
}

CONTENT_NO_PLACEHOLDERS = {
    "instructions": "Eres un asistente de atención al cliente.",
    "business_info": {
        "name": "Mi Negocio",
        "schedule": "Lun–Vie 9:00–18:00",
    },
    "products_services": [],
    "faq": [],
    "tone": "profesional",
}

NESTED_LIST_CONTENT = {
    "instructions": "Bienvenido a {{business_name}}.",
    "faq": [
        {"question": "Horarios", "answer": "Abrimos {{business_schedule}}."},
        {"question": "Teléfono", "answer": "Llama al {{business_phone}}."},
    ],
}


# ── Tests ───────────────────────────────────────────────────────────────────


class TestPlaceholderResolver:
    """Tests for PlaceholderResolver.resolve()."""

    def test_all_placeholders_resolve_from_full_profile(self):
        """All 7 placeholders are replaced when profile has all keys."""
        resolved = PlaceholderResolver.resolve(
            CONTENT_WITH_PLACEHOLDERS, FULL_PROFILE
        )

        # Instructions
        assert (
            resolved["instructions"]
            == "Eres un asistente para La Casa de las Arepas."
        )

        # Business info
        assert resolved["business_info"]["name"] == "La Casa de las Arepas"
        assert (
            resolved["business_info"]["description"]
            == "Restaurante de comida tradicional colombiana"
        )
        assert (
            resolved["business_info"]["schedule"]
            == "Lun–Sáb 8:00–22:00, Dom 9:00–18:00"
        )
        assert resolved["business_info"]["phone"] == "+57 300 123 4567"
        assert resolved["business_info"]["location"] == "Calle 45 #23-12, Bogotá"
        assert resolved["business_info"]["website"] == "https://lacasaarepas.com"
        assert resolved["business_info"]["social"] == "@lacasaarepas"

        # FAQ placeholders
        assert (
            "Abrimos Lun–Sáb 8:00–22:00, Dom 9:00–18:00. ¡Te esperamos!"
            in resolved["faq"][0]["answer"]
        )
        assert (
            "Estamos en Calle 45 #23-12, Bogotá"
            in resolved["faq"][1]["answer"]
        )
        assert (
            "+57 300 123 4567" in resolved["faq"][1]["answer"]
        )

        # Non-placeholder content preserved
        assert resolved["tone"] == "amigable y profesional"
        assert resolved["keywords_to_escalate"] == ["queja", "reclamo"]
        assert resolved["products_services"][0]["name"] == "Arepa tradicional"

    def test_partial_profile_resolves_known_cleans_unknown(self):
        """Only populated profile keys resolve; missing keys become empty string."""
        resolved = PlaceholderResolver.resolve(
            CONTENT_WITH_PLACEHOLDERS, PARTIAL_PROFILE
        )

        # Known keys resolve
        assert (
            resolved["business_info"]["name"] == "Panadería El Trigal"
        )
        assert (
            resolved["business_info"]["schedule"] == "Lun–Dom 6:00–21:00"
        )

        # Missing keys become empty string
        assert resolved["business_info"]["description"] == ""
        assert resolved["business_info"]["phone"] == ""
        assert resolved["business_info"]["location"] == ""
        assert resolved["business_info"]["website"] == ""
        assert resolved["business_info"]["social"] == ""

    def test_null_profile_cleans_all_placeholders(self):
        """When profile is None, every placeholder becomes empty string."""
        resolved = PlaceholderResolver.resolve(
            CONTENT_WITH_PLACEHOLDERS, None
        )

        # All placeholders cleaned
        assert resolved["instructions"] == "Eres un asistente para ."
        assert resolved["business_info"]["name"] == ""
        assert resolved["business_info"]["description"] == ""
        assert resolved["business_info"]["schedule"] == ""
        assert resolved["faq"][0]["answer"] == "Abrimos . ¡Te esperamos!"

    def test_empty_dict_profile_cleans_all_placeholders(self):
        """When profile is empty dict, every placeholder becomes empty string."""
        resolved = PlaceholderResolver.resolve(
            CONTENT_WITH_PLACEHOLDERS, EMPTY_PROFILE
        )

        assert resolved["business_info"]["name"] == ""
        assert resolved["business_info"]["schedule"] == ""

    def test_no_placeholders_is_noop(self):
        """Content without placeholders passes through unchanged."""
        original = copy.deepcopy(CONTENT_NO_PLACEHOLDERS)
        resolved = PlaceholderResolver.resolve(original, FULL_PROFILE)

        assert resolved == original

    def test_extra_profile_keys_are_ignored(self):
        """Profile keys that don't match any placeholder are silently ignored."""
        profile_with_extra = {
            **FULL_PROFILE,
            "extra_key": "should be ignored",
            "another_extra": 42,
        }
        resolved = PlaceholderResolver.resolve(
            CONTENT_WITH_PLACEHOLDERS, profile_with_extra
        )

        assert resolved["business_info"]["name"] == "La Casa de las Arepas"
        # No error, extra keys just unused

    def test_nested_dicts_resolve_recursively(self):
        """Placeholders in nested dict values are resolved."""
        resolved = PlaceholderResolver.resolve(
            NESTED_LIST_CONTENT, FULL_PROFILE
        )

        assert (
            resolved["faq"][0]["answer"]
            == "Abrimos Lun–Sáb 8:00–22:00, Dom 9:00–18:00."
        )
        assert resolved["faq"][1]["answer"] == "Llama al +57 300 123 4567."

    def test_lists_are_resolved_recursively(self):
        """Placeholders inside list items are resolved."""
        content = {
            "menu": [
                {"name": "{{business_name}} special"},
                {"name": "Item sin placeholder"},
            ]
        }
        resolved = PlaceholderResolver.resolve(content, FULL_PROFILE)

        assert resolved["menu"][0]["name"] == "La Casa de las Arepas special"
        assert resolved["menu"][1]["name"] == "Item sin placeholder"

    def test_non_string_values_pass_through(self):
        """Numbers, booleans, and None values are not touched."""
        content = {
            "count": 42,
            "enabled": True,
            "threshold": None,
            "prices": [1000, 2000, 3000],
        }
        resolved = PlaceholderResolver.resolve(content, FULL_PROFILE)

        assert resolved["count"] == 42
        assert resolved["enabled"] is True
        assert resolved["threshold"] is None
        assert resolved["prices"] == [1000, 2000, 3000]

    def test_original_template_is_not_mutated(self):
        """resolve() does a deep copy — original template is untouched."""
        original = copy.deepcopy(CONTENT_WITH_PLACEHOLDERS)
        PlaceholderResolver.resolve(CONTENT_WITH_PLACEHOLDERS, FULL_PROFILE)

        # Original should have all placeholders intact
        assert "{{business_name}}" in original["instructions"]
        assert "{{business_schedule}}" in original["business_info"]["schedule"]
        assert "{{business_phone}}" in original["faq"][1]["answer"]

    def test_resolve_string_directly(self):
        """resolve_string handles a single string with placeholders."""
        result = PlaceholderResolver.resolve_string(
            "Visítanos en {{business_location}} o llama al {{business_phone}}.",
            FULL_PROFILE,
        )
        assert result == (
            "Visítanos en Calle 45 #23-12, Bogotá o llama al +57 300 123 4567."
        )

    def test_resolve_string_no_placeholders(self):
        """resolve_string returns the string unchanged if no placeholders."""
        result = PlaceholderResolver.resolve_string(
            "Texto sin placeholders.", FULL_PROFILE
        )
        assert result == "Texto sin placeholders."

    def test_resolve_string_empty_profile(self):
        """resolve_string cleans placeholders to empty string with empty profile."""
        result = PlaceholderResolver.resolve_string(
            "Hola {{business_name}}!", {}
        )
        assert result == "Hola !"
