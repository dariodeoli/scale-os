# Cierre de la campaña #154 — pasada final v1.0.172

Pasada final sobre **v1.0.172** (`origin/main` = `5fc7d7c6`, ya en producción web
+ API) de todos los verticales, con foco en Operaciones. Consolida la campaña
abierta en el issue #154.

## Resultado global

- **0 fallas críticas** en la pasada final. Sin hallazgos de producto nuevos.
- Todos los fixes de la campaña están **integrados en v1.0.172**: COM (ventana
  de filas), DSN (AA oscuro), FIN #149 (validaciones/pickers/custodias), PLT
  (#152/#153/#158/#159) y OPS #151 + evidencia.
- Pendientes **no bloqueantes**: decisión del dueño sobre el CTA con gradiente
  de la landing (3.36:1, propuesta DSN) y credenciales de Microsoft/Apple SSO
  en producción (`PROVIDER_UNAVAILABLE` 503 por diseño; Google activo).

## Pasada final — evidencia

| Vertical | Verificación en v1.0.172 | Evidencia |
|---|---|---|
| **OPS** | Producción: `qa-ops-151.mjs` **28/28** (tablero sin chips vacíos, horas humanas, terminadas sin «venció», detalle sin emails técnicos, checklist con estado, inventario con foto rota/nombres). Local: `qa-testeos-168-ops.mjs` **68/68** (incluye viewer y sesión vencida) + `e2e-drag.mjs` **PASS** (mouse/touch/filtro/read-only/viewer con Postgres) | `prod/ops-151/` (22 archivos) · `local/` (76 archivos) |
| **PLT** | Producción: acceso con SSO según proveedores configurados (`/api/auth/providers` → google true, microsoft/apple false; los no configurados **no se muestran**), portal del cliente `/cliente/ingresar` y `/cliente/recuperar` en 390/1440 claro-oscuro, SEO `robots.txt`/`sitemap.xml` 200 | `prod/acceso-*.jpg`, `prod/portal-ingresar-*.jpg`, `prod/smoke-plt.txt`, `prod/smoke-plt-browser.txt` |
| **COM** | Producción: cross-check del fix de ventana de filas en `/clientes` (16 filas, scroll 998 px, sin espaciadores) y `/presupuestos` (14 filas, 1.011 px) — antes 21.513 px | `prod/com-*.jpg`, `prod/smoke-com-browser.txt` |
| **FIN** | #149 integrado en v1.0.171 y redesplegado en v1.0.172; verificación de producción de FIN 48/48 en `docs/qa/fin-149/prod-1.0.171/` | `docs/qa/fin-149/` |
| **DSN** | Fixes AA en main desde v1.0.171 (text-button y demo-tag en oscuro); smoke de acceso portal/shell 390/1440 claro-oscuro sin overflow en esta corrida | `prod/acceso-*.jpg`, `prod/portal-ingresar-*.jpg` |

## Reproducir

```sh
# Producción v1.0.172 (usa una demo descartable por corrida)
BASE_URL=https://app.scaleparaguay.com QA_OUT=docs/qa/testeos-172/prod \
  node build-tools/visual-harness/qa-ops-151.mjs --tag ops-151 --checks
node build-tools/visual-harness/qa-testeos-172-plt-prod.mjs --checks
node build-tools/visual-harness/qa-testeos-172-com-prod.mjs --checks

# Local v1.0.172 (stack OPS completo)
node build-tools/visual-harness/e2e-ops-stack.mjs
QA_OUT=docs/qa/testeos-172/local node build-tools/visual-harness/qa-testeos-168-ops.mjs --checks
node build-tools/visual-harness/e2e-drag.mjs
```

## Archivos

- `prod/` — capturas y textos de la pasada en producción (OPS 151, PLT, COM).
- `local/` — campaña OPS completa (68 checks) + e2e de drag & drop + informes.
