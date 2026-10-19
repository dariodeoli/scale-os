# Scale OS 1.0.197 — publicación verificada

PR: https://github.com/dariodeoli/scale-os/pull/290
Issue: https://github.com/dariodeoli/scale-os/issues/289

- Main: `e04961c4c37383a0828f4b2809cc728637b43f8a`.
- Candidato: `3487e079887e12e7b03b1a69477bde8ed49edc5c`; mismo árbol que main.
- CI candidato: https://github.com/dariodeoli/scale-os/actions/runs/39197899701 — SUCCESS.
- CI main: https://github.com/dariodeoli/scale-os/actions/runs/39198339337 — SUCCESS.
- Prueba pública: **2026-10-19T01:19:30.392657-03:00**, zona America/Asuncion.

Web/status, registro y API devolvieron 200 y versión 1.0.197; la API confirmó
base lista. Dos rondas consecutivas del observador confirmaron estabilidad.
El smoke de seis comprobaciones aprobó también auth/me 401 JSON, proveedores y
mantenimiento por el proxy de la web. En este cloud se ejecutó con
`NODE_USE_ENV_PROXY=1 npm run release:smoke`; la primera invocación sin esa
opción se interrumpió y no se acredita como prueba aprobada.

La landing y los dos archivos CSS que contienen la cabecera y el selector de mes
coinciden **byte a byte** con el build local validado. Ver `public-proof.json`,
`local-ui-assets.json` y `git-content.json`. SHA del contenedor del proveedor no
expuesto: se informa null y no se sustituye por el SHA de GitHub.

## Validación de código

- 271 entradas frontend / 52 fragmentos, build de 64 páginas y tipos PASS.
- 61 scripts backend y 19 grupos generales de navegador PASS.
- Cabeceras: 42 combinaciones de sección/ancho; 60 px recuperados en el patrón
  de escritorio (102 a 42 px).
- Balance real con transporte sintético: seis anchos, tablet con puntero táctil,
  cobros/deudas preservados, inactivos y cambio de mes PASS.
- Selector: 22 comprobaciones de búsqueda, teclado, límites, calendario y tablet.
- Acciones: 605 canónicas / 55 widgets exactos / un renderer / cero sin revisar.

Capturas y resultados de fixtures: [compact-headers-289](../compact-headers-289/README.md).
Son componentes/CSS reales con datos sintéticos, no una sesión autenticada de
producción. No se acredita impresión física, OAuth ni dispositivo físico.

## Integración, datos y límites

Se realizó un único merge; no se llamó otro deploy ni un webhook manual.
No hay migraciones nuevas. Contratado toma el estado **actual** activo; la revisión
de inactivos conserva los acuerdos y movimientos originales. No se inventa una
fecha de baja histórica. Revertir código/manifiestos juntos sin borrar datos.

Impresión del PR #288 permanece separada y pendiente del ensayo físico de 80 mm.
Esta rama agrega evidencia y memoria; no necesita otro despliegue.
