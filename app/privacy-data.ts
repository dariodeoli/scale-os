/**
 * Capa de datos de privacidad (Ley N° 7593/2025) — «Mis datos», consentimientos
 * y solicitudes de derechos.
 *
 * Contrato esperado del API (base técnica de #112, todavía no publicada):
 *   GET  /api/privacy/my-data          → { consents: PrivacyConsent[], requests: PrivacyRequest[] }
 *   POST /api/privacy/consents         → { consent: PrivacyConsent }   (aceptar o revocar)
 *   POST /api/privacy/requests         → { request: PrivacyRequest }   (acceso, rectificación, supresión, oposición)
 *   GET  /api/privacy/my-data/export   → application/json (descarga de la copia)
 *
 * Mientras #112 no esté desplegado, cada llamada cae al **puente local
 * documentado** (criterio ADOPCION-V2):
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
export type PrivacyRequestStatus = 'recibida' | 'identidad' | 'resuelta' | 'rechazada';

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
  myData: '/api/privacy/my-data',
  consents: '/api/privacy/consents',
  requests: '/api/privacy/requests',
  export: '/api/privacy/my-data/export',
} as const;

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
    const data = await response.json().catch(() => null) as Partial<PrivacyData> | null;
    return {
      source: 'api',
      consents: Array.isArray(data?.consents) ? data!.consents : [],
      requests: Array.isArray(data?.requests) ? data!.requests : [],
      exportPath: typeof (data as {exportPath?: unknown})?.exportPath === 'string' ? (data as {exportPath: string}).exportPath : PRIVACY_API_PATHS.export,
    };
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
    response = await privacyFetch(PRIVACY_API_PATHS.requests, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({tipo, detalle})});
  } catch {
    throw new PrivacyApiUnavailableError();
  }
  if (isMissing(response)) throw new PrivacyApiUnavailableError();
  if (!response.ok) {
    const body = await response.json().catch(() => null) as {error?: string} | null;
    throw new Error(body?.error || 'No se pudo registrar la solicitud.');
  }
  const data = await response.json().catch(() => null) as {request?: PrivacyRequest} | null;
  if (!data?.request) throw new Error('El API no devolvió la solicitud registrada.');
  return data.request;
}

/** Revoca (o vuelve a otorgar) un consentimiento con la misma trazabilidad. */
export async function revokePrivacyConsent(finalidad: string, aceptado: boolean): Promise<'api' | 'local'> {
  return registerPrivacyConsent({finalidad, aceptado, canal: 'perfil-mis-datos'});
}

/** Enlaces reales del canal de derechos (siempre disponibles, incluso sin API). */
export const PRIVACY_RIGHTS_LINKS = {
  whatsappUrl: PRIVACY_RIGHTS_CHANNEL.whatsappUrl,
  whatsappLabel: PRIVACY_RIGHTS_CHANNEL.whatsappLabel,
  contactFormUrl: PRIVACY_RIGHTS_CHANNEL.contactFormUrl,
  contactFormLabel: PRIVACY_RIGHTS_CHANNEL.contactFormLabel,
  slaDias: PRIVACY_RIGHTS_CHANNEL.slaDias,
} as const;
