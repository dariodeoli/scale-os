# Comparativa CargaIA — `owncoding-ui/ia` v0.61.0 vs motor propio (Refs #136)

Evaluación pedida por el issue [#136](https://github.com/dariodeoli/scale-os/issues/136):
¿conviene migrar el motor de «Carga con IA» a la biblioteca o mantener el propio?
El detalle completo se publicó como comentario en el issue; este documento deja el
artefacto en el repositorio.

## Versiones comparadas

| Pieza | Referencia |
|---|---|
| `owncoding-ui` v0.61.0 | tag anotado `11853214…` → commit `5e0b92b086ae916cf03dba585de0f0deb8e3a4ce` |
| `owncoding-ui` instalado (v0.59.0) | commit `3abad3a6d4fd294bb74b8c4ae78c48f719439f28` |
| Motor propio | `backend/ia-carga.js` (912 líneas) + `app/ia-carga-data.ts` + `app/ia-carga.tsx` |
| ScaleOS evaluado | rama `SOS-PLT` sobre `origin/main` `d5802ccd` (v1.0.167) |

**Dato clave:** el subpath `owncoding-ui/ia` es **idéntico** entre v0.59.0 y v0.61.0
(`git diff` vacío en `src/ia/*` y `dist/ia.js`). El salto de tag solo agrega el
diálogo compacto de UI (#16), constantes de tamaño de diálogo y docs del playbook
(#15). Migrar el motor es independiente del bump de versión.

## Qué exporta la biblioteca (`owncoding-ui/ia`)

15 exports de motor + 6 del contrato puro; sin React (`"use client"` no aplica).

| Export | Rol |
|---|---|
| `IAError`, `configIA`, `estadoIA`, `proveedorIA` | Proveedor OpenAI-compatible (DeepSeek default, 30 s, 4 000 tokens, `response_format json_object`), errores con `codigo`. |
| `instruccionesIA`, `mensajesDeCargaIA` | Prompt genérico desde `EsquemaIA`, texto como dato (anti-inyección). |
| `parsearSalidaIA`, `fechaDeTextoIA`, `validarAnalisisIA` | Parsing tolerante (cercas/prosa), fechas ISO/dd-mm-aaaa, coacción por tipo de campo. |
| `analizarCargaIA`, `motorIA`, `crearLimitadorIA` | Orquestador de una pasada, motor listo para el endpoint y rate-limit en memoria (10/15 min). |

Límites compartidos: `IA_TEXTO_MAX=20000`, `IA_REGISTROS_MAX=25`, `IA_RATE_LIMIT=10`,
`IA_TOKENS_MAX=4000`, `IA_TIMEOUT_MS=30000`, `CAMPOS_IA`.

## Qué tiene el motor propio que la biblioteca no

| Capacidad | Dónde | Por qué importa |
|---|---|---|
| Acciones `registrar_cobro` / `registrar_vencimiento` | `backend/ia-carga.js:611-792` | Fase 2 del producto (cobros/plazos); el contrato de la biblioteca **ignora `acciones`**. |
| Matching local con señales y % | `backend/ia-carga.js:326-609` | Preselección vincular/crear/pendiente (RUC, correo, teléfono, Levenshtein, umbral 90/60). |
| Anti-alucinación `no_en_texto` / `verificarEscalares` | `:689-721` | Ningún dato se crea si no está en el texto. |
| Presupuesto de tokens, `reasoning_effort`, `finish_reason`/`usage`, retry acotado, `ia_truncado`/`ia_vacio` | `:27-76`, `:118-163`, `:804-856` | Endurecido en #127; el front depende de esos códigos. |
| Validación de dominio (`suite-validation`: RUC/teléfono/correo/moneda) | `:229-324` | La biblioteca valida contra esquema genérico, no contra reglas de ScaleOS. |
| Rate-limit compartido en DB + auditoría PDP `ai.transfer` | `:867-912` | Multi-instancia y obligación de privacidad. |
| Endpoint `/api/ia/carga` (auth, rol, throttle, contrato) | `:867-912` | Contrato público que los tests 118/119/120/128/132 fijan. |

## Qué ganaríamos adoptando el motor de la biblioteca

- Una sola fuente para prompt genérico, parsing y validación declarativa.
- Tests y mantenimiento de la biblioteca, más la guarda de que el subpath no
  arrastra React.
- `crearLimitadorIA` reutilizable y un `EsquemaIA` que también dibuja el diálogo.

## Qué perderíamos si migráramos hoy

- La Fase 2 completa (acciones, matching, `no_en_texto`, fechas relativas con motivo).
- Resiliencia #127 y códigos de error que el front clasifica (`ia_truncado`, `ia_vacio`).
- El rate-limit compartido (el de la biblioteca es en memoria, por instancia).
- La auditoría PDP y la validación de dominio del API.

## Plan por etapas

| Etapa | Alcance | Riesgo | Beneficio | Decisión |
|---|---|---|---|---|
| 0 | Comparativa y decisión (este documento) | Nulo | Claridad de dueño único | **Hecha** |
| 1 | Portar a `owncoding-ui/ia` lo genérico que ya tenemos: `verificarEscalares`/`no_en_texto`, fechas relativas con motivo, presupuesto de tokens + `reasoning_effort` + `finish_reason`/`usage`, retry con códigos, y extraer el matching puro (señales/umbrales) | Bajo (repo biblioteca) | Evita duplicar reglas y habilita la convergencia | **Propuesta** (borrador de issue abajo) |
| 2 | Adoptar en ScaleOS `parsearSalidaIA`/`validarAnalisisIA`/constantes con un hook de dominio para acciones y matching | Medio | Menos código propio, mismos tests | **Cuando la etapa 1 esté publicada** |
| 3 | Adoptar `CargaIA`/`DialogoCargaIA` en la UI con el carrito/match/acciones de Fase 2 | Alto (UI propia v2) | Un solo diálogo de biblioteca | **No ahora**; coordinar con DSN |

## Recomendación fundada

**Mantener el motor propio en v1.0.167 y converger por etapas.** La migración del
núcleo **no es incremental ni segura** hoy: el motor de la biblioteca no representa
`acciones` (las descartaría en silencio), no tiene matching local ni anti-alucinación,
y bajaría la resiliencia del proveedor (30 s/4.000 tokens fijos vs presupuesto +
`reasoning_effort` + `finish_reason`). El subpath `ia` es idéntico entre 0.59 y 0.61,
así que tampoco hay urgencia por el bump.

La convergencia correcta es **portar primero a la biblioteca** las capacidades
genéricas (etapa 1) y recién después adoptar el núcleo con un hook de dominio.

### Borrador de issue para `owncoding-ui` (etapa 1)

> **Título:** `ia`: portar anti-alucinación, fechas relativas y resiliencia del motor desde ScaleOS
>
> - `verificarEscalares`/`no_en_texto`: marcar campos escalares que no aparecen en el texto pegado.
> - `fechaDeTextoIaDetalle`: hoy/ayer/anteayer y `dd/mm` sin año, con motivo visible.
> - Motor: presupuesto de tokens por largo, `reasoning_effort` configurable, devolver `finish_reason`/`usage` y retry único con `ia_truncado`/`ia_vacio`.
> - Extraer matching puro (normalización, documentos/teléfonos compatibles, Levenshtein, señales, confianza 0–100, estados 90/60); la consulta SQL queda en la app.
> - Contrato `acciones` (tipo, cliente, monto/moneda, fecha/plazo) con red de seguridad crédito→vencimiento.
>
> Referencia: `backend/ia-carga.js` de ScaleOS (v1.0.167) y `docs/ADOPCION-V2.md` §9–10.

## Evidencia

- `npm --prefix backend run test:ia-carga` en verde (667 líneas, cubre matching,
  acciones, privacidad, rate-limit y handler).
- Suite front `ia-carga-118/119/120/128/132` + `ia-cobro-data` en `test:release-regression`.
