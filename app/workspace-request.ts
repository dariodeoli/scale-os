"use client";
import {dataFetch} from './data-cache';
import {notifyMutation} from './feedback';

// Transporte compartido del workspace (extraído de app/scale-workspace.tsx, issue #47).
// El shell lo usa como «datos compartidos»; las secciones extraídas lo importan de acá.
const core = "/core-api";

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // `shellDataUrl` ya devuelve la ruta con `/core-api`: el prefijo es idempotente.
  const response = await dataFetch(path.startsWith(`${core}/`) ? path : `${core}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  let data: T & { error?: string };
  try {
    data = (await response.json()) as T & { error?: string };
  } catch (parseError) {
    // If response is not JSON, try to get text for error message
    const text = await response.text().catch(() => "");
    const errorMsg = text.slice(0, 100) || "Respuesta inválida del servidor";
    if (!response.ok) {
      throw new Error(`${errorMsg} (HTTP ${response.status})`);
    }
    // A 200 with a non-empty non-JSON body is an error page, never data: it must
    // fail loudly instead of becoming an empty object that corrupts state.
    if (text.trim()) throw new Error("El servidor devolvió una respuesta inválida. Reintentá.");
    data = {} as T & { error?: string };
  }
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la acción.");
  let payload:unknown;
  if(typeof init.body==='string'){try{payload=JSON.parse(init.body);}catch{payload=undefined;}}
  notifyMutation(path,init.method||'GET',payload,data);
  return data;
}
