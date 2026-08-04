# Adaptar templates a otro negocio

La plataforma ya separa el contenido reutilizable del negocio concreto. Para
adaptar una instalación, se configura el perfil del tenant y se conserva el
seed de templates de sistema; no hace falta copiar prompts ni editar el flujo
de cada agente.

## Ruta rápida

1. Define `INTERNAL_TENANT_SLUG` con el slug del tenant interno de la instalación.
2. Crea o actualiza `Tenant.business_profile` usando los placeholders soportados.
3. Ejecuta `uv run python -m app.seed` después de modificar templates de sistema.
4. Verifica con `pytest` y `pnpm test` los tests de templates y categorías.

## Placeholders

El perfil acepta únicamente estas claves:

| Clave | Uso |
| --- | --- |
| `business_name` | Nombre visible del negocio |
| `business_description` | Descripción breve |
| `business_schedule` | Horarios de atención |
| `business_phone` | Teléfono de contacto |
| `business_location` | Dirección o zona |
| `business_website` | Sitio web |
| `business_social` | Red social |
| `business_cta` | Llamado a la acción, por ejemplo WhatsApp |

Las claves desconocidas se descartan en la validación del perfil. Los valores
conocidos deben ser strings. Los placeholders faltantes se resuelven como
cadena vacía al clonar un template.

## Templates y seed

- `SEED_TEMPLATES` contiene una sola plantilla de sistema por categoría.
- El seed actualiza únicamente filas con `is_system=True`.
- `--reset` elimina y recrea únicamente templates de sistema.
- Templates custom, incluso si comparten categoría y nombre, nunca son
  modificados ni eliminados por el seed.
- Categorías antiguas se comparan mediante aliases en lectura; no se reescriben
  datos existentes de forma destructiva.

Para agregar una categoría, registra el slug y label en los registros backend y
frontend, agrega un template de sistema y cubre el selector con un test.

## Fuera de esta fase

Esta adaptación no cambia proveedores LLM, la cola de Evolution, planes ni
pagos. Esas decisiones deben implementarse en fases independientes.
