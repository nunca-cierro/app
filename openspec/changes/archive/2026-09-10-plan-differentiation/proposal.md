# Proposal: plan-differentiation (diferenciación de planes)

## Intent

El sistema de planes no diferencia nada hoy: `PLAN_LIMITS` en `capabilities.py` es configuración MUERTA (`get_plan_limits()` no se llama en ningún endpoint), `Message` no registra el origen de la respuesta (ai/programmed/escalation), el frontend muestra precios STALE ($60K/$120K/$250K) y no existe medición de consumo. En el pivot mid-market B2B, el bot de ventas (`templates.py`) ya promete Escenario A y el producto no lo refleja. Este cambio expone límites reales, mide consumo de IA por mensaje y alinea precios/UI, SIN enforcement ni cobro (pago manual QR).

## Decisiones validadas por el owner (2026-09-10)

1. **Pricing Escenario A**: Básico "Desde $390K/mes + IVA", Profesional "Desde $790K/mes + IVA", Empresarial "Desde $1.590K/mes + IVA", Corporativo gated (~$3.5M). Piso anti-undercut $390K. Siempre "Desde" + "+ IVA".
2. **Trial**: se queda, respuestas programadas por FAQ únicamente. NO IA en trial/basic (costo cero, anti-micro).
3. **Al 100% del límite**: SOFT — se sigue sirviendo, el medidor muestra exceso y CTA a upgrade. Sin corte, sin auto-cobro (pago manual QR).
4. **Corporativo**: etiqueta de MARKETING ("A cotizar"), NO plan backend. Sin cambios en `SUPPORTED_PLANS` ni regex de billing.
5. **Métrica de uso**: contar **mensajes de respuesta generados por IA** por tenant por mes (message-level, no conversation-level). Widget: barra de progreso vs límite, CTA al llenarse, contadores del tenant activo, upgrade aumenta capacidad.

## Scope

### In Scope
- Exponer `PLAN_LIMITS` como límites realmente consumidos (getter usado por el endpoint de uso).
- Flag de origen en `Message` (`ai` | `programmed` | `escalation`) seteado en los 3 caminos outbound del handler.
- Endpoint `GET /plans/usage`: `{plan, limits, usage, pct, over_limit}` computado (respuestas IA del mes, productos, negocios). Informativo.
- Widget "Uso de tu plan" en el dashboard (barra, exceso, CTA upgrade, por tenant).
- Precios Escenario A en UI + card Corporativo marketing + corrección de fila falsa en `site.ts`.
- Migración de tenants soft (sin borrado; el medidor muestra exceso) + migración de doc de precios.

### Out of Scope
- Mover `CAP_AI` a basic/trial — la IA sigue desde professional. NO tocar el gate del handler por plan.
- Enforcement/cobro de límites, tabla de contadores, jobs mensuales (fase 2).
- Corporativo como enum real / cambios en `SUPPORTED_PLANS` o regex de `ActivatePlanRequest`.
- Degradación IA→FAQ al llegar al límite.

## Capabilities

### New Capabilities
- `plan-usage-metering`: límites efectivos por plan, flag de origen de mensaje, endpoint de uso y widget informativo.
- `plan-catalog`: precios Escenario A, card Corporativo marketing y coherencia de la landing.

### Modified Capabilities
- None (no existe spec previa de planes/billing; el gate de capacidades NO cambia).

## Approach

Backend aditivo: (a) `capabilities.py` deja de tener límites muertos — `get_plan_limits()` pasa a consumirse y se redefine `max_conversations_per_month` como respuestas IA/mes; (b) columna nullable `origin` en `Message` + Alembic, seteada en los tres `Message(...)` outbound del handler; (c) endpoint de uso con COUNTs acotados por tenant. Frontend informativo (sin lógica de cobro): widget, precios y card Corporativo. Todo bajo TDD.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `nc-api/app/modules/plans/capabilities.py` | Modified | Límites consumibles + semántica de métrica |
| `nc-api/app/modules/evolution/handler.py` | Modified | Setear `origin` en 3 outbounds |
| `nc-api/app/modules/conversations/models.py` | Modified | Columna `origin` + migración |
| `nc-api/app/api/v1/` (nuevo endpoint planes) | New | `GET /plans/usage` |
| `nc-dashboard/app/dashboard/page.tsx` + componente widget | New | "Uso de tu plan" |
| `nc-dashboard/app/dashboard/components/plan-card.tsx`, `lib/plans.ts` | Modified | Precios Escenario A + Corporativo |
| `nc-dashboard/data/site.ts`, `docs/strategy/plan-de-negocio.md` | Modified | Precios + fila falsa |

## Slice Plan (stacked-to-main, ≤400 líneas/PR)

1. **Limits reales**: `capabilities.py` + tests.
2. **Message origin**: modelo + migración + handler (3 caminos) + tests.
3. **Usage endpoint**: `GET /plans/usage` + tests.
4. **Dashboard widget**: componente + integración + tests. (4b si excede: precios/landing).
5. **Pricing + landing**: `plan-card.tsx`, `lib/plans.ts`, `site.ts`, card Corporativo + tests.
6. **Docs + archive**: `plan-de-negocio.md`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Precios stale en 4 lugares | High | Actualizar juntos en slice 5; `templates.py` ya está en Escenario A |
| Mensajes históricos sin `origin` → subconteo | Med | Backfill opcional; documentar que el medidor es forward-looking en v1 |
| Corporativo se filtra al flujo de pago | Med | Solo marketing; no tocar `SUPPORTED_PLANS`/regex |
| Deriva en definición de métrica | Med | Fijar "mensajes de respuesta IA/mes" en el spec |
| Slice 4 excede 400 líneas | Med | Separar widget (4) de precios/landing (4b) |

## Rollback Plan

Cambio aditivo: revertir el endpoint y el widget; la columna `origin` es nullable (drop migration sin pérdida); precios/UI son texto. Sin impacto en billing ni en datos de tenants. Revert por slice en orden inverso.

## Dependencies

- Decisiones del owner 2026-09-10 (arriba).
- `templates.py` ya codifica Escenario A (referencia de verdad).
- Bre-B / pago manual QR sin cambios.

## Success Criteria

- [ ] `GET /plans/usage` devuelve límites y uso real por tenant con `pct`/`over_limit`.
- [ ] `Message.origin` distingue ai/programmed/escalation en los 3 caminos.
- [ ] Widget muestra progreso, exceso y CTA por tenant; nunca bloquea.
- [ ] UI y docs muestran Escenario A ("Desde ... + IVA"); Corporativo "A cotizar".
- [ ] Sin cambios en `SUPPORTED_PLANS`, regex de billing ni gate de `CAP_AI`.
- [ ] Suite de tests verde (backend pytest + frontend Vitest).
