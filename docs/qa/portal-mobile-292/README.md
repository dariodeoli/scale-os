# Portal privado: auditoría responsive #292

Fuente base: `origin/main` e04961c4 (v1.0.197). Datos y nombres de estas pruebas son exclusivamente sintéticos. No se usaron cookies, clientes ni credenciales de producción.

## Superficies y estados

| Ruta real | Contenido y acciones acreditados |
| --- | --- |
| `/cliente/entregas` | Lista poblada, aprobación previa, estado vacío, fallo de carga; salida con bloqueo de doble intento, error recuperable y foco del aviso. |
| `/cliente/entregas/42` | Entrega, archivo principal, enlaces asociados, revisión, comentarios y actividad; lista de actividad y reintento tras error; comentario fallido conserva texto, reintento exitoso limpia y recarga; ambos tipos de decisión envían sus datos; bloqueo compartido de acciones concurrentes. |

Estas dos vistas autenticadas no contienen menús desplegables, modales ni fotos. Sus enlaces de archivo conservan `target="_blank"`, `rel="noopener noreferrer"` y `referrerPolicy="no-referrer"`, acreditados también por `tests/client-portal-integration.test.tsx`. No se agregó un control ficticio para poder decir que se probó.

Las pantallas públicas de ingreso, recuperación e invitación conservan su cobertura previa en `tests/access-forms-browser-241.test.mjs` y `tests/client-portal-integration.test.tsx`; no equivalen a iniciar sesión con un proveedor real.

## Hallazgos corregidos

1. Con un nombre de proyecto/cliente sin separadores, la columna implícita de `.delivery` crecía fuera de la tarjeta. `overflow:hidden` ocultaba el contenido y el documento conservaba el ancho correcto: medir sólo `document.scrollWidth` daba un falso negativo. Ahora lista y tarjetas usan una columna `minmax(0,1fr)` y sus hijos pueden encoger y envolver texto.
2. Actores extensos de la actividad también se cortaban dentro de la tarjeta. El texto de actividad y los enlaces admiten saltos; la prueba detecta tanto los límites geométricos como el desbordamiento interno de elementos.
3. Botones compartidos, por ejemplo «Salir», medían menos de 44 px en tablet. Los controles eligen `size="large"` del componente canónico para conservar el target táctil, sin sobrescribir su tamaño desde CSS contextual. La verificación integral de propiedad CSS detectó y retiró ese override local; queda como gate de CI.
4. Dos envíos de comentario en el mismo turno enviaban dos POST antes del siguiente render de `busy`. Comentarios y decisiones ahora comparten `useSingleFlightSubmit`, el bloqueo canónico inmediato. Una prueba estable demuestra además que no se dispara una decisión mientras está enviándose un comentario.
5. El botón «Volver» del encabezado se encogía a42,92 px de ancho y116 px de alto junto a un cliente/proyecto extenso a768px. La prueba contra Next lo confirmó; el encabezado ahora mantiene la acción sin encoger.
6. La salida no gestionaba errores del API. Ahora muestra un aviso con foco, permite reintentar y bloquea duplicados mediante el mismo hook canónico. Las decisiones/comentarios fallidos también llevan el foco al aviso.

No se modificaron CSS global, autorización ni contratos de API.

## Matriz y reproducción

`tests/portal-responsive-browser-292.test.mjs` monta los componentes de página y layout reales con API sintética en el navegador, sin Next Router ni autenticación reales. Matriz: 3 temas (claro/oscuro/contraste) × 2 vistas × 7 tamaños = **42 combinaciones**:

- 320×844, 390×844, 768×844, 1024×844, 1440×844;
- 844×390 horizontal y 1024×600 de altura reducida.

Se comprueban ancho del documento, geometría y desbordamiento interno, imágenes rotas, targets de 44 px, foco visible y movimiento con Tab. Se usa puntero táctil emulado. Las acciones y estados adicionales se ejecutan de forma focal, no se afirma que cada mutación se repitió 42 veces.

