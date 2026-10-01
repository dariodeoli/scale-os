'use client';
/**
 * «Carga con IA» Fase 2 — ejecución financiera de `registrar_cobro` (Refs #121).
 *
 * El motor server-side (#119) propone la acción con el cliente existente
 * resuelto (id o candidatos); la UI (#120) confirma; acá vive la ejecución real
 * con los flujos de Finanzas:
 * - valida la forma de la acción (cliente, monto Gs entero, fecha, detalle) y
 *   rechaza sin efectos;
 * - advierte duplicados (mismo cliente + monto + fecha) y exige decisión
 *   explícita antes de registrar de nuevo;
 * - registra con `POST /api/agency/payments`, en su variante por cliente
 *   (`clientId`), que aplica FIFO sobre las facturas con saldo y conserva
 *   permisos, auditoría, aislamiento e idempotencia (`requestId`).
 *
 * La cuenta de ingreso es un dato del mundo real que la IA no puede adivinar:
 * la confirmación la elige (`cargarCuentasCobro` + `cuentaSugeridaIa`), nunca
 * se registra dinero en una cuenta supuesta.
 */
import {api} from './operations';
import {todayAsuncion} from './client-format';

export const IA_COBRO_TIPO = 'registrar_cobro';
export const IA_COBRO_DETALLE_MAX = 120;
const MONTO_MAX = 999_999_999_999;

/** Acción lista para ejecutar: cliente resuelto, monto en guaraníes y fecha. */
export type IaCobro = {clienteId: string; monto: number; fecha: string; detalle: string};
export type IaCuentaCobro = {id: string; name: string; currency: string; institution: string | null; accountNumber: string | null; holderName: string | null};
/** Parte de una división (#133): cada una entra a una cuenta real. */
export type IaCobroParte = {accountId: string; amount: number};
export type IaCobroPago = {id: string; invoiceId: string; invoiceNumber: string | null; amount: number; receivedOn: string; reference: string | null; accountId: string | null};
export type IaCobroResultado =
 | {estado: 'registrado'; pagos: IaCobroPago[]; total: number; yaRegistrado: boolean; parcial: boolean; pending: number}
 | {estado: 'duplicado'; duplicados: IaCobroPago[]};

export const IA_COBRO_PARTES_MIN = 2;
export const IA_COBRO_PARTES_MAX = 5;

const record = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '');
const id = (value: unknown) => {
 const raw = value === null || value === undefined ? '' : String(value).trim();
 return /^[1-9]\d{0,18}$/.test(raw) ? raw : '';
};
const fechaValida = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
const montoEntero = (value: unknown): number | null => {
 if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 && value <= MONTO_MAX ? value : null;
 if (typeof value !== 'string') return null;
 const raw = value.trim();
 if (!/^[1-9]\d*$/.test(raw)) return null;
 const numero = Number(raw);
 return Number.isSafeInteger(numero) && numero > 0 && numero <= MONTO_MAX ? numero : null;
};

/**
 * Normaliza la acción del motor (#119) sin confiar en su forma: acepta el
 * cliente como id o como objeto, tolera `fecha` ausente (se registra hoy, con
 * aviso visible) y recorta el detalle al límite del contrato de cobros.
 */
export function normalizarAccionCobro(accion: unknown): {cobro: IaCobro | null; avisos: string[]} {
 const fila = record(accion);
 const avisos = list(fila.avisos).filter((item): item is string => typeof item === 'string').map(item => text(item)).filter(Boolean).slice(0, 8);
 const tipo = text(fila.tipo ?? fila.type ?? fila.accion);
 if (tipo && tipo !== IA_COBRO_TIPO) return {cobro: null, avisos: [...avisos, 'La acción propuesta no es un cobro.']};
 const clienteFila = record(fila.cliente);
 const clienteId = id(typeof fila.cliente === 'string' || typeof fila.cliente === 'number' ? fila.cliente : clienteFila.id ?? clienteFila.clienteId ?? clienteFila.clientId ?? fila.clienteId ?? fila.clientId);
 const candidatos = list(clienteFila.candidatos ?? fila.candidatos).length;
 if (!clienteId) {
  avisos.push(candidatos ? 'Elegí a qué cliente corresponde el cobro.' : 'Falta el cliente del cobro.');
  return {cobro: null, avisos};
 }
 const monto = montoEntero(fila.monto ?? fila.amount);
 if (monto === null) {
  avisos.push('El monto debe ser un entero en guaraníes mayor a cero.');
  return {cobro: null, avisos};
 }
 const fechaPedida = text(fila.fecha ?? fila.receivedOn);
 let fecha = todayAsuncion();
 if (fechaPedida) {
  if (!fechaValida(fechaPedida)) {
   avisos.push('La fecha del cobro no parece válida.');
   return {cobro: null, avisos};
  }
  fecha = fechaPedida;
 } else avisos.push('Sin fecha en el pedido: se registra con la fecha de hoy.');
 let detalle = text(fila.detalle ?? fila.reference);
 if (detalle.length > IA_COBRO_DETALLE_MAX) {
  avisos.push(`El detalle se recortó a ${IA_COBRO_DETALLE_MAX} caracteres.`);
  detalle = detalle.slice(0, IA_COBRO_DETALLE_MAX);
 }
 return {cobro: {clienteId, monto, fecha, detalle}, avisos};
}

