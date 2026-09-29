# Salarios — panel en Finanzas, renombre y fotos sin recorte (#88)

Evidencia de la rama `SOS-FIN` sobre `origin/main` (v1.0.145): panel **Salarios**
en Finanzas, **«Personal proyectado» → «Salarios»** en Previsión y avatar de esa
lista sin wrapper que lo recorte.

## Antes / después

| Evidencia | Antes (`main`) | Después (rama) |
| --- | --- | --- |
| Lista de Salarios (1440) | `avatar-antes-1440-light.jpg` | `avatar-despues-1440-light.jpg` |
| Lista de Salarios (390) | `avatar-antes-390-light.jpg` | `avatar-despues-390-light.jpg` |
| Zoom de la primera identidad (1440/390, claro/oscuro) | `avatar-zoom-antes-*.jpg` | `avatar-zoom-despues-*.jpg` |
| Pantalla de Finanzas en contexto | `finanzas-antes-1440-light.jpg` | `finanzas-despues-1440-light.jpg` · `finanzas-despues-1440-dark.jpg` · `finanzas-despues-390-light.jpg` |

En el «antes» el zoom deja ver el recorte: el avatar de 32 px (34 px en mobile)
vive dentro de un wrapper de `h-6 w-6` (24 px) / `h-7 w-7` (28 px) con
`overflow-hidden`, así que la foto se ve solo en el centro y el círculo aparece
cortado arriba y abajo. En el «después» el avatar se dimensiona por CSS
(`.forecast-personnel-card .actor-identity-avatar`) a **32 px** (claro) y
**34 px** en mobile, sin wrapper: la foto entra completa y las iniciales usan el
mismo círculo.

## Panel «Salarios» en Finanzas (con dato y estados)

| Estado | Evidencia |
| --- | --- |
| Lleno (por moneda, con headcount) | `panel-salarios-despues-1440-light.jpg` · `-dark` · `-390-light` · `-390-dark` |
| Cargando (esqueleto; petición retenida por CDP) | `panel-salarios-cargando-despues-1440-light.jpg` · `-dark` · `-390-light` · `-390-dark` |
| Error con reintento (petición fallida por CDP) | `panel-salarios-error-despues-1440-light.jpg` · `-dark` · `-390-light` · `-390-dark` |

El panel usa el **mismo contrato y hook que Previsión** (`useForecast(mes, '1')`
→ `/core-api/api/agency/forecast` → `personnel`), sin recálculos propios, y
muestra una tarjeta por moneda con `expected_end_of_month_expense` y
`included_headcount`; sin dato, `MoneyText` dibuja `—`. El vacío («Sin salarios
fijos cargados para este mes» con **Ver equipo**) no se pudo capturar en vivo
porque toda demo trae salarios cargados; queda fijado por el contrato de
`tests/salarios-panel.test.ts` en lugar de fabricar una respuesta.

## «Ver más» en los paneles

- **Salarios → Previsión**: botón «Ver más» del panel (abre la vista completa).
- **Cobros pendientes → Mora**: botón «Ver mora» en el encabezado del panel,
  porque la lista de facturas y la cobranza por cliente son vistas distintas y
  no duplican datos.
- El wiring es mínimo: `navigate={setActive}` desde `app/scale-workspace.tsx`.

## Chequeos del harness

`qa.txt`/`qa.json` (corrida `QA_LABEL=salarios`): 173 chequeos en verde —
targets ≥44 px, filas 44–52, sin scroll horizontal del documento y contraste
claro AA en las cinco pantallas. Las únicas fallas en oscuro son las conocidas
de **tokens de chip** (`4.21:1`, deuda de DSN) y el crédito del pie
(`3.77:1`, «Desarrollado por Owncoding», #82); el panel nuevo no agrega fallas.

## Cómo reproducir

```sh
npx next build
node build-tools/visual-harness/e2e-fin-stack.mjs &   # demo con datos
QA_LABEL=despues QA_STATES=1 node build-tools/visual-harness/capture-salarios.mjs
# «antes»: el mismo comando con QA_LABEL=antes contra un stack de origin/main
npm run test:release-regression
```
