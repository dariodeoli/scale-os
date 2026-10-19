# Finanzas: auditoría responsive — Refs #265

Alcance: Balance, Previsión financiera, Finanzas/caja, Cobranza y mora e Informes.
La corrección usa utilities Tailwind en Previsión, respetando el contrato v2 sin recrear su hoja CSS retirada; no modifica cálculos, permisos,
contratos API, datos, tablas de Balance ni CSS global.

## Hallazgo y corrección

La columna de monto en los tres renglones Ingresos/Gastos/Resultado tenía un ancho
fijo de 8.5rem. Con `Gs. 999.999.995.789`, Chromium midió 150px de contenido sobre
136px de celda en 320px: el monto invadía el espacio vecino aun sin aumentar el
ancho del documento. El harness falla explícitamente antes de la corrección.

Ahora el monto usa su ancho intrínseco. Cuando la tarjeta dispone de hasta 360px
útiles, la etiqueta, el monto y la barra se ordenan en tres renglones. La consulta
se aplica al contenedor, por lo que también funciona en tarjetas pequeñas dentro
de una pantalla de escritorio; no depende solamente del viewport. Se conserva el
importe completo, el signo y los decimales de cada moneda.

Balance mantiene sus mitades iguales en escritorio (desde 1024px), paneles apilados
en móvil, encabezados alineados y tablas con desplazamiento interno. No fue
necesario reemplazar esos patrones existentes.

## Reproducción local

```bash
node build-tools/qa-finance-responsive-265.mjs
```

Requiere Chromium (`SCALE_QA_CHROME` opcional). Compila Tailwind real desde el
checkout y renderiza las secciones reales de Balance y Previsión con datos
sintéticos. Usa tres combinaciones de monedas, importes altos, vistas claras y
oscuras y anchos 320, 390, 768, 1024, 1280, 1366 y 1440: 42 escenarios.
Comprueba montos completos, formularios dentro del panel, mitades/encabezados,
ausencia de overflow de documento y logos. Las capturas y métricas quedan en
`/tmp/scale265-finance` (`SCALE_QA_OUT` para otra ruta).

Es una verificación SSR de presentación en Chromium: no acredita guardados,
OAuth, dispositivos físicos ni operaciones financieras en producción.

## Validación focal final

- Chromium: 42/42 escenarios PASS, incluyendo el mismo valor alto que fallaba.
- Regresión de forecast: 5/5 entradas PASS (`--only forecast`).
- Regresión financiera: 5/5 entradas PASS (`--only finance`).
- `tests/fin-v2-contract.test.ts`: PASS; la hoja antigua de Previsión sigue retirada.
- `release:check`, `footer:check`, sintaxis del harness y `git diff --check`: PASS.
- La corrida completa inicial pasó 83 entradas y falló en la 84 por el contrato
  que prohibía recrear la hoja CSS retirada. Se corrigió usando utilities, sin
  cambiar ni relajar el test. La cadena completa y el build de la combinación
  final corresponden al integrador, no se acreditan aquí como ejecutados.

## Estado de entrega

Las pruebas finales y el seguimiento de integración/publicación se acreditan en
el PR de esta rama y en el PR del integrador. Este agente no publica ni cierra el
issue.
