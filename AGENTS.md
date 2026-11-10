# AGENTS.md — Protocolo y Directrices para Agentes de IA en NuncaCierro

Este documento establece las reglas operativas, de arquitectura y de gestión de código que **todo asistente o agente de IA debe cumplir obligatoriamente** al trabajar en este repositorio.

---

## 1. Política Estricta de Control de Versiones (Git & Commits)

1. **Autorización Previa Obligatoria:**
   * **NUNCA** ejecutar `git commit` ni `git push` de manera autónoma o automática.
   * Siempre se debe pedir confirmación explícita al usuario antes de registrar cualquier cambio en el historial de Git.

2. **Commits solo tras Implementaciones Significativas:**
   * No realizar commits por cambios triviales, incompletos o en progreso.
   * Un commit solo se propone una vez que una característica, fix o cambio estructural esté **completamente implementado, probado y funcionando**.

3. **Formato Conventional Commits:**
   * Todos los mensajes deben seguir la convención estándar en minúsculas y en español o inglés técnico:
     * `feat(alcance): descripción clara`
     * `fix(alcance): corrección del error`
     * `docs(alcance): documentación o guías`
     * `test(alcance): adición o ajuste de tests`
     * `refactor(alcance): refactorización sin cambios funcionales`

4. **Archivos Protegidos y Secretos:**
   * Archivos `.env`, credenciales, claves de API y la carpeta `skills/` deben permanecer fuera del control de versiones (respetando [`.gitignore`](file:///.gitignore)).

---

## 2. Directrices de Frontend y UI (`nc-dashboard`)

1. **Cero Emojis en Componentes e Interfaz:**
   * Está **estrictamente prohibido el uso de emojis** en textos de interfaz, botones, tarjetas, encabezados o modales de la web.
   * Todos los elementos visuales e iconográficos deben utilizar exclusivamente la librería [`lucide-react`](file:///nc-dashboard/package.json).

2. **Diseño y Stack:**
   * Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + componentes accesibles tipo `shadcn/ui`.
   * Mantener siempre la consistencia visual y diseño profesional B2B.

3. **Garantía de Calidad y Validación Preventiva para Producción:**
   * **Antes de dar por completada cualquier modificación en frontend**, se debe ejecutar obligatoriamente:
     1. `pnpm lint`: Cero errores y advertencias de ESLint / React Hooks.
     2. `pnpm test`: Cobertura del 100% de la suite de pruebas unitarias e integración en verde.
     3. `pnpm build`: Verificación de que la compilación de producción (SSG/SSR Turbopack) termine con éxito (exit code 0).
   * Ningún cambio que rompa el linting, las pruebas o el build de producción es admisible.

---

## 3. Directrices de Backend y APIs (`nc-api`)

1. **Arquitectura y Filosofía:**
   * FastAPI + Python 3.12 gestionado con `uv`.
   * Base de datos PostgreSQL asíncrona vía SQLAlchemy y migraciones con Alembic.
   * Proveedores de LLM rápidos y de baja latencia (Groq por defecto con soporte multi-provider).

2. **Evitar la Sobre-ingeniería:**
   * Priorizar la simplicidad operativa y la velocidad de respuesta.
   * **No incorporar frameworks pesados o innecesarios** (como LangChain o LangGraph) a menos que un requerimiento de negocio probado y validado con clientes lo demande explícitamente.

3. **Verificación Continua:**
   * Antes de dar por finalizada cualquier tarea en el backend, se debe ejecutar la suite de pruebas unitarias y de integración (`uv run pytest`) asegurando que el 100% de los tests pasen.

---

## 4. Filosofía del Negocio y Prioridades

* NuncaCierro es una plataforma SaaS B2B orientada a resolver dolores comerciales reales (atención 24/7, agendamiento y retención de clientes fuera de horario).
* Las decisiones técnicas deben estar subordinadas a la validación comercial y a la adquisición de clientes reales.
* El playbook maestro de estrategia comercial se encuentra en [`skills/nuncacierro-business/SKILL.md`](file:///skills/nuncacierro-business/SKILL.md).

---

## 5. Estándar para Creación Inmediata de Demos de Nuevos Clientes

Cuando el usuario proporcione información sobre un prospecto o solicite crear una nueva demostración comercial:
1. **Lectura Previa Obligatoria de la Plantilla:**
   * **Todo agente debe consultar y seguir estrictamente la guía y plantilla en [`docs/cliente-demo-standard.md`](file:///docs/cliente-demo-standard.md)** antes de generar el código.
2. **Creación del Archivo Aislado:**
   * Crear un único archivo en `nc-dashboard/lib/demos/[slug].ts` con el slug en minúsculas y kebab-case (ej. `clinica-robles.ts`).
   * Cumplir con la interfaz tipada `DemoProfile` de [`lib/demos/types.ts`](file:///nc-dashboard/lib/demos/types.ts) extrayendo o infiriendo servicios con precios en COP, paquetes, testimonios y preguntas frecuentes realistas del negocio.
3. **Cero Configuración Manual:**
   * No editar rutas, ni `index.ts`, ni diccionarios manuales; la autocarga e indexación en Next.js App Router es 100% dinámica.
4. **Regla Estricta de Cero Emojis:**
   * Prohibido cualquier emoji en títulos, servicios, FAQs o cualquier texto del perfil (`AGENTS.md` regla de UI).
5. **Validación Preventiva Completa antes de Entregar:**
   * Ejecutar obligatoriamente `pnpm lint`, `pnpm test` y `pnpm build` en `nc-dashboard`.
   * Entregar la demostración lista en la URL `/demo/[slug]`.