```bash
PORTAL_QA_OUTPUT=docs/qa/portal-mobile-292 node tests/portal-responsive-browser-292.test.mjs
node_modules/.bin/tsx --test tests/portal-mutations-292.test.tsx tests/client-portal-integration.test.tsx
```

La regresión del bloqueo y la matriz de navegador quedan en el fragmento independiente `76-portal-mobile-292.list`. El navegador requerido debe estar instalado; el test falla si falta, sin simular un PASS.

El runner `build-tools/qa-portal-next-292.mjs` utiliza el Next compilado con root/layout/CSS completos, abre las rutas reales y prueba navegación real de Next Link. Únicamente intercepta el API con respuestas sintéticas antes de acceder a la red; rechaza hosts externos. Repetición tras build:

```bash
npm run build
node_modules/.bin/next start --hostname 127.0.0.1 --port 31292
QA_BASE_URL=http://127.0.0.1:31292 PORTAL_QA_OUTPUT=docs/qa/portal-mobile-292 node build-tools/qa-portal-next-292.mjs
```

## Evidencia y controles negativos

- `measurements.json` y seis capturas `*-390.png`: componentes reales, geometría y foco de las 42 combinaciones.
- `browser-result.log`: resultado del runner de componentes.
- `baseline-clipping.log`: mismo test con CSS de `e04961c4`, FAIL esperado por clipping a320px. Se puede repetir con `PORTAL_QA_BASELINE_CSS=/tmp/portal-baseline.css`, sin alterar el checkout.
- `baseline-activity-clipping.log`: FAIL esperado al agregar la detección de overflow interno de la actividad antes de corregir ese caso.
- `baseline-duplicate-comment.log`: FAIL esperado del envío duplicado (`2 !== 1`) antes de usar el hook canónico.

El integrador debe repetir la matriz contra el build final antes de publicar y registrar su SHA/BUILD_ID. Este trabajo no despliega ni cierra el issue por sí solo.

## Límites reales

Chromium con emulación no acredita Safari/WebKit, un iPhone/Android físico, OAuth real ni descargas desde el almacenamiento privado. Las pruebas de UI usan un contrato sintético de API; el test del backend del portal se ejecuta por separado. Un resultado visual no prueba por sí mismo aislamiento de cuentas o autorización del servidor. El seguimiento de límites y la auditoría de superadmin pertenecen a #292.

## Estado de entrega de la rama

- Build Next15.5.27: PASS, 64 páginas; BUILD_ID y dependencias en `build-source.json`. El build precede al último ajuste CSS del botón Volver; requiere repetición contra el build integrado final.
- TypeScript, release y footer: PASS.
- Integración de componentes del portal: 4 pruebas PASS. Regresiones nuevas: 2 pruebas PASS.
- Backend `node test-client-portal.mjs`: PASS; acredita identidades aisladas, descargas autorizadas, decisiones/comentarios, revocación y exposición privada en base sintética local.
- Next real: el primer intento local sin Host devolvió404 por el middleware deliberado; el runner incorpora un proxy loopback con Host `app.scaleparaguay.com`, sin DNS ni tráfico de producción. El intento posterior acreditó vistas iniciales y detectó el target Volver estrecho; el control negativo queda en `baseline-next-back-target.log`. Las capturas `next-light-*-390.png` son focales de ese intento, no una matriz Next completa. El integrador debe ejecutar el runner sobre su build final.
- Regresión completa de271 entradas existentes en ejecución al entregar; no sustituye el CI del PR.

## Revisión final de integración

Los borradores de comentario y revisión se deshabilitan durante el POST compartido: escribir una segunda versión mientras se enviaba la primera podía perder ese texto al completar el guardado. El control negativo falló con los campos editables; la regresión exige bloqueo de ambos campos durante comentario/decisión y desbloqueo conservando el texto tras error. El tamaño táctil usa exclusivamente `size="large"` del botón canónico.
