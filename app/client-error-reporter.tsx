"use client";
// Captura de errores del navegador para el panel global («Errores»): errores no
// atrapados, promesas rechazadas sin manejar y error boundaries de Next. Manda
// solo lo mínimo (mensaje, stack, ruta SIN query y versión) a
// POST /api/public/client-errors, que vuelve a limpiar PII y aplica los límites.
// Del lado del cliente: tope por carga de página, sin repetir el mismo error y
// sin cookies (`credentials: "omit"`). Nunca rompe la página si falla.
import {useEffect} from "react";
import {APP_VERSION} from "./app-version";

export const CLIENT_ERROR_ENDPOINT = "/core-api/api/public/client-errors";
export const CLIENT_ERROR_LIMITS = {message: 300, stack: 4000, route: 200, perPage: 10, body: 8000} as const;
export type ClientErrorKind = "error" | "unhandledrejection" | "boundary";
export type ClientErrorPayload = {message: string; stack: string; route: string; kind: ClientErrorKind; version: string};

// Ruido que no es un error de Scale OS: scripts de otro origen sin detalle,
// extensiones del navegador y el aviso benigno de ResizeObserver.
const NOISE = [/^Script error\.?$/i, /ResizeObserver loop/i, /(chrome|moz|safari(-web)?)-extension:\/\//i];

/** Ruta visible sin query string ni fragmento (nunca viajan tokens del enlace). */
export function routeWithoutQuery(value: string) {
  return String(value || "/").split(/[?#]/)[0].slice(0, CLIENT_ERROR_LIMITS.route) || "/";
}

export function buildClientErrorPayload(input: {message?: unknown; stack?: unknown; kind: ClientErrorKind; route?: string; version?: string}): ClientErrorPayload | null {
  const message = String(input.message ?? "").trim().slice(0, CLIENT_ERROR_LIMITS.message);
  const stack = typeof input.stack === "string" ? input.stack.slice(0, CLIENT_ERROR_LIMITS.stack) : "";
  if (!message || NOISE.some((pattern) => pattern.test(message) || pattern.test(stack))) return null;
  return {message, stack, route: routeWithoutQuery(input.route ?? "/"), kind: input.kind, version: input.version ?? APP_VERSION};
}

/** Normaliza lo que llega a `error`/`unhandledrejection` (Error, string u otro valor). */
export function describeThrown(value: unknown): {message: string; stack: string} {
  if (value instanceof Error) return {message: `${value.name && value.name !== "Error" ? `${value.name}: ` : ""}${value.message}`, stack: value.stack || ""};
  if (typeof value === "string") return {message: value, stack: ""};
  try { return {message: JSON.stringify(value)?.slice(0, CLIENT_ERROR_LIMITS.message) || "Error sin mensaje", stack: ""}; }
  catch { return {message: "Error sin mensaje", stack: ""}; }
}

type Sender = (body: string) => Promise<unknown> | unknown;
const defaultSender: Sender = (body) => fetch(CLIENT_ERROR_ENDPOINT, {method: "POST", body, keepalive: true, credentials: "omit", headers: {"Content-Type": "application/json"}});

/** Reportero con tope por página y sin duplicados; inyectable para tests. */
export function createClientErrorReporter(send: Sender = defaultSender) {
  const seen = new Set<string>();
  let sent = 0;
  return function report(value: unknown, kind: ClientErrorKind, route = typeof window !== "undefined" ? window.location.pathname : "/") {
    try {
      const described = describeThrown(value);
      const payload = buildClientErrorPayload({...described, kind, route});
      if (!payload || sent >= CLIENT_ERROR_LIMITS.perPage) return false;
      const key = `${payload.kind}|${payload.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      let body = JSON.stringify(payload);
      if (body.length > CLIENT_ERROR_LIMITS.body) body = JSON.stringify({...payload, stack: payload.stack.slice(0, 1500)});
      sent += 1;
      void Promise.resolve(send(body)).catch(() => undefined);
      return true;
    } catch {
      return false;
    }
  };
}

let shared: ReturnType<typeof createClientErrorReporter> | null = null;
/** Reporte desde un error boundary u otro código cliente (un solo reportero por página). */
export function reportClientError(value: unknown, kind: ClientErrorKind = "error") {
  shared ??= createClientErrorReporter();
  return shared(value, kind);
}

/** Se monta una vez en el layout raíz; no dibuja nada. */
export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => { reportClientError(event.error ?? event.message, "error"); };
    const onRejection = (event: PromiseRejectionEvent) => { reportClientError(event.reason, "unhandledrejection"); };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, []);
  return null;
}
