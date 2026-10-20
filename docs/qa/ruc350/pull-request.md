La API 1.0.202 rechazaba fichas válidas de OwnData cuando faltaba `stateRaw`; el adaptador posterior todavía validaba su tipo y publicaba el estado fiscal. La integración ahora ignora completamente `status` y `stateRaw`, tanto en respuestas nuevas como al servir caché de OwnData. La ficha sigue validando RUC/DV exactos, nombre, campos opcionales documentados, ambiente, procedencia HTTPS, fechas, snapshotHash y cuota.

La consulta sigue siendo server-to-server con la clave únicamente en `X-API-Key`, sin cookies de OwnData, redirecciones ni reintentos. Conserva autenticación, origen, permisos, tamaño entrante y límites SQL; agrega un límite de respuesta de 64 KiB. Sólo devuelve códigos de error de una lista cerrada y mensajes propios. Los errores de clave/activación son configuración del servicio (503+código seguro), separados de errores del parser.

Refs #350. Release 1.0.205. Sin migraciones ni cambios de permisos.

## Validación

- TypeScript `npx tsc --noEmit`: PASS.
- Regresión frontend: 295 entradas/70 fragmentos: PASS.
- Build producción: PASS.
- `npm --prefix backend run test:release`: PASS, incluye casos fiscales, nombre/RUC/DV inválidos, procedencia/ambiente/hash/cuota inválidos, credenciales/activación, caché saneada, errores sin secretos, límite de respuesta y fallo cerrado del limitador.
- Reproducción negativa con fuente previa a 203 y transporte simulado: misma ficha 503 sin stateRaw, éxito con stateRaw.
- Revisión estática independiente: sin bloqueos.

## Publicación y límites

- [ ] CI candidato y main verificados.
- [ ] API y web sirven 1.0.205.
- [ ] Consulta real autenticada sin cookies de OwnData.

El merge dispara el deploy configurado de ambos servicios, sin webhook manual duplicado. La ruta real protegida de Scale es `POST /api/agency/ruc-lookup` (proxy web `/core-api/api/agency/ruc-lookup`), no el ejemplo genérico `/api/ruc`. La sesión no dispone de clave OwnData ni sesión real de Scale para acreditar una consulta de producción. El dominio del panel Coolify suministrado por el dueño está bloqueado por el proxy hasta aplicar el borrador de red; no hay credenciales administrativas configuradas. No se declara activada una clave ni se atribuyen errores de configuración al parser.
