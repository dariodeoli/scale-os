// Espejo de `asCells` de `ListRow` (app/ui-v2.tsx) para los fixtures estáticos:
// cada hijo directo de una fila `role="row"` es una celda. Los contenedores
// neutros reciben `role="cell"` en el mismo nodo; controles y el resto van en
// una celda `display: contents` (clase `contents`), igual que en la app.
// Archivo con `_`: run.mjs no lo registra como fixture.
const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const PLAIN = new Set(['div', 'span', 'p', 'b', 'strong', 'small', 'em', 'time', 'code', 'output']);
const CELL_ROLES = /\brole="(?:cell|gridcell|rowheader|columnheader)"/;

/** Separa el HTML en nodos de primer nivel (elementos y texto no vacío). */
function topLevel(html) {
  const nodes = [];
  const tag = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
  let depth = 0;
  let start = 0;
  let last = 0;
  let match;
  while ((match = tag.exec(html))) {
    const [token, name, selfClose] = match;
    if (depth === 0 && match.index > last) {
      const text = html.slice(last, match.index);
      if (text.trim()) nodes.push({text});
    }
    if (token.startsWith('<!--')) {
      last = tag.lastIndex;
      continue;
    }
    const lower = name.toLowerCase();
    if (token.startsWith('</')) {
      depth -= 1;
      if (depth === 0) nodes.push({html: html.slice(start, tag.lastIndex)});
    } else if (selfClose || VOID.has(lower)) {
      if (depth === 0) nodes.push({html: token});
    } else {
      if (depth === 0) start = match.index;
      depth += 1;
    }
    last = tag.lastIndex;
  }
  if (last < html.length && html.slice(last).trim()) nodes.push({text: html.slice(last)});
  return nodes;
}

export function asCells(html) {
  return topLevel(html).map((node) => {
    if (node.text) return `<div role="cell" class="contents">${node.text}</div>`;
    const open = node.html.match(/^<([a-zA-Z][\w-]*)\b([^>]*)>/);
    const name = open[1].toLowerCase();
    if (CELL_ROLES.test(open[2])) return node.html;
    if (PLAIN.has(name) && !/\brole="/.test(open[2])) return node.html.replace(/^<([a-zA-Z][\w-]*)/, '<$1 role="cell"');
    return `<div role="cell" class="contents">${node.html}</div>`;
  }).join('');
}

/**
 * Espejo de `ListGrid`/`ListRow` para HTML escrito a mano: celdas en cada fila
 * y el scroll silencioso (`role="table"` + `.silent-scroll`) enfocable con
 * teclado (`tabindex="0"`).
 */
export function mirrorListGrid(html) {
  const focusable = html.replace(/<div role="table"((?![^>]*tabindex)[^>]*class="[^"]*\bsilent-scroll\b[^"]*"[^>]*)>/g, '<div role="table" tabindex="0"$1>');
  return withCells(focusable);
}

/** Aplica `asCells` a cada fila con cuerpo de un fragmento HTML ya armado. */
export function withCells(html) {
  return html.replace(/(<div role="row"(?![^>]*aria-hidden)[^>]*>)/g, '\u0000$1').split('\u0000').map((chunk, index) => {
    if (index === 0) return chunk;
    const open = chunk.match(/^<div role="row"[^>]*>/)[0];
    // Cierre de la fila: el </div> que vuelve la profundidad a cero.
    let depth = 0;
    const tag = /<\/?([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
    tag.lastIndex = 0;
    let match;
    while ((match = tag.exec(chunk))) {
      const [token, name, selfClose] = match;
      if (token.startsWith('</')) {
        depth -= 1;
        if (depth === 0) {
          const inner = chunk.slice(open.length, match.index);
          if (/role="columnheader"/.test(inner)) return chunk;
          return `${open}${asCells(inner)}${chunk.slice(match.index)}`;
        }
      } else if (!selfClose && !VOID.has(name.toLowerCase())) depth += 1;
    }
    return chunk;
  }).join('');
}
