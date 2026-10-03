"use client";
// Estados del panel global (#102, rediseño #155 fase 2): filas compactas —el
// detalle vive en el texto muted o en el tooltip—, borde tokenizado para alto
// contraste, acción de recuperación en el error y skeleton con la forma real
// del panel mientras carga.
import Link from "next/link";
import {ArrowLeft, CircleAlert, KeyRound, RefreshCw, ShieldAlert, TriangleAlert} from "lucide-react";
import {Aviso, Skeleton} from 'owncoding-ui';
import {appHome, formatPlatformMetric, type BootstrapStatus, type CollectionPage, type State} from "./model";

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

export function PlatformAccessDenied({message}: {message?: string}) {
  return <section className={`${ROW} border-bad-text/40`} role="alert">
    <span className={`${ICON} text-bad`} aria-hidden="true"><ShieldAlert size={17}/></span>
    <div className="min-w-0">
      <b className="block text-[13.5px] font-semibold text-fore">No tenés acceso global</b>
      {/* El motivo del API conserva el contexto (demo, membresía ausente) #147. */}
      <p className="mt-0.5 text-xs text-mute">{message || "Tu sesión está activa, pero no tiene el permiso necesario para administrar la plataforma."}</p>
      <Link className="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" href={appHome()}><ArrowLeft size={14} aria-hidden="true"/>Volver al panel</Link>
    </div>
  </section>;
}

export function PlatformNotices({state, error, bootstrap, onRetry}: {state: State | null; error: string; bootstrap: BootstrapStatus | null; onRetry?: () => void}) {
  return <div className="grid gap-3">
    <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[12px] leading-[1.45] text-mute">
      <ShieldAlert size={14} className="shrink-0" aria-hidden="true"/>
      <strong className="font-semibold text-fore">Acceso separado por plataforma.</strong>
      <span>Ser dueño de una agencia no habilita este panel ni sus datos.</span>
    </p>
    {bootstrap && !bootstrap.initialized ? <section className={`${ROW} border-warn-text/45`} role="status">
      <span className={`${ICON} text-warn`} aria-hidden="true"><TriangleAlert size={17}/></span>
      <div className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-fore">Primer acceso global pendiente</b>
        <p className="mt-0.5 text-xs text-mute" title="Este diagnóstico no expone correos ni secretos.">{bootstrap.state === "not_configured" ? "Falta definir la configuración inicial del administrador en el servidor." : bootstrap.state === "invalid_configuration" ? "La configuración inicial del administrador no tiene un formato válido." : bootstrap.state === "awaiting_eligible_user" ? "La cuenta configurada debe existir, tener correo verificado y acceso activo a una agencia." : "Estado de configuración pendiente."}</p>
      </div>
    </section> : null}
    {error ? <section className={`${ROW} border-bad-text/40`} role="alert">
      <span className={`${ICON} text-bad`} aria-hidden="true"><CircleAlert size={17}/></span>
      <div className="min-w-0">
        <b className="block text-[13.5px] font-semibold text-fore">No pudimos actualizar el control global</b>
        <Aviso tono="error" compact className="mt-1">{error}</Aviso>
        {onRetry ? <button type="button" className="secondary mt-2 inline-flex min-h-11 items-center gap-2 md:min-h-8" onClick={onRetry}><RefreshCw size={14} aria-hidden="true"/>Reintentar</button> : null}
      </div>
    </section> : null}
  </div>;
}

/** Skeleton con la forma del panel (#155): encabezado, tabs, KPIs y paneles. */
export function PlatformAdminSkeleton() {
  return <main className="platform-admin-page control-shell" aria-busy="true">
    <p className="sr-only" role="status">Cargando el control global…</p>
    <header className="platform-admin-header" aria-hidden="true">
      <Skeleton className="h-9 w-9 rounded-xl"/>
      <div className="platform-admin-identity">
        <Skeleton className="h-3 w-28"/>
        <Skeleton className="h-5 w-44"/>
      </div>
      <div className="platform-admin-meta">
        <Skeleton className="h-6 w-24 rounded-full"/>
        <Skeleton className="h-3 w-24"/>
      </div>
      <div className="platform-admin-actions">
        <Skeleton className="h-11 w-28 rounded-lg md:h-9"/>
        <Skeleton className="h-11 w-24 rounded-lg md:h-9"/>
      </div>
    </header>
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
      <div className="silent-scroll flex w-max gap-1 rounded-xl border border-ink-600 bg-ink-800 p-1" aria-hidden="true">
        {['w-24', 'w-28', 'w-24', 'w-20', 'w-28'].map((size, index) => <Skeleton key={index} className={`h-11 rounded-lg md:h-8 ${size}`}/>)}
      </div>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-4">
          <div className="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => <div key={index} className="rounded-xl border border-ink-600 bg-ink-800 p-4">
              <Skeleton className="h-3 w-24"/>
              <Skeleton className="mt-2 h-7 w-20"/>
              <Skeleton className="mt-2 h-3 w-28"/>
            </div>)}
          </div>
          <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {[0, 1, 2].map((index) => <div key={index} className="panel grid gap-2">
              <Skeleton className="h-4 w-36"/>
              {[0, 1, 2].map((row) => <div key={row} className="flex items-center justify-between gap-3 py-1.5">
                <Skeleton className="h-3 w-40"/>
                <Skeleton className="h-5 w-16 rounded-full"/>
              </div>)}
            </div>)}
          </div>
        </div>
        <div className="grid content-start gap-4" aria-hidden="true">
          {[0, 1].map((index) => <div key={index} className="panel grid gap-2">
            <Skeleton className="h-4 w-32"/>
            <Skeleton className="h-10 w-full rounded-lg"/>
            <Skeleton className="h-10 w-full rounded-lg"/>
          </div>)}
        </div>
      </div>
    </div>
  </main>;
}

/**
 * Pie de una lista global (#106): contador honesto («N de M») y «Ver más» cuando
 * el API informa que quedan registros fuera de la ventana.
 */
export function PlatformMore({loaded,total,hasMore,busy,onMore,label='registros'}: {loaded:number;total:number|null;hasMore:boolean;busy:boolean;onMore:()=>void;label?:string}) {
  return <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
    <span className="text-xs tabular-nums text-mute" role="status">{total===null?`${formatPlatformMetric(loaded)} ${label}`:`${formatPlatformMetric(loaded)} de ${formatPlatformMetric(total)} ${label}`}</span>
    {hasMore?<button type="button" className="secondary" disabled={busy} onClick={onMore}>Ver más</button>:null}
  </div>;
}
