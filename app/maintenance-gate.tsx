"use client";
import {Button} from './ui/button';

// Modo mantenimiento en el espacio de trabajo. El estado sale de la ruta pública
// del API (`/api/public/maintenance`, siempre permitida): si está activo y la
// sesión no es de un administrador global, el shell muestra la pantalla de
// mantenimiento en vez del espacio. Si la consulta falla, el espacio queda
// ABIERTO (fail-open): nunca se bloquea por un error de red. El panel global
// (/superadmin), el login y la landing no pasan por este gate.
import React, {useEffect, useState, type ReactNode} from "react";
import {RefreshCw, Wrench} from "lucide-react";
import {WorkspaceBrand} from "./workspace-brand";
import {fechaLista} from "owncoding-ui";

export type MaintenanceStatus = {maintenance: boolean; message: string; until: string | null; bypass: boolean};
const CHECK_MS = 60_000;

/** Estado público; `null` si no se pudo consultar (el llamador queda abierto). */
export async function fetchMaintenanceStatus(fetcher: typeof fetch = fetch): Promise<MaintenanceStatus | null> {
  try {
    const response = await fetcher("/core-api/api/public/maintenance", {credentials: "include", cache: "no-store"});
    if (!response.ok) return null;
    const data = await response.json() as Partial<MaintenanceStatus>;
    return {maintenance: data?.maintenance === true, message: typeof data?.message === "string" ? data.message : "", until: typeof data?.until === "string" ? data.until : null, bypass: data?.bypass === true};
  } catch { return null; }
}
/** Bloquea solo con un estado confirmado: activo y sin permiso de administrador global. */
export function maintenanceBlocks(status: MaintenanceStatus | null) {
  return Boolean(status?.maintenance && !status.bypass);
}

export function MaintenanceScreen({message, until, onRetry}: {message: string; until: string | null; onRetry?: () => void}) {
  // Mismo formato que `listDateFull` (hora de Asunción, 24 h) sin arrastrar el CSS de listas al marco.
  const end = until ? fechaLista(until, "", {timeZone: "America/Asuncion"}) || null : null;
  return <main className="login-page maintenance-screen" aria-labelledby="maintenance-title">
    <div className="login-card">
      <WorkspaceBrand/>
      <span className="grid size-10 place-items-center rounded-xl border border-warn/40 bg-warn/10 text-warn" aria-hidden="true"><Wrench size={20}/></span>
      <p className="eyebrow">Mantenimiento programado</p>
      <h1 id="maintenance-title">Estamos en mantenimiento</h1>
      <p className="whitespace-pre-line break-words text-[14px] leading-relaxed text-fore/85">{message || "Estamos haciendo mejoras en Scale OS. Volvé a intentar en unos minutos."}</p>
      {end ? <p className="text-[13px] text-mute">Fin estimado: <b className="list-date whitespace-nowrap text-fore">{end}</b> (hora de Asunción)</p> : null}
      <p className="text-[12.5px] text-mute">Tus datos están a salvo. Esta pantalla se actualiza sola cuando el servicio vuelve.</p>
      <Button variant="secondary" type="button" className="secondary inline-flex min-h-11 items-center justify-center gap-2" onClick={onRetry ?? (() => window.location.reload())}><RefreshCw size={14} aria-hidden="true"/>Reintentar</Button>
    </div>
  </main>;
}

export function MaintenanceGate({children, fetcher}: {children: ReactNode; fetcher?: typeof fetch}) {
  const [status, setStatus] = useState<MaintenanceStatus | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    let alive = true;
    // Un error no cambia el estado conocido: si ya estaba abierto, sigue abierto.
    const check = async () => { const next = await fetchMaintenanceStatus(fetcher); if (alive && next) setStatus(next); };
    void check();
    const timer = window.setInterval(() => { if (!document.hidden) void check(); }, CHECK_MS);
    const onVisible = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [fetcher]);
  if (status && maintenanceBlocks(status)) return <MaintenanceScreen message={status.message} until={status.until} onRetry={() => { void fetchMaintenanceStatus(fetcher).then((next) => { if (next) setStatus(next); }); }}/>;
  return <>{children}</>;
}
