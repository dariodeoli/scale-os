# Integración #305–312 / preparación v1.0.200

Una rama integra formularios, ingresos por mes/extras, contratos, navegación, columnas, inventario y MCP. Los PRs hijos se conservan para revisión; el PR integrador es el candidato a main.

## Validación focal observada

- TypeScript PASS con owncoding-ui v0.68.20 instalado desde el SHA del tag; el shim local declara las firmas exactas de los dos helpers nuevos.
- Auditoría de acciones:628 canónicas,55 widgets estructurales y1 renderer; cero pendientes.27 decisiones exactas (25 altas/2 cambios),2 sitios duplicados retirados con JSX/hash y destino compartido documentados; historia original preservada. Test de contabilidad21 PASS.
- Menús:9 viewport/tema,9 sin Popover, scroll y10 casos Dialog real PASS. React Dialog15 PASS, alta/inventario y columnas PASS.
- Bootstrap120 y registro de migraciones PASS; baselines110/111/114/116 congelados, upgrade116→120 y reinicios conservan datos.
- PostgreSQL17 real MCP77 comprobaciones + SDK OAuth/MCP PASS; UTF-8 HTTP segmentado6 PASS. Revisión independiente final con hashes idénticos, incluyendo fallos negativos reproducidos y corregidos.
- Los PRs individuales incluyen sus focos de finanzas, contratos, errores y columnas. Las capturas representan emulación Chromium, no dispositivos físicos.

## Gates locales finales

- Cadena frontend:284 entradas cubiertas sin omisiones, reanudada en61/78/216 tras corregir tres expectativas de estructura y un host de portal en fixtures. Rangos PASS:1–60,61–77,78–215,216–284. No se presenta como una ejecución nueva completa; el CI del candidato la ejecutará desde cero.
- Backend `test:release`:64 scripts PASS; incluye bootstrap120, ingresos44, contratos, permisos, demo y MCP/PGlite63+SDK/UTF8segmentado6. MCP PostgreSQL real77+SDK y cambios comerciales precio/plan/historial PASS aparte.
- `npm run build`:PASS,66 páginas generadas y BUILD_ID acreditado en build-source.json; tipos, Prisma generate, release/footer y check-initial-assets PASS.
- HTTP real del build local:login `/`,registro ystatus200 con marca/versión/CSP PASS. Vista srcdoc A4 con todas las cabeceras reales de Next PASS, captura adjunta.
- La preparación bumpó una sola vez a1.0.200. Tras un gate que encontró un tooltip perdido, se corrigió y completaron manualmente los mismos gates; no se ejecutó otro bump.

CI y producción se agregan con resultados concretos al terminar. No se probó conexión con una cuenta real de Claude/ChatGPT ni firma digital certificada. El documento de firma es una propuesta técnica. No se probó impresión física.

## Revisión comercial MCP final

Catálogo41 herramientas. Cambiar precio/plan permanente conserva vigencia, snapshots, motivo, revisión, idempotencia y cierres con los handlers canónicos. Para un plan nuevo, el agente crea el plan con `scale_create_plan` y lo asigna por su ID explícito; el usuario puede pedirlo como una sola operación de negocio. Schema y runtime rechazan ID vacío antes de tocar DB. Reviewer independiente comprobó ese rechazo con Proxy DB que falla ante cualquier acceso; root y writer comprobaron PostgreSQL77+SDK.

Se detectó un defecto preexistente del retry REST con plan automático sin ID, registrado en #322. MCP no anuncia ni acepta ese camino y no amplía permisos. El handler REST requiere seguimiento separado; no se afirma que ese defecto haya sido corregido.

Backend64 scripts pasó antes del último guard MCP; el focal PostgreSQL/SDK y UTF8 pasó tras el guard. El CI final vuelve a ejecutar64 scripts completos sobre el candidato final.

## Diagnóstico CI #323

El runner fallaba en el gate120 al enviar End antes de que el foco inicial del menú se aplicara en requestAnimationFrame. La presencia del selector no acreditaba que el menú estuviera listo para teclado. Se exige foco en la primera acción antes de End y foco en la última después, manteniendo geometría/hit-test/edición/Escape. Control independiente con rAF inicial retrasado80ms:PRE falla con el mismo resultado de GitHub, POST pasa9 casos. No cambia el motor del menú.

El entorno devuelve CONNECT403 para descargar logs de GitHub. El workflow conserva pipefail y exit original y publica diagnóstico acotado/escapado mediante anotaciones disponibles por API. Control local:exit7 preservado y comando inyectado como texto, sin crear otra anotación. El propio fallo de GitHub fue recuperado por esa vía; no se eludió la restricción de red.

Regresión local nueva completa con CI=true:284/284 entradas PASS sobre producto final; el gate120 se ejecutó antes del ajuste de sincronización del harness y su focal corregido9/9 más control de retraso9/9 pasan por separado. El CI del candidato final verifica la cadena con el harness actualizado desde cero.
