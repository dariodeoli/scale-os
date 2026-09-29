"use client";
// Estados del panel global (#102): filas compactas de una línea —el detalle
// vive en el texto muted o en el tooltip— sin tarjetas altas para un solo dato.
import Link from "next/link";
import {ArrowLeft, CircleAlert, KeyRound, ShieldAlert, TriangleAlert} from "lucide-react";
import {appHome, type BootstrapStatus, type State} from "./model";
import {Aviso} from 'owncoding-ui';

const ROW = "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3";
const ICON = "grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute";

export function PlatformRedirecting() {
  return <section className={ROW} role="status">
    <span className={ICON} aria-hidden="true"><KeyRound size={17}/></span>
    <div className="min-w-0">
      <b className="block text-[13.5px] font-semibold text-fore">Redirigiendo al inicio de sesión</b>
      <p className="mt-0.5 text-xs text-mute">Verificá tu acceso para continuar con la administración global.</p>
    </div>
  </section>;
}

export function PlatformAccessDenied() {
  return <section className={`${ROW} border-bad/30`} role="alert">
    <span className={`${ICON} text-bad`} aria-hidden="true"><ShieldAlert size={17}/></span>
    <div className="min-w-0">
      <b className="block text-[13.5px] font-semibold text-fore">No tenés acceso global</b>
      <p className="mt-0.5 text-xs text-mute">Tu sesión está activa, pero no tiene el permiso necesario para administrar la plataforma.</p>
      <Link className="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" href={appHome()}><ArrowLeft size={14} aria-hidden="true"/>Volver al panel</Link>
    </div>
  </section>;
}

export function PlatformNotices({state, error, bootstrap}: {state: State | null; error: string; bootstrap: BootstrapStatus | null}) {
  return <div className="grid gap-3">
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[12px] leading-[1.45] text-mute">
      <ShieldAlert size={14} className="shrink-0" aria-hidden="true"/>
      <strong className="font-semibold text-fore">Acceso separado por plataforma.</strong>
      <span>Ser dueño de una agencia no habilita este panel ni sus datos.</span>
    </p>
    {bootstrap && !bootstrap.initialized ? <section className={`${ROW} border-warn/40`} role="status">
      <span className={`${ICON} text-warn`} aria-hidden="true"><TriangleAlert size={17}/></span>
      <div className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-fore">Primer acceso global pendiente</b>
        <p className="mt-0.5 text-xs text-mute" title="Este diagnóstico no expone correos ni secretos.">{bootstrap.state === "not_configured" ? "Falta definir la configuración inicial del administrador en el servidor." : bootstrap.state === "invalid_configuration" ? "La configuración inicial del administrador no tiene un formato válido." : bootstrap.state === "awaiting_eligible_user" ? "La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia." : "Estado de configuración pendiente."}</p>
      </div>
    </section> : null}
    {error ? <section className={ROW} role="alert">
      <span className={`${ICON} text-bad`} aria-hidden="true"><CircleAlert size={17}/></span>
      <div className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-fore">No pudimos actualizar el control global</b>
        <Aviso tono="error" compact className="mt-1">{error}</Aviso>
      </div>
    </section> : null}
  </div>;
}
