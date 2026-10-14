/**
 * Capa de datos de privacidad (Ley N° 7593/2025) — «Mis datos», consentimientos
 * y solicitudes de derechos.
 *
 * Contrato real del API del titular (backend/personal-data.js, #112):
 *   GET  /api/privacy/me                  → { consents, requests, export: { path } }
 *   POST /api/privacy/me/requests         → { request }   body { type, details }
 *   POST /api/privacy/me/consents/revoke  → { ok, revoked, purposes }   body { purpose, reason }
 *   GET  /api/privacy/me/export           → { export } (JSON; `?format=csv` descarga CSV)
 * Las filas llegan en el vocabulario del API (purpose, request_type, status…)
 * y se traducen acá al modelo de la vista; el contrato público no cambia.
 * `POST /api/privacy/consents` es la alta de consentimientos del equipo
 * (privacy.manage); el registro y las invitaciones la intentan y, si no está
 * disponible para ese visitante, el consentimiento queda en la cola local.
 *
 * Si el API respondiera 404/405/501 o no hubiera red, cada llamada cae al
 * **puente local documentado** (criterio ADOPCION-V2):
 * - la aceptación de un consentimiento real se guarda en el dispositivo
 *   (`scale:privacy-consents`, cola acotada y explícita) para no perder el
 *   registro ni inventar uno en el servidor;
 * - la vista «Mis datos» avisa que la base del API está pendiente y ofrece el
 *   canal de derechos real (WhatsApp / formulario), sin estados ni pedidos
 *   falsos;
 * - nunca se simula una solicitud resuelta, un export ni una revocación que el
 *   servidor no haya confirmado.
 */

import {registroConsentimiento} from 'owncoding-ui';
import {PRIVACY_NOTICE,PRIVACY_RIGHTS_CHANNEL} from './privacy-notice';

export type PrivacyConsent = {
  finalidad: string;
  aceptado: boolean;
  version: string;
  fecha: string;
  canal: string;
  titular?: string;
};

export type PrivacyRequestKind = 'acceso' | 'rectificacion' | 'supresion' | 'oposicion' | 'portabilidad';
export type PrivacyRequestStatus = 'recibida' | 'identidad' | 'en_revision' | 'resuelta' | 'rechazada' | 'cancelada';

export type PrivacyRequest = {
  id: string;
  tipo: PrivacyRequestKind;
  estado: PrivacyRequestStatus;
  created_at: string;
  /** Vencimiento del SLA (≤30 días corridos desde la recepción). */
  due_at: string;
  detalle?: string;
  motivo?: string;
};

export type PrivacyData = {
  source: 'api' | 'bridge';
  consents: PrivacyConsent[];
  requests: PrivacyRequest[];
  /** Ruta de descarga de la copia cuando el API la ofrece. */
  exportPath: string | null;
};

export const PRIVACY_API_PATHS = {
  myData: '/api/privacy/me',
  consents: '/api/privacy/consents',
  requests: '/api/privacy/me/requests',
  revoke: '/api/privacy/me/consents/revoke',
  export: '/api/privacy/me/export',
} as const;

/** Tipos de solicitud: vista ↔ API (`REQUEST_TYPES` de backend/personal-data.js). */
export const PRIVACY_REQUEST_TYPE_API: Record<PrivacyRequestKind, string> = {acceso: 'access', rectificacion: 'rectification', supresion: 'suppression', oposicion: 'opposition', portabilidad: 'portability'};
const REQUEST_KIND_FROM_API = Object.fromEntries(Object.entries(PRIVACY_REQUEST_TYPE_API).map(([kind, api]) => [api, kind])) as Record<string, PrivacyRequestKind>;
/** Estados del API (`REQUEST_STATUSES`) en el vocabulario de la vista. */
const REQUEST_STATUS_FROM_API: Record<string, PrivacyRequestStatus> = {received: 'recibida', identity_verified: 'identidad', in_review: 'en_revision', resolved: 'resuelta', rejected: 'rechazada', cancelled: 'cancelada'};

/**
 * Finalidades de la vista (`PRIVACY_PURPOSES` de privacy-notice) ↔ finalidades
 * del API (`PRIVACY_PURPOSES` de backend/personal-data.js). «Operación de tu
 * agencia» abarca la prestación y los cobros del espacio de trabajo.
 */
export const PRIVACY_PURPOSE_API: Record<string, string[]> = {
  'cuenta-y-prestacion': ['account'],
  'operacion-agencia': ['service', 'billing'],
  'portal-cliente': ['portal'],
  'contacto-comercial': ['contact'],
};
const PURPOSE_FROM_API = Object.fromEntries(Object.entries(PRIVACY_PURPOSE_API).flatMap(([id, apis]) => apis.map(api => [api, id]))) as Record<string, string>;

