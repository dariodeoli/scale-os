import {fail} from './suite-validation.js';

// Proyección y ventana opcionales para listas (#71, reseña #67): `?fields=` es
// una lista blanca por endpoint y `?limit=` compone con ella. Sin parámetros el
// contrato no cambia (payload completo, todas las filas).
export function parseListFields(raw, allowed, label = 'campos') {
 if (raw === null || raw === undefined) return null;
 const requested = [...new Set(String(raw).split(',').map(field => field.trim()).filter(Boolean))];
 const invalid = requested.filter(field => !allowed.includes(field));
 if (!requested.length || invalid.length) {
  fail(invalid.length ? `Campos inválidos: ${invalid.slice(0, 6).join(', ')}` : `Elegí al menos un ${label}`);
 }
 return requested.includes('id') ? requested : ['id', ...requested];
}

export function parseListLimit(url, max = 500) {
 const raw = url.searchParams.get('limit');
 if (raw === null) return null;
 const limit = Number(raw);
 if (!Number.isSafeInteger(limit) || limit < 1 || limit > max) fail(`Paginación inválida: limit entre 1 y ${max}`);
 return limit;
}

/** Corta la lista a `limit` filas y reporta si quedó más; sin limit no toca nada. */
export function limitRows(rows, limit) {
 if (limit === null || limit === undefined) return {rows, hasMore: null};
 const hasMore = rows.length > limit;
 return {rows: hasMore ? rows.slice(0, limit) : rows, hasMore};
}

/** Recorte final por lista blanca: la respuesta lleva solo los campos pedidos. */
export function projectRows(rows, fields) {
 if (!fields) return rows;
 return rows.map(row => {
  const out = {id: row.id};
  for (const field of fields) if (Object.hasOwn(row, field)) out[field] = row[field];
  return out;
 });
}

/** Lista de expresiones SQL de los campos pedidos; sin proyección usa el fallback. */
export function projectionSelect(fields, columns, fallback) {
 if (!fields) return fallback;
 const expressions = [...new Set(fields.map(field => columns[field]).filter(Boolean))];
 return expressions.length ? expressions.join(', ') : fallback;
}

/**
 * Garantiza `as <campo>` en cada expresión del mapa (salvo las ya aliasadas):
 * una proyección debe devolver exactamente el nombre del campo pedido.
 */
export function aliasColumns(map) {
 return Object.fromEntries(Object.entries(map).map(([field, expression]) => {
  const text = String(expression).trim();
  return [field, /\bas\s+"?[A-Za-z_][A-Za-z0-9_]*"?$/.test(text) ? text : `${text} as ${field}`];
 }));
}

/** Cierra la respuesta de una lista con la ventana aplicada (hasMore si hay limit). */
export function listResponse(key, rows, fields, limit) {
 const limited = limitRows(projectRows(rows, fields), limit);
 return {[key]: limited.rows, ...(limit !== null ? {hasMore: limited.hasMore} : {})};
}
