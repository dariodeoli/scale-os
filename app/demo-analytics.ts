"use client";
// Analítica de la demo (panel global «Tráfico y demos»): qué pantallas se visitan y
// cuánto tiempo visible pasa cada una. Solo corre dentro de una demo (la monta la
// barra de la demo); el API identifica la demo por la sesión y guarda un hash, nunca
// el usuario ni la organización. Sin query string ni ids: solo la sección.
import {useEffect} from "react";
import {usePathname} from "next/navigation";

export const DEMO_ANALYTICS_ENDPOINT = "/core-api/api/public/analytics/collect";

/** Sección de la demo: primer tramo de la ruta, en minúsculas; lo demás se descarta. */
export function demoSection(pathname: string | null | undefined) {
  const first = String(pathname || "/").split(/[?#]/)[0].split("/").filter(Boolean)[0]?.toLowerCase() || "";
  return /^[a-z0-9-]{1,40}$/.test(first) ? `/${first}` : "/";
}

export function demoTrackingDisabled(nav: {doNotTrack?: string | null; globalPrivacyControl?: boolean} | undefined) {
  const flag = (value: unknown) => value === "1" || String(value || "").toLowerCase() === "yes";
  return !nav || flag(nav.doNotTrack) || nav.globalPrivacyControl === true;
}

const token = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => (byte % 36).toString(36)).join("");

function send(body: Record<string, unknown>, beacon = false) {
  const text = JSON.stringify({surface: "demo", ...body});
  try {
    if (beacon && navigator.sendBeacon?.(DEMO_ANALYTICS_ENDPOINT, new Blob([text], {type: "application/json"}))) return;
  } catch {}
  void fetch(DEMO_ANALYTICS_ENDPOINT, {method: "POST", credentials: "same-origin", keepalive: true, headers: {"Content-Type": "application/json"}, body: text}).catch(() => {});
}

/** Una vista por sección; el tiempo visible se manda al ocultar, cerrar o cambiar de sección. */
export function useDemoAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined" || !window.crypto?.getRandomValues || demoTrackingDisabled(navigator as Navigator & {globalPrivacyControl?: boolean})) return;
    const path = demoSection(pathname), view = token();
    send({event: "page_view", path, view});
    let visible = 0, since = document.visibilityState === "visible" ? Date.now() : 0, last = -1;
    const flush = () => {
      if (since) { visible += Date.now() - since; since = 0; }
      const seconds = Math.round(visible / 1000);
      if (seconds === last) return;
      last = seconds;
      send({event: "engagement", path, view, seconds}, true);
    };
    const onVisibility = () => { if (document.visibilityState === "hidden") flush(); else if (!since) since = Date.now(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [pathname]);
}
