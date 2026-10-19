"use client";
import {dataFetch} from './data-cache';
import {notifyMutation} from './feedback';

// Transporte compartido del workspace (extraído de app/scale-workspace.tsx, issue #47).
// El shell lo usa como «datos compartidos»; las secciones extraídas lo importan de acá.
const core = "/core-api";

/**
 * Traduce un fallo de transporte a un mensaje es-PY accionable (§15.6): la red
 * no responde, la petición se cortó o la respuesta no es JSON. Los mensajes del
 * servidor (que traen la causa real) pasan tal cual.
 */
export function transporteError(cause: unknown): Error {
  if (cause instanceof Error) {
    if (cause.name === "AbortError" || cause.name === "TimeoutError" || /timed? ?out|aborted/i.test(cause.message))
      return new Error("El servidor tardó demasiado en responder. Reintentá.");
    if (/failed to fetch|fetch failed|networkerror|load failed|network request failed/i.test(cause.message))
      return new Error("No se pudo conectar con el servidor. Revisá tu conexión e intentá de nuevo.");
    if (cause.message) return cause;
  }
  return new Error("No se pudo completar la operación. Reintentá.");
}

/** HTTP metadata is additive; callers still receive a normal Error. */
function responseError(status: number, message: string): Error & {status: number} {
  return Object.assign(new Error(message), {status});
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // `shellDataUrl` ya devuelve la ruta con `/core-api`: el prefijo es idempotente.
  let response: Response;
  try {
    response = await dataFetch(path.startsWith(`${core}/`) ? path : `${core}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (cause) {
    throw transporteError(cause);
  }
  // Read the response once: json() consumes an invalid HTML body too, so a
  // second text() read would conceal a proxy/login page as successful {} data.
  let text: string;
  try { text = await response.text(); } catch (cause) { throw Object.assign(transporteError(cause), {status: response.status}); }
  let data: T & { error?: string };
  try {
    data = (text.trim() ? JSON.parse(text) : {}) as T & { error?: string };
  } catch {
    const errorMsg = text.slice(0, 100) || "Respuesta inválida del servidor";
    if (!response.ok)
      throw responseError(response.status, response.status >= 500 ? "El servidor no pudo completar la operación. Probá de nuevo en unos segundos." : `${errorMsg} (HTTP ${response.status})`);
    throw responseError(response.status, "El servidor devolvió una respuesta inválida. Reintentá.");
  }
  if (!response.ok)
    throw responseError(response.status, data && typeof data === 'object' && typeof data.error === 'string' && data.error ? data.error : "No se pudo completar la acción.");
  let payload:unknown;
  if(typeof init.body==='string'){try{payload=JSON.parse(init.body);}catch{payload=undefined;}}
  notifyMutation(path,init.method||'GET',payload,data);
  return data;
}