type ApiConsent = {purpose?: unknown; notice_version?: unknown; source?: unknown; granted_at?: unknown; revoked_at?: unknown};
type ApiRequest = {id?: unknown; request_type?: unknown; status?: unknown; details?: unknown; rejection_reason?: unknown; received_at?: unknown; due_at?: unknown};
const text = (value: unknown) => typeof value === 'string' ? value : '';

/** Consentimiento del API → vista: vigente si no tiene `revoked_at`. */
export function consentFromApi(row: ApiConsent): PrivacyConsent | null {
  const purpose = text(row?.purpose);
  if (!purpose) return null;
  const finalidad = PURPOSE_FROM_API[purpose] || purpose;
  const revoked = text(row.revoked_at);
  return {finalidad, aceptado: !revoked, version: text(row.notice_version), fecha: revoked || text(row.granted_at), canal: text(row.source)};
}

/** Solicitud del API → vista; descarta filas con tipo o estado desconocidos. */
export function requestFromApi(row: ApiRequest): PrivacyRequest | null {
  const tipo = REQUEST_KIND_FROM_API[text(row?.request_type)], estado = REQUEST_STATUS_FROM_API[text(row?.status)];
  if (!tipo || !estado || row.id === undefined || row.id === null) return null;
  const detalle = text(row.details), motivo = text(row.rejection_reason);
  return {id: String(row.id), tipo, estado, created_at: text(row.received_at), due_at: text(row.due_at), ...(detalle ? {detalle} : {}), ...(motivo ? {motivo} : {})};
}

/** Issue de la base técnica pendiente (se cita en la UI, nunca como dato falso). */
export const PRIVACY_API_ISSUE = 112;
/** Clave de la cola local de consentimientos (puente, por dispositivo). */
export const PRIVACY_PENDING_CONSENTS_KEY = 'scale:privacy-consents';
/** Máximo de registros locales: una cola explícita, no un historial paralelo. */
export const PRIVACY_PENDING_CONSENTS_LIMIT = 30;

export class PrivacyApiUnavailableError extends Error {
  constructor() {
    super('La base de solicitudes todavía no está disponible.');
    this.name = 'PrivacyApiUnavailableError';
  }
}

async function privacyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`/core-api${path}`, {credentials: 'include', cache: 'no-store', referrerPolicy: 'no-referrer', ...init});
}

/** true cuando el endpoint existe en el API desplegado (404/501 lo marcan pendiente). */
function isMissing(response: Response): boolean {
  return response.status === 404 || response.status === 501 || response.status === 405;
}

function readPending(): PrivacyConsent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PRIVACY_PENDING_CONSENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PrivacyConsent => Boolean(item && typeof item === 'object' && typeof (item as PrivacyConsent).finalidad === 'string' && typeof (item as PrivacyConsent).version === 'string'));
  } catch {
    return [];
  }
}

function writePending(records: PrivacyConsent[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRIVACY_PENDING_CONSENTS_KEY, JSON.stringify(records.slice(-PRIVACY_PENDING_CONSENTS_LIMIT)));
  } catch {
    /* Sin almacenamiento local el consentimiento sigue válido en el flujo; sólo no queda la cola. */
  }
}

/**
 * Registra una aceptación o revocación real. Primero intenta el API de #112;
 * si todavía no está, la encola en el dispositivo y devuelve `local` para que
 * la UI lo diga con todas las letras.
 */
export async function registerPrivacyConsent(input: Omit<PrivacyConsent,'aceptado'|'version'|'fecha'|'canal'> & {aceptado?: boolean; canal?: string; fecha?: Date | string; version?: string}): Promise<'api' | 'local'> {
  const record = registroConsentimiento({
    finalidad: input.finalidad,
    aceptado: input.aceptado !== false,
    version: input.version || PRIVACY_NOTICE.version,
    canal: input.canal || 'web',
    fecha: input.fecha ? new Date(input.fecha) : new Date(),
    titular: input.titular || '',
  }) as PrivacyConsent;
  try {
    const response = await privacyFetch(PRIVACY_API_PATHS.consents, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(record)});
    if (isMissing(response)) throw new PrivacyApiUnavailableError();
    if (!response.ok) throw new Error('No se pudo registrar el consentimiento.');
    return 'api';
  } catch (error) {
    if (error instanceof PrivacyApiUnavailableError) {
      writePending([...readPending(), record]);
      return 'local';
    }
    // Sin conexión tampoco se pierde el registro del dispositivo.
    if (error instanceof TypeError) {
      writePending([...readPending(), record]);
      return 'local';
    }
    throw error;
  }
}

/** Consentimientos registrados sólo en este dispositivo (puente visible en «Mis datos»). */
export function pendingPrivacyConsents(): PrivacyConsent[] {
  return readPending();
}

