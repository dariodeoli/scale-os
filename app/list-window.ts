// Ventanas de lista (#105): la pantalla pide una página explícita al API
// (`?limit`/`?offset`) y ofrece «Ver más» mientras `page.hasMore`, con un
// contador honesto (`page.total`). Sin `page` (respuestas viejas o listas
// completas) todo se comporta como antes: la ventana es aditiva.
export type ListPage = { limit: number; offset: number; hasMore: boolean; total: number };

/** Tamaño de la ventana por lista: acota el payload sin esconder trabajo diario. */
export const LIST_WINDOW = { clients: 120, budgets: 60, plans: 60, leads: 300, leadsColumns: 40 } as const;

/** `page` del API cuando es válido; cualquier otra forma se ignora (contrato viejo). */
export function readPage(value: unknown): ListPage | null {
  if (!value || typeof value !== 'object') return null;
  const { limit, offset, hasMore, total } = value as Record<string, unknown>;
  if (!Number.isInteger(limit) || !Number.isInteger(offset) || typeof hasMore !== 'boolean' || !Number.isInteger(total)) return null;
  return { limit: limit as number, offset: offset as number, hasMore: hasMore as boolean, total: total as number };
}

/** Cursor de la ventana: cuántas filas hay en memoria y si el API promete más. */
export type ListWindowState = { loaded: number; hasMore: boolean; total: number | null };

export const EMPTY_WINDOW: ListWindowState = { loaded: 0, hasMore: false, total: null };

/** Estado de la ventana a partir de la respuesta (sin `page` no hay promesa de más). */
export function windowStateOf(page: ListPage | null, received: number): ListWindowState {
  return page ? { loaded: received, hasMore: page.hasMore, total: page.total } : { loaded: received, hasMore: false, total: null };
}

/** Etiqueta honesta: «Mostrando 60 de 320 presupuestos» (sin total no inventa el faltante). */
export function windowLabel(shown: number, total: number | null | undefined, singular: string, plural: string) {
  const conFaltantes = total !== null && total !== undefined && total > shown;
  // Con total, el sustantivo concuerda con el universo («1 de 320 presupuestos»);
  // sin total concuerda con lo mostrado («1 cliente»).
  const etiqueta = (conFaltantes ? (total as number) : shown) === 1 ? singular : plural;
  return conFaltantes ? `Mostrando ${shown} de ${total} ${etiqueta}` : `Mostrando ${shown} ${etiqueta}`;
}

/** Suma una página nueva sin duplicar filas (mismo `id` = misma fila). */
export function appendPage<T extends { id?: unknown }>(current: T[], incoming: readonly T[]): T[] {
  if (!incoming.length) return current;
  const seen = new Set(current.map(item => String(item.id)));
  return [...current, ...incoming.filter(item => !seen.has(String(item.id)))];
}

/** Cantidad de filas a montar: la ventana completa o el total si es menor. */
export function windowSlice<T>(rows: readonly T[], size: number): T[] {
  return rows.length <= size ? [...rows] : rows.slice(0, size);
}
