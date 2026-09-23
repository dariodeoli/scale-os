# Fixtures del harness visual (SOS-DSN)

Cada archivo en `fixtures/` exporta (default) un fixture o un array de fixtures.
El harness renderiza el markup con el **CSS construido real** (`.next/static/css`,
incluye los chunks diferidos) y mide en Chrome headless con CDP a los anchos
objetivo (360/390/430/768/1024/1440). Ver `README.md`.

## Formato

```js
export default {
  id: 'clientes-lista',            // único, kebab-case
  section: 'Clientes',             // sección de navegación o superficie (Auth, Portal, Landing…)
  surface: 'Directorio en lista',  // qué parte de la sección representa
  kind: 'workspace' | 'plain' | 'external',
  lists: [/* mediciones de listas */],
  grids: [/* mediciones de cuadrículas */],
  body: `...html...`,
};
```

- `kind: 'workspace'` envuelve el body en el shell real (`main.shell.control-shell`
  con el riel v2 `.desktop-sidebar` —oculto ≤760 y `min-[761px]:!w-48`— y
  `section.content min-[761px]:!w-[calc(100%-192px)]`) para que los anchos de
  contenido sean los de la app. `plain` no envuelve (auth, portal, landing,
  primitivas).
- `kind: 'external'` sirve un documento real del repo y lo instrumenta:
  `{id, section, surface, kind:'external', source:'public/scale-os.html'}`.

## Declaraciones medidas

```js
lists: [{
  container: '.client-hub-list',   // contenedor de la lista
  head: '.client-hub-head-row',    // fila de encabezado (o null)
  row: '.client-hub-card',         // selector de fila dentro del contenedor
  label: 'Clientes · lista',
  template: '--client-cols',       // variable CSS que deben compartir head y fila
  rowHeight: [44, 52],             // contrato de altura de fila
  exemptBelow: 960,                // opcional: no medir altura por debajo de este ancho (lista apilada)
}],
grids: [{container: '.client-hub-grid', card: '.client-hub-card', label: '…', minHeight: 200}]
```

## Reglas de fidelidad

1. **Markup real**: copiar la estructura JSX del componente (`app/*.tsx`) con sus
   clases exactas. Citar en un comentario el archivo y las líneas que se espejan.
2. **Datos de estrés**: nombres/emails/RUC/notas largos, montos grandes
   (`Gs 1.234.567.890`, `USD 12.345,67`), seriales largos, fechas reales. Un
   fixture que solo prueba textos cortos no sirve para encontrar recortes.
3. **Estados representativos**: al menos un estado con dato y uno vacío/sin dato
   cuando el componente reserva la columna; marcá `missing` si la lista no existe.
4. **No tocar archivos de dominio** ni CSS: si el fixture revela un bug, se
   reporta en el baseline; los fixes se despachan aparte.
5. Un fixture por vista medible (lista vs cuadrícula; panel vs modal), no una
   pantalla entera con todo mezclado.

## Cómo verificar tu fixture

```bash
node build-tools/visual-harness/run.mjs --only <id> --widths 390,768,1440 --out work/visual-harness/<tu-nombre>
```

Debe ejecutar sin errores y sin `lista-ausente` / `cuadricula-ausente`
(el selector declarado debe existir). Los hallazgos (`baseline.md`) son el
objetivo del baseline, no un error del fixture.

## Criterios de medición (contrato AGENTS.md)

- Fila de lista: 44–52 px, plantilla compartida con su encabezado, celdas alineadas.
- Cuadrícula: tarjetas ≥200 px, contenido distribuido, acciones al pie.
- Nada de bleed fuera de tarjeta/panel; scroll horizontal silencioso solo donde es intencional.
- Textos cortados: con `title` o sin recorte; montos/fechas/códigos nunca se cortan.
- Superposiciones: ningún par de nodos visibles se pisa.

## Referencias v2 (campaña #41)

`fixtures/referencias-v2.mjs` genera el markup con `renderToStaticMarkup` sobre
`owncoding-ui` y los patrones de `app/ui-v2.tsx`: no se transcriben clases a
mano, así que el fixture queda fiel al render real. Fixtures: `v2-panel`,
`v2-clientes-lista`, `v2-clientes-cuadricula`, `v2-config` y `v2-estados`, con
datos reales del inventario de la campaña (`REDISENO-INVENTARIO.md`).

- `v2-clientes-lista` declara la lista con `container: '[role="table"]'`,
  `head: '[role="row"]'` y `row: '[role="rowgroup"] [role="row"]'`. La plantilla
  v2 es una clase Tailwind compartida (no una variable CSS), así que no se
  declara `template`: el harness igual mide altura de fila y alineación de
  celdas contra el encabezado.
- Espeja las referencias ya implementadas: `app/sections/resumen.tsx`,
  `app/sections/clientes.tsx`, `app/sections/configuracion.tsx`,
  `app/client-directory-toolbar.tsx` y los patrones de `app/ui-v2.tsx`.
- Estado actual: **0 hallazgos** a 360/768/1440 (fila 44–52 px, encabezado y
  filas con la misma plantilla, sin superposiciones ni overflow). Capturas en
  `work/visual-harness/referencias/captures` (`capture.mjs`, claro/oscuro).
