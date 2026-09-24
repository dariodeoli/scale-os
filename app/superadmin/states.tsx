"use client";
// Estados del panel global (issue #46): extraídos de superadmin/page.tsx con los
// mismos textos, en la superficie v2 compartida.
import Link from "next/link";
import {ArrowLeft, CircleAlert, KeyRound, RefreshCw, ShieldAlert} from "lucide-react";
import {appHome, type BootstrapStatus, type State} from "./model";
import {Skeleton} from 'owncoding-ui';

const SURFACE = "grid grid-cols-[minmax(0,1fr)] gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4";
const ICON = "grid size-10 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute";

export function PlatformRedirecting() {
  return <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`} role="status">
    <span className={ICON} aria-hidden="true"><KeyRound size={20}/></span>
    <div className="min-w-0">
      <h2 className="text-[17px] font-semibold tracking-tight text-fore">Redirigiendo al inicio de sesión</h2>
      <p className="mt-1 text-xs text-mute">Verificá tu acceso para continuar con la administración global.</p>
    </div>
  </section>;
}

export function PlatformAccessDenied() {
  return <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`} role="alert">
    <span className={ICON} aria-hidden="true"><ShieldAlert size={20}/></span>
    <div className="min-w-0">
      <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Acceso restringido</p>
      <h2 className="mt-1 text-[17px] font-semibold tracking-tight text-fore">No tenés acceso global</h2>
      <p className="mt-1 text-xs text-mute">Tu sesión está activa, pero no tiene el permiso necesario para administrar la plataforma.</p>
      <Link className="secondary mt-3 inline-flex items-center gap-2" href={appHome()}><ArrowLeft size={14} aria-hidden="true"/>Volver al panel</Link>
    </div>
  </section>;
}

export function PlatformNotices({state, error, busy, bootstrap}: {state: State | null; error: string; busy: boolean; bootstrap: BootstrapStatus | null}) {
  return <>
    <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`}>
      <span className={ICON} aria-hidden="true"><ShieldAlert size={20}/></span>
      <span className="min-w-0 text-xs text-mute"><strong className="text-fore">Acceso separado por plataforma.</strong> Ser dueño de una agencia no habilita este panel ni sus datos.</span>
    </section>
    {bootstrap && !bootstrap.initialized ? <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`} role="status">
      <span className={ICON} aria-hidden="true"><ShieldAlert size={20}/></span>
      <div className="min-w-0">
        <strong className="block text-[13.5px] text-fore">Primer acceso global pendiente.</strong>
        <span className="mt-1 block text-xs text-mute">{bootstrap.state === "not_configured" ? "Falta definir la configuración inicial del administrador en el servidor." : bootstrap.state === "invalid_configuration" ? "La configuración inicial del administrador no tiene un formato válido." : bootstrap.state === "awaiting_eligible_user" ? "La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia." : "Estado de configuración pendiente."}</span>
        <small className="mt-1 block text-[11.5px] text-mute">Este diagnóstico no expone correos ni secretos.</small>
      </div>
    </section> : null}
    {error ? <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`} role="alert">
      <span className={ICON} aria-hidden="true"><CircleAlert size={20}/></span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-fore">No pudimos actualizar el control global</h2>
        <p className="mt-1 break-words text-xs text-bad">{error}</p>
      </div>
    </section> : null}
    {busy && !state ? <section className={`${SURFACE} sm:grid-cols-[auto_minmax(0,1fr)]`} role="status" aria-busy="true">
      <span className={ICON} aria-hidden="true"><RefreshCw size={20}/></span>
      <div className="min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-fore">Cargando control global</h2>
        <p className="mt-1 text-xs text-mute">Reuniendo indicadores, accesos y catálogo comercial.</p>
        <div className="mt-3 grid gap-2" aria-hidden="true"><Skeleton className="h-3.5 w-28 rounded-full"/><Skeleton className="h-10 w-full rounded-xl"/></div>
      </div>
    </section> : null}
  </>;
}
