import Link from 'next/link';
import {WorkspaceFooter} from './workspace-footer';

// 404 con marca para la app (issue #158): conserva el noindex del layout raíz,
// ofrece salida al inicio y al estado del sistema, y no expone datos de nadie.
export default function NotFound(){
 return <main className="flex min-h-screen items-center justify-center bg-paper px-4 py-10">
  <section className="grid w-full max-w-xl gap-4 rounded-2xl border border-ink-600 bg-ink-800 p-6 md:p-8" role="alert" aria-labelledby="not-found-title">
   <div className="grid gap-2">
    <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Error 404</p>
    <h1 id="not-found-title" className="text-2xl font-bold tracking-tight text-fore">No encontramos esta página</h1>
    <p className="max-w-prose text-sm leading-relaxed text-mute">Puede que el enlace esté vencido, mal escrito o corresponda a otra empresa. Volvé al inicio y seguí desde ahí.</p>
   </div>
   <div className="flex flex-wrap gap-2">
    <Link className="primary" href="/">Volver al inicio</Link>
    <Link className="secondary" href="/status">Estado del sistema</Link>
   </div>
   <div className="border-t border-ink-600 pt-4"><WorkspaceFooter/></div>
  </section>
 </main>;
}
