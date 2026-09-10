# Plan Catalog Specification

## Purpose

Catálogo de marketing de planes coherente con el código: precios Escenario A ("Desde ... + IVA"), card Corporativo "A cotizar" (marketing-only), corrección de la fila falsa de la landing y sincronización de docs. Sin cambios en planes backend. Spec completo — no existe spec previa.

## Requirements

### Requirement: ScenarioAPricing

El catálogo MUST mostrar precios Escenario A con framing exacto "Desde $X/mes + IVA": Básico $390K, Profesional $790K, Empresarial $1.590K. Piso anti-undercut: MUST NOT mostrar ningún precio menor a $390K. Los precios MUST ser copy (strings) — no aritmética en runtime.

| Plan | Precio |
|---|---|
| basic | "Desde $390K/mes + IVA" |
| professional | "Desde $790K/mes + IVA" |
| enterprise | "Desde $1.590K/mes + IVA" |

#### Scenario: BasicPriceDisplay

- GIVEN el card del plan Básico
- WHEN se renderiza
- THEN muestra "Desde $390K/mes + IVA"

#### Scenario: ProfessionalAndEnterpriseDisplay

- GIVEN los cards Profesional y Empresarial
- WHEN se renderizan
- THEN muestran "Desde $790K/mes + IVA" y "Desde $1.590K/mes + IVA"

#### Scenario: NoUndercutFloor

- GIVEN cualquier superficie de pricing del producto
- WHEN se auditan los precios visibles
- THEN ninguno es menor a $390K ni omite "+ IVA"

### Requirement: CorporateMarketingCard

El catálogo MUST incluir una card "Corporativo" etiquetada "A cotizar" (~$3.5M de referencia), SOLO marketing. MUST NOT ser activable en el flujo de pago: sin QR, sin entrada en `SUPPORTED_PLANS`, sin cambios en la regex de `ActivatePlanRequest`, sin entrada en el mapa de QR. El CTA SHOULD llevar a cotización/contacto.

#### Scenario: CorporateCardVisibleGated

- GIVEN las cards de planes
- WHEN se renderiza Corporativo
- THEN muestra "A cotizar" con CTA de cotización, sin botón "Activar"

#### Scenario: CorporateNotInPaymentFlow

- GIVEN tenant en flujo de pago
- WHEN se cargan planes activables/QR
- THEN Corporativo no aparece ni tiene QR

#### Scenario: BackendPlansUntouched

- GIVEN la API de billing/planes
- WHEN se valida `SUPPORTED_PLANS` y la regex de `ActivatePlanRequest`
- THEN no incluyen "corporate" ni cambian

### Requirement: LandingCoherence

El catálogo MUST corregir la fila falsa de `site.ts` ("Acceso cliente: Empresarial = Editar + agregar"): el cliente es solo-lectura en cualquier plan; pro/enterprise MUST mostrar "Solo lectura". `planInfo` MUST NOT prometer capacidades que el código no otorga (modelo de IA por plan, IA en Básico). `trialInfo` MUST seguir describiendo respuestas programadas (sin IA).

#### Scenario: ClientAccessRowFixed

- GIVEN la tabla comparativa de `site.ts`
- WHEN se lee la fila "Acceso cliente"
- THEN enterprise muestra "Solo lectura", no "Editar + agregar"

#### Scenario: NoAiPromiseOnBasic

- GIVEN el copy de Básico en UI/landing
- WHEN se audita contra el gate real (basic sin `CAP_AI`)
- THEN ningún copy promete IA en Básico/Prueba

#### Scenario: TrialRemainsProgrammed

- GIVEN `trialInfo` en site.ts
- WHEN se renderiza
- THEN describe FAQ programado, sin IA

### Requirement: PricingDocsSync

`docs/strategy/plan-de-negocio.md` MUST reflejar Escenario A ("Desde ... + IVA") y Corporativo "A cotizar", reemplazando los precios stale ($60K/$120K/$250K).

#### Scenario: DocPricingUpdated

- GIVEN `plan-de-negocio.md`
- WHEN se lee la tabla de precios
- THEN muestra Escenario A; no quedan $60K/$120K/$250K

## Acceptance Criteria

| Criterio | Test |
|---|---|
| Precios Escenario A en cards | `plan-card.test.ts` (extendido, Vitest) |
| Corporativo gated, fuera de pago/QR | `payment-screen.test.ts`, `plans.test.ts` |
| Fila "Acceso cliente" corregida | test de landing/`site.ts` (nuevo) |
| Copy sin promesa de IA en Básico | `capabilities.test.ts` + audit de copy |
| Docs en Escenario A | revisión manual (no unit test) |