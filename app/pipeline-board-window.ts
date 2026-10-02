/**
 * Ventana visible del tablero de Pipeline (Refs #140): con qué columnas cuenta
 * el indicador de «fuera de vista» y cuántas quedan a cada lado. Lógica pura
 * para poder testear el conteo sin medir el DOM.
 */
export type BoardColumnWindow = {
  /** Índice de la primera columna visible (-1 si no hay ninguna). */
  from: number;
  /** Índice de la última columna visible. */
  to: number;
  total: number;
  hiddenBefore: number;
  hiddenAfter: number;
  hiddenTotal: number;
};

export function boardColumnWindow(
  columns: ReadonlyArray<{start: number; size: number}>,
  scrollLeft: number,
  viewport: number,
): BoardColumnWindow {
  const total = columns.length;
  if (!total || !Number.isFinite(scrollLeft) || !Number.isFinite(viewport) || viewport <= 0) {
    return {from: 0, to: 0, total, hiddenBefore: 0, hiddenAfter: 0, hiddenTotal: 0};
  }
  const left = scrollLeft;
  const right = scrollLeft + viewport;
  let from = -1;
  let to = -1;
  columns.forEach((column, index) => {
    const start = column.start;
    const end = column.start + column.size;
    // Una columna parcialmente asomada ya cuenta como visible: el usuario la ve.
    if (end > left + 1 && start < right - 1) {
      if (from < 0) from = index;
      to = index;
    }
  });
  if (from < 0) {
    // Sin columnas en el viewport (p. ej. scroll más allá), se reporta la más cercana.
    from = scrollLeft <= 0 ? 0 : total - 1;
    to = from;
  }
  return {from, to, total, hiddenBefore: from, hiddenAfter: total - 1 - to, hiddenTotal: total - (to - from + 1)};
}
