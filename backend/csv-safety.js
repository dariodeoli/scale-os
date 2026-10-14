// Exportaciones CSV sin inyección de fórmulas (guía superadmin §6).
// Una celda que empieza con = + @ - (o tab/CR, con o sin espacios delante) se
// abre como fórmula en Excel/Sheets/LibreOffice; se le antepone un apóstrofo.
// Pasan tal cual los números estrictos (-12.5) y el teléfono normalizado
// (+595 981123456), que no son fórmulas. Espejo exacto de app/csv-safety.ts
// (el test de paridad corre la misma tabla contra los dos).
const FORMULA_START=/^\s*[=+\-@]|^[\t\r\n]/;
const SAFE_LITERAL=/^(?:-?\d+(?:\.\d+)?|\+\d+(?: \d+)*)$/;

/** Texto plano de la celda con el prefijo `'` cuando podría ejecutarse como fórmula. */
export function neutralizeCsvValue(value){
 const text=value===null||value===undefined?'':value instanceof Date?value.toISOString():typeof value==='boolean'?(value?'Sí':'No'):String(value);
 return FORMULA_START.test(text)&&!SAFE_LITERAL.test(text)?`'${text}`:text;
}

/** Celda lista para unir: neutralizada y entre comillas si hace falta (o siempre con `quote`). */
export function csvCell(value,{delimiter=',',quote=false}={}){
 const text=neutralizeCsvValue(value);
 return quote||text.includes(delimiter)||/[",\r\n;]/.test(text)?`"${text.replaceAll('"','""')}"`:text;
}

/** Filas → CSV (CRLF), con BOM opcional para que la planilla respete acentos. */
export function csvRows(rows,{delimiter=',',quote=false,bom=false}={}){
 return (bom?'﻿':'')+rows.map(row=>row.map(value=>csvCell(value,{delimiter,quote})).join(delimiter)).join('\r\n')+'\r\n';
}
