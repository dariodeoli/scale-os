# Auditoría demo PLT (#139) — Resumen, Equipo, Configuración y precarga de métricas

_2026-10-02 · rama `SOS-PLT` sobre `origin/main` v1.0.163 · stack local de QA
(`e2e-plt-stack.mjs`: API 3933 + front 3050 + proxy 3051, demo real) y red
emulada por CDP (escritorio 40 ms/10 Mbps, móvil 80 ms/1,6 Mbps)._

## Qué cambió

**A) Resumen**
- «Primeros pasos» pasó de tarjeta grande a **checklist compacto y descartable**
  (una fila de 62 px: avance, siguiente paso y «Ocultar»); el detalle se
  despliega y cada paso abre su módulo. (`app/workspace-guide.tsx`.)
- El detalle bimoneda del resumen financiero quedó bajo **«Ver desglose»**
  (progressive disclosure) para no empujar el resto del panel.
  (`app/control-center.tsx`.)

**B) Equipo**
- Se retiró la **facturación contratada** de la cabecera del directorio y, con
  ella, la lectura del centro de control que solo alimentaba ese Kpi; también
  se limpiaron sus reglas CSS. (`app/operations.tsx`, `app/operations.css`.)
- Los **detalles de salario** (modalidad, día de pago, factura, moneda) solo se
  dibujan con un monto real cargado; sin monto queda únicamente el aviso «Sin
  salario definido» para personas activas, sin placeholders vacíos.

**C) Configuración**
- El **Manual y la vista previa del portal** salieron de Configuración: viven en
  la ayuda del panel (diálogo «Empezar y descubrir funciones»), plegados.
- El **lateral de Suscripción** ahora suma **Cotización USD/PYG** e
  **Integraciones** debajo del panel; la columna principal queda para Empresa.
  (`app/suite.tsx` exporta `ExchangeRateSettings`/`IntegrationSettings`,
  `app/sections/configuracion.tsx` los ubica en el lateral.)

**D) Precarga de métricas clave (coordina con DSN #138)**
- Nuevo `app/metrics-prefetch.ts`: al conocer la identidad, la sección pedida
  arranca sus KPIs **en paralelo con los datos del shell**, en vez de esperar la
  cascada listas → widgets. Usa el caché corto compartido con `api()` y
  `useForecast()`, así el widget consume la misma lectura (sin segunda llamada).
- Resumen: `dashboard` + `control-center`; Finanzas: `forecast` del mes corriente
  (panel de Salarios); Informes: `reports` con la ventana inicial
  (`months=12&previous=1`). Solo se adelantan lecturas que la capacidad del rol
  habilita; el API sigue revalidando.

## Medición antes/después

Misma receta (`measure-load-plt.mjs`, ahora con columna **«KPIs listos»** y
`kpiMs`/`start` por llamada). «Antes» = `origin/main` v1.0.163; «después» = esta
rama. Ambos con el stack en caliente; la red emulada hace que la transferencia
del payload domine (finanzas: forecast de ~86 KB).

| Pantalla | Ancho | Red | KPIs listos antes | KPIs listos después | Arranque KPI antes | Arranque KPI después |
| --- | --- | --- | --- | --- | --- | --- |
| resumen | 1440 | escritorio | 931 ms | **171 ms** | 815 ms | **150 ms** |
| finanzas | 1440 | escritorio | 215 ms | **103 ms** | 189 ms | **79 ms** |
| informes | 1440 | escritorio | 183 ms | **95 ms** | 159 ms | **82 ms** |
| resumen | 390 | móvil | 348 ms | **192 ms** | 288 ms | **182 ms** |
| finanzas | 390 | móvil | 316 ms | **189 ms** | 261 ms | **177 ms** |
| informes | 390 | móvil | 240 ms | **183 ms** | 187 ms | **173 ms** |

Lectura clave: el arranque del KPI deja de depender de la carga de listas
(Resumen esperaba 815 ms; ahora arranca a 150 ms con la identidad) y en Finanzas
e Informes el widget encuentra la respuesta ya en camino. Equipo y Configuración
no tienen KPIs de este alcance (`—`).

Crudos: `mediciones-antes.{json,md}` y `mediciones-despues.{json,md}`.

```bash
# Stack (deja corriendo):
SCALE_OS_OWNER_EMAIL=qa-plt@example.invalid SCALE_OS_OWNER_PASSWORD=qa-plt-12345678 \
  node build-tools/visual-harness/e2e-plt-stack.mjs
# Medición:
QA_SESSION=plt-qa2-session.txt QA_SCREENS=resumen,finanzas,informes \
QA_LATENCY="desktop=40:10000:3000,mobile=80:1600:750" OUT_DIR=docs/qa/plt-139 \
  node build-tools/visual-harness/measure-load-plt.mjs
# Capturas:
LABEL=despues QA_SIZES=1440x900,390x844 QA_THEMES=light,dark \
  node build-tools/visual-harness/capture-plt-139.mjs
```

## Capturas (390/1440 claro/oscuro)

`resumen-*`, `equipo-*` y `configuracion-*` con sufijo `antes`/`despues`, más
`metricas-*.json` (alto del checklist, detalles plegados y alto del lateral).
En Resumen se ve la fila compacta de «Primeros pasos» y «Ver desglose»; en
Equipo, la cabecera sin facturación y el chip de salario sin placeholders; en
Configuración, el lateral con Suscripción + Cotización + Integraciones y el
Manual fuera.

## Verificación

- `npm run test:release-regression` ✅ (incluye las guardas nuevas de
  `data-loading-cache`, `settings-slice`, `team-toolbar-density` y
  `collaborator-access-compact`).
- `npx next build` ✅ (`.next/BUILD_ID` verificado).
- `npm run release:check` ✅ · `npm run footer:check` ✅ · sin marcadores de
  conflicto.
- API sin cambios (no se tocó `backend/`).

## Limitaciones

- Medición en loopback: valida estructura y orden de llamadas, no WAN real; los
  absolutos varían con la carga de la máquina (± decenas de ms).
- El demo es sintético. Los esqueletos de los widgets son de DSN (#138): acá se
  deja el dato en camino para que el esqueleto no termine en espera vacía.
