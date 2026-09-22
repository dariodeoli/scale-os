import type {ReactNode} from 'react';
import {WorkspaceBrand} from './workspace-brand';
import {WorkspaceFooter} from './workspace-footer';

// Marco único de acceso (issue #46): una sola superficie centrada, Tailwind +
// objetos compartidos. Las pantallas de acceso (registro, invitación, recuperar,
// verificar, pendiente, demo y estado) lo reutilizan; ninguna hoja de componente.
type AccessLayoutProps={children:ReactNode;eyebrow?:string;cardClassName?:string;pageClassName?:string;showBrand?:boolean;wide?:boolean;busy?:boolean};

export function AccessLayout({children,eyebrow,cardClassName='',pageClassName='',showBrand=true,wide=false,busy=false}:AccessLayoutProps){
 return <main data-surface="acceso" className={`flex min-h-screen items-center justify-center bg-paper px-4 py-10 ${pageClassName}`.trim()}>
  <div className={`w-full min-w-0 ${wide?'max-w-3xl':'max-w-[30rem]'}`}>
   <section aria-label={eyebrow||'Acceso a Scale OS'} aria-busy={busy||undefined} className={`grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-2xl border border-ink-600 bg-ink-800 p-6 md:p-7 ${cardClassName}`.trim()}>
    <header className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
     {showBrand&&<a className="inline-flex items-center gap-2" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></a>}
     {eyebrow&&<p className="min-w-0 break-words font-mono text-[10px] uppercase tracking-[.13em] text-mute">{eyebrow}</p>}
    </header>
    {children}
    <WorkspaceFooter/>
   </section>
  </div>
 </main>;
}