/** Mensaje del primer problema de la acción, o `null` si está lista. */
export function validarCobroIa(cobro: IaCobro, hoy = todayAsuncion()): string | null {
 if (!/^[1-9]\d{0,18}$/.test(cobro.clienteId)) return 'Elegí el cliente que pagó.';
 if (!Number.isSafeInteger(cobro.monto) || cobro.monto <= 0 || cobro.monto > MONTO_MAX) return 'El monto debe ser un entero en guaraníes mayor a cero.';
 if (!fechaValida(cobro.fecha)) return 'La fecha del cobro no parece válida.';
 if (cobro.fecha < '2000-01-01') return 'La fecha del cobro no parece válida.';
 if (cobro.fecha > hoy) return 'La fecha del cobro no puede ser futura.';
 if (cobro.detalle.length > IA_COBRO_DETALLE_MAX) return `El detalle no puede superar ${IA_COBRO_DETALLE_MAX} caracteres.`;
 return null;
}

/** Cuentas activas de ingreso; el selector de la confirmación las usa tal cual. */
export async function cargarCuentasCobro(): Promise<IaCuentaCobro[]> {
 const data = await api<{accounts?: unknown}>(`/api/agency/accounts`);
 return list(data?.accounts)
  .map(item => {
   const fila = record(item);
   return {id: id(fila.id), name: text(fila.name), currency: text(fila.currency), institution: text(fila.institution) || null, accountNumber: text(fila.account_number) || null, holderName: text(fila.holder_name) || null, active: fila.active !== false};
  })
  .filter(cuenta => cuenta.id && cuenta.name && cuenta.currency && cuenta.active)
  .map(({id: cuentaId, name, currency, institution, accountNumber, holderName}) => ({id: cuentaId, name, currency, institution, accountNumber, holderName}))
  .sort((a, b) => a.currency.localeCompare(b.currency) || a.name.localeCompare(b.name, 'es'));
}

/**
 * Método real de la cuenta para la confirmación (#133): banco/institución y
 * número o alias visibles; nunca un selector vacío ni «cuenta 1».
 */
export function metodoCuentaIa(cuenta: IaCuentaCobro): string {
 const banco = cuenta.institution || cuenta.name;
 return cuenta.accountNumber ? `${banco} · ${cuenta.accountNumber}` : banco;
}

/** Línea de detalle de la cuenta elegida (titular), o `''` si no hay más datos. */
export function detalleCuentaIa(cuenta: IaCuentaCobro): string {
 return [cuenta.institution && cuenta.institution !== cuenta.name ? `Institución: ${cuenta.institution}` : null, cuenta.accountNumber ? `Nº o alias: ${cuenta.accountNumber}` : null, cuenta.holderName ? `Titular: ${cuenta.holderName}` : null].filter(Boolean).join(' · ');
}

/** Partes de una división: cuentas reales, importes enteros y suma exacta. */
export function validarPartesIa(partes: readonly IaCobroParte[], total: number): string | null {
 if (partes.length < IA_COBRO_PARTES_MIN) return `Una división necesita al menos ${IA_COBRO_PARTES_MIN} partes.`;
 if (partes.length > IA_COBRO_PARTES_MAX) return `Una división admite hasta ${IA_COBRO_PARTES_MAX} partes.`;
 for (const parte of partes) {
  if (!/^[1-9]\d{0,18}$/.test(parte.accountId)) return 'Elegí la cuenta de cada parte.';
  if (!Number.isSafeInteger(parte.amount) || parte.amount <= 0 || parte.amount > MONTO_MAX) return 'Cada parte necesita un importe entero mayor a cero.';
 }
 const suma = partes.reduce((acc, parte) => acc + parte.amount, 0);
 if (suma !== total) return `La suma de las partes (${suma.toLocaleString('es-PY')}) debe coincidir con el monto del cobro (${total.toLocaleString('es-PY')}).`;
 return null;
}