/**
 * Encola una aceptación ya otorgada sin esperar al API. Es el canal OAuth: el
 * navegador sale del sitio antes de que la petición pueda confirmarse, así que
 * el registro real (con su versión, fecha y canal) queda en el dispositivo y el
 * API lo recibe cuando la base de #112 esté disponible.
 */
export function queuePrivacyConsent(input: {finalidad: string; canal: string; titular?: string; version?: string}): PrivacyConsent {
  const record = registroConsentimiento({finalidad: input.finalidad, aceptado: true, version: input.version || PRIVACY_NOTICE.version, canal: input.canal, fecha: new Date(), titular: input.titular || ''}) as PrivacyConsent;
  writePending([...readPending(), record]);
  return record;
}

/**
 * Estado de «Mis datos». Con el API de #112 responde completo; sin él devuelve
 * el puente local y `exportPath: null` (sin datos inventados).
 */
export async function loadPrivacyData(): Promise<PrivacyData> {
  try {
    const response = await privacyFetch(PRIVACY_API_PATHS.myData);
    if (isMissing(response)) throw new PrivacyApiUnavailableError();
    if (!response.ok) throw new Error('No se pudo consultar tus datos.');
    const data = await response.json().catch(() => null) as {consents?: unknown; requests?: unknown; export?: {path?: unknown}} | null;
    // El API ordena los consentimientos del más nuevo al más viejo; la vista los
    // recorre en orden cronológico y toma el último registro de cada finalidad.
    const consents = (Array.isArray(data?.consents) ? data!.consents as ApiConsent[] : []).map(consentFromApi).filter((row): row is PrivacyConsent => row !== null).reverse();
    const requests = (Array.isArray(data?.requests) ? data!.requests as ApiRequest[] : []).map(requestFromApi).filter((row): row is PrivacyRequest => row !== null);
    const exportPath = typeof data?.export?.path === 'string' && data.export.path.startsWith('/api/privacy/me') ? data.export.path : PRIVACY_API_PATHS.export;
    return {source: 'api', consents, requests, exportPath};
  } catch (error) {
    if (error instanceof PrivacyApiUnavailableError || error instanceof TypeError) {
      return {source: 'bridge', consents: readPending(), requests: [], exportPath: null};
    }
    throw error;
  }
}

/**
 * Crea una solicitud real de derechos. Sin la base de #112 no se inventa el
 * pedido: se lanza el error y la UI ofrece el canal alternativo.
 */
export async function requestPrivacyAction(tipo: PrivacyRequestKind, detalle = ''): Promise<PrivacyRequest> {
  let response: Response;
  try {
    response = await privacyFetch(PRIVACY_API_PATHS.requests, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({type: PRIVACY_REQUEST_TYPE_API[tipo], details: detalle})});
  } catch {
    throw new PrivacyApiUnavailableError();
  }
  if (isMissing(response)) throw new PrivacyApiUnavailableError();
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?: string} | null;
    throw new Error(body?.error || 'No se pudo registrar la solicitud.');
  }
  const data = await response.json().catch(() => null) as {request?: ApiRequest} | null;
  const request = data?.request ? requestFromApi(data.request) : null;
  if (!request) throw new Error('El API no devolvió la solicitud registrada.');
  return request;
}

/** Revoca (o vuelve a otorgar) un consentimiento con la misma trazabilidad. */
export async function revokePrivacyConsent(finalidad: string, aceptado: boolean): Promise<'api' | 'local'> {
  if (aceptado) return registerPrivacyConsent({finalidad, aceptado, canal: 'perfil-mis-datos'});
  let response: Response;
  try {
    response = await privacyFetch(PRIVACY_API_PATHS.revoke, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({purpose: PRIVACY_PURPOSE_API[finalidad] || finalidad, reason: 'Revocado por el titular desde «Mis datos»'})});
  } catch (error) {
    if (error instanceof TypeError) return registerPrivacyConsent({finalidad, aceptado: false, canal: 'perfil-mis-datos'});
    throw error;
  }
  if (isMissing(response)) return registerPrivacyConsent({finalidad, aceptado: false, canal: 'perfil-mis-datos'});
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?: string} | null;
    throw new Error(body?.error || 'No se pudo revocar el consentimiento.');
  }
  return 'api';
}

/** Enlaces reales del canal de derechos (siempre disponibles, incluso sin API). */
export const PRIVACY_RIGHTS_LINKS = {
  whatsappUrl: PRIVACY_RIGHTS_CHANNEL.whatsappUrl,
  whatsappLabel: PRIVACY_RIGHTS_CHANNEL.whatsappLabel,
  contactFormUrl: PRIVACY_RIGHTS_CHANNEL.contactFormUrl,
  contactFormLabel: PRIVACY_RIGHTS_CHANNEL.contactFormLabel,
  slaDias: PRIVACY_RIGHTS_CHANNEL.slaDias,
} as const;
