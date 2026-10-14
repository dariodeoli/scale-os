// Exportaciones CSV sin inyección de fórmulas (guía superadmin §6). Fuente única
// del front; espejo exacto de backend/csv-safety.js (test de paridad en
// tests/csv-safety.test.ts). Una celda que empieza con = + @ - (o tab/CR, con o
// sin espacios delante) se abre como fórmula en la planilla: se antepone `'`.
// Pasan tal cual los números estrictos (-12.5) y el teléfono normalizado.
const FORMULA_START = /^\s*[=+\-@]|^[\t\r\n]/;
const SAFE_LITERAL = /^(?:-?\d+(?:\.\d+)?|\+\d+(?: \d+)*)$/;

/** Texto plano de la celda con el prefijo `'` cuando podría ejecutarse como fórmula. */
export function neutralizeCsvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : value instanceof Date ? value.toISOString() : typeof value === "boolean" ? (value ? "Sí" : "No") : String(value);
  return FORMULA_START.test(text) && !SAFE_LITERAL.test(text) ? `'${text}` : text;
}

/** Celda lista para unir: neutralizada y entre comillas si hace falta (o siempre con `quote`). */
export function csvCell(value: unknown, {delimiter = ",", quote = false}: {delimiter?: string; quote?: boolean} = {}) {
  const text = neutralizeCsvValue(value);
  return quote || text.includes(delimiter) || /[",\r\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
