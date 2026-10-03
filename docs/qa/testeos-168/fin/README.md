# FIN — Campaña de testeos #154 sobre v1.0.172

Recorrido final de la vertical (finanzas, mora, previsión, informes, salarios y
comisiones) en **producción v1.0.172** (`app.scaleparaguay.com` /
`api.scaleparaguay.com`), con **demo privada fresca** por corrida
(`POST /api/demo/start`, Origin `sistema.scaleparaguay.com`), 1440/390 (y
360/430/1280 en el barrido vertical) en claro y oscuro. Complementa la
verificación post-deploy de #149.

## Comandos

```sh
QA_LABEL=prod-172 node build-tools/visual-harness/qa-fin-149.mjs   # 48/48
QA_LABEL=prod-172 node build-tools/visual-harness/qa-fin-154.mjs   # 45/45
QA_LABEL=prod-172 node build-tools/visual-harness/qa-vertical-fin.mjs # 184 ✓ / 8 ✗ (1 hallazgo repetido)
```

## Cobertura y resultado

| Superficie | Flujos probados | Resultado |
|---|---|---|
| **Finanzas** (`/pagos`) | Balances por moneda, cobros urgentes, pendientes, historial en tabs, transferencias, cobros registrados con ventana 20 + «Ver todos», conciliación | ✅ ventana/limit=all y modales (Factura, Cobro, Cuenta, Transferir) en foco/scroll/Escape |
| **Mora** (`/pagos/mora`) | KPIs, filtros, antigüedad, DSO por moneda (`/reports` una vez) | ✅ |
| **Previsión** (`/pagos/prevision`) | `Ver desglose`, gastos planificado/real bloqueados, mes largo, salarios por moneda, formularios sin desborde, reduced-motion | ✅ |
| **Salarios** (panel Previsión) | Personas/roles, montos por moneda, sin correos `@demo.example.invalid` | ✅ |
| **Informes** (`/informes`) | KPIs de facturación, mes/moneda consultables, series históricas | ✅ |
| **Comisiones** (`/equipo/comisiones`) | KPIs con mes largo, tabs, alta de descuento (subtab Descuentos), modales | ✅ |
| **Permisos** | Rol `viewer`: sin acciones FIN (Registrar cobro/Factura/Cuenta/Comisión/Descuento) y «Sin acceso» en secciones gateadas | ✅ |
| **Contraste/consola** | AA texto y bordes por tema; excepciones de consola | ⚠️ 1 hallazgo menor (ver abajo); 0 excepciones |

Evidencia: capturas 390/1440 (y 1280) claro-oscuro en `fin-149-v172/`,
`fin-154-v172/` y `vertical-v172/`, con `verificacion.txt`/`qa.txt` de cada
harness.

## Hallazgos

1. **(menor · DSN/librería) Contraste AA en oscuro del badge contador de
   `Subtabs`**: el contador (texto 10 px bold «1»/«2», `bg-ink-700 text-mute`)
   mide **4.38:1** (< 4.5) en Finanzas y Comisiones, en todas las anchuras y solo
   en tema oscuro. Viene de `owncoding-ui` v0.61.0 (`ml-2 rounded-full px-1.5
   py-0.5 text-[10px] font-bold tabular-nums`). No es crítico (0.12 por debajo,
   elemento de conteo), pero aplica a todas las verticales que usan `Subtabs`.
   Evidencia: `vertical-v172/qa.txt` y capturas `finanzas-*dark` /
   `comisiones-*dark`.
2. **(herramienta · resuelto con `Refs #154`) Expectativa obsoleta del harness
   vertical**: «Nuevo descuento» vive dentro del subtab Descuentos y el harness
   lo buscaba en la vista de Liquidación; se agregó el cambio de subtab previo.
   También se espera que los formularios de Previsión monten antes de medirlos.

## Estado

**Sin fallas críticas** en la vertical FIN sobre v1.0.172; #149 sigue verde
(48/48). Único hallazgo menor de contraste en la librería compartida, derivado a
DSN. Listo para el consolidado de #154.
