"use client";
// Estados del panel global (#102, rediseño #155 fase 2): filas compactas —el
// detalle vive en el texto muted o en el tooltip—, borde tokenizado para alto
// contraste, acción de recuperación en el error y skeleton con la forma real
// del panel mientras carga.
import {CircleAlert, RefreshCw, TriangleAlert} from "lucide-react";
import {Aviso, Skeleton} from 'owncoding-ui';
import {formatPlatformMetric, type BootstrapStatus, type CollectionPage, type State} from "./model";

const ROW = "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-ink-600 bg-ink-800 px-4 py-3";
const ICON = "grid size-8 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute";

/**
 * Sin acceso (sin sesión, sin rol global, demo o cuenta no verificada): el panel
 * redirige al inicio de la app y mientras tanto no dibuja NADA propio — ni título,
 * ni motivo, ni «no autorizado» — para no confirmar que existe (guía §1).
 */
export function PlatformRedirecting() {
  return <main className="min-h-dvh" aria-busy="true"/>;
}

export function PlatformNotices({state, error, bootstrap, onRetry}: {state: State | null; error: string; bootstrap: BootstrapStatus | null; onRetry?: () => void}) {
  // Sin avisos no se dibuja nada: un contenedor vacío sumaba un hueco al ritmo del panel.
  if (!error && !(bootstrap && !bootstrap.initialized)) return null;
  return <div className="grid gap-3">
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

/**
 * Carga inicial: la forma neutra del shell (riel + barra + bloques) sin textos del
 * panel. La primera respuesta del API decide: admin → panel; cualquier otro → inicio.
 */
export function PlatformAdminSkeleton() {
  return <main className="platform-admin-page control-shell platform-shell" aria-busy="true">
    <p className="sr-only" role="status">Cargando…</p>
    <aside className="platform-sidebar" aria-hidden="true">
      <Skeleton className="mb-3 h-9 w-9 rounded-xl max-[760px]:hidden"/>
      <div className="platform-sidebar-nav flex min-w-0 flex-1 gap-1 overflow-hidden min-[761px]:flex-col">
        {[0, 1, 2, 3, 4, 5, 6].map((index) => <Skeleton key={index} className={`h-9 w-full shrink-0 rounded-lg max-[760px]:w-24 ${index > 2 ? "max-[760px]:hidden" : ""}`}/>)}
      </div>
    </aside>
    <div className="platform-admin-top" aria-hidden="true">
      <div className="grid min-w-0 flex-1 gap-1">
        <Skeleton className="h-5 w-44"/>
        <Skeleton className="h-3 w-24"/>
      </div>
      <div className="platform-admin-actions">
        <Skeleton className="h-11 w-11 rounded-lg md:h-9 md:w-28"/>
        <Skeleton className="h-11 w-11 rounded-lg md:h-9 md:w-24"/>
      </div>
    </div>
    <div className="platform-main grid min-w-0 content-start gap-4" aria-hidden="true">
      <div className="ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => <div key={index} className="rounded-xl border border-ink-600 bg-ink-800 p-4">
          <Skeleton className="h-3 w-24"/>
          <Skeleton className="mt-2 h-7 w-20"/>
          <Skeleton className="mt-2 h-3 w-28"/>
        </div>)}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => <div key={index} className="panel grid gap-2">
          <Skeleton className="h-4 w-36"/>
          {[0, 1, 2].map((row) => <div key={row} className="flex items-center justify-between gap-3 py-1.5">
            <Skeleton className="h-3 w-40"/>
            <Skeleton className="h-5 w-16 rounded-full"/>
          </div>)}
        </div>)}
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