/** Cuentas de la moneda del cobro (la acción es en guaraníes por contrato). */
export function cuentasCobroIa(cuentas: readonly IaCuentaCobro[], currency = 'PYG'): IaCuentaCobro[] {
 return cuentas.filter(cuenta => cuenta.currency === currency);
}

/** Única cuenta activa de la moneda, o `null` si hay que elegir a mano. */
export function cuentaSugeridaIa(cuentas: readonly IaCuentaCobro[], currency = 'PYG'): string | null {
 const candidatas = cuentasCobroIa(cuentas, currency);
 return candidatas.length === 1 ? candidatas[0].id : null;
}

function normalizarPago(value: unknown): IaCobroPago {
 const fila = record(value);
 return {
  id: String(fila.id ?? ''),
  invoiceId: String(fila.invoice_id ?? fila.invoiceId ?? ''),
  invoiceNumber: typeof fila.invoice_number === 'string' ? fila.invoice_number : typeof fila.invoiceNumber === 'string' ? fila.invoiceNumber : null,
  amount: Number(fila.amount ?? 0),
  receivedOn: text(fila.received_on ?? fila.receivedOn),
  reference: text(fila.reference) || null,
  accountId: fila.account_id !== undefined && fila.account_id !== null ? String(fila.account_id) : fila.accountId !== undefined && fila.accountId !== null ? String(fila.accountId) : null,
 };
}

/**
 * Cobros recientes que coinciden en cliente + monto + fecha (sin reversión):
 * la misma frase repetida no se registra dos veces sin decisión explícita.
 */
export async function buscarCobrosDuplicados(cobro: IaCobro): Promise<IaCobroPago[]> {
 const data = await api<{payments?: unknown}>(`/api/agency/payments`);
 return list(data?.payments)
  .map(item => ({pago: normalizarPago(item), fila: record(item)}))
  .filter(({pago, fila}) => Boolean(pago.id && pago.invoiceId && !fila.reversal_id
   && String(fila.client_id ?? '') === cobro.clienteId
   && pago.receivedOn === cobro.fecha
   && Math.round(pago.amount * 100) === Math.round(cobro.monto * 100)))
  .map(({pago}) => pago);
}

/**
 * Ejecuta el cobro con el endpoint real de pagos en su variante por cliente.
 * Admite una sola cuenta (`accountId`) o una **división en partes** (`partes`),
 * y permite montos menores al saldo (seña/parcial): la respuesta informa
 * `parcial` y el pendiente restante. Sin `permitirDuplicado`, un cobro idéntico
 * reciente devuelve `{estado:'duplicado'}` y **no escribe nada**; la UI pide la
 * decisión y vuelve a llamar con la bandera. `requestId` mantiene la
 * idempotencia entre reintentos (incluido el lote dividido).
 */
export async function registrarCobroDesdeIa({cobro, accountId, partes, receivedByUserId, requestId, permitirDuplicado = false}: {cobro: IaCobro; accountId?: string; partes?: readonly IaCobroParte[]; receivedByUserId?: string | null; requestId?: string; permitirDuplicado?: boolean}): Promise<IaCobroResultado> {
 const invalido = validarCobroIa(cobro);
 if (invalido) throw new Error(invalido);
 const dividido = Array.isArray(partes) && partes.length > 0;
 if (dividido) {
  const partesError = validarPartesIa(partes!, cobro.monto);
  if (partesError) throw new Error(partesError);
 } else if (!id(accountId)) throw new Error('Elegí la cuenta donde entró el cobro.');
 const duplicados = await buscarCobrosDuplicados(cobro);
 if (duplicados.length && !permitirDuplicado) return {estado: 'duplicado', duplicados};
 const data = await api<{payments?: unknown; payment?: unknown; total?: unknown; alreadyRecorded?: boolean; parcial?: unknown; pending?: unknown}>(`/api/agency/payments`, {
  clientId: cobro.clienteId,
  ...(dividido ? {parts: partes!.map(parte => ({accountId: parte.accountId, amount: parte.amount}))} : {accountId}),
  amount: cobro.monto,
  receivedOn: cobro.fecha,
  reference: cobro.detalle,
  ...(receivedByUserId ? {receivedByUserId} : {}),
  requestId: requestId || crypto.randomUUID(),
 });
 const filas = list(data?.payments).length ? list(data?.payments) : [data?.payment].filter(Boolean);
 return {estado: 'registrado', pagos: filas.map(normalizarPago), total: Number(data?.total ?? cobro.monto), yaRegistrado: data?.alreadyRecorded === true, parcial: data?.parcial === true, pending: Number(data?.pending ?? 0)};
}
