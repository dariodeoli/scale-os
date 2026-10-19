import type {ReactNode} from 'react';
import './access-responsive.css';
import {WorkspaceBrand} from './workspace-brand';
import {WorkspaceFooter} from './workspace-footer';
import {AuthBrandPanel} from './auth-brand-panel';
import {ThemeToggle} from './theme-toggle';

// Marco único de acceso (issue #46): una sola superficie centrada, Tailwind +
// objetos compartidos. Las pantallas de acceso (registro, invitación, recuperar,
// verificar, pendiente, demo y estado) lo reutilizan; con una hoja de ajuste exclusiva del acceso.
// Desde 1024 px la tarjeta comparte marco con el panel de marca (`.auth-split`,
// el mismo del login); `wide` (estado del servicio) queda sin panel.
type AccessLayoutProps={children:ReactNode;eyebrow?:string;cardClassName?:string;pageClassName?:string;showBrand?:boolean;wide?:boolean;busy?:boolean;links?:ReactNode};

export function AccessLayout({children,eyebrow,cardClassName='',pageClassName='',showBrand=true,wide=false,busy=false,links}:AccessLayoutProps){
 return <main data-surface="acceso" className={`access-page ${pageClassName}`.trim()}>
 <div className={wide?'access-wide':'auth-split'}>
  {wide?null:<AuthBrandPanel/>}
  {/* Targets táctiles de acceso: botones y enlaces-botón a 44 px. */}
  <div className={`auth-form-slot w-full min-w-0 [&_a.primary]:min-h-11 [&_a.secondary]:min-h-11 [&_button]:min-h-11 ${wide?'max-w-3xl':''}`}>
   <section aria-label={eyebrow||'Acceso a Scale OS'} aria-busy={busy||undefined} className={`auth-form-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 rounded-2xl border border-ink-600 bg-ink-800 p-6 ${cardClassName}`.trim()}>
    <header className="access-card-header">
     {showBrand&&<a className="auth-card-brand inline-flex min-h-11 items-center gap-2" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></a>}
     {eyebrow&&<p className="min-w-0 break-words font-mono text-[10px] uppercase tracking-[.13em] text-mute">{eyebrow}</p>}
     <ThemeToggle className="access-theme-toggle"/>
    </header>
    {children}
   </section>
  </div>
 </div>
 <div className="access-page-bottom">{links&&<nav className="access-links" aria-label="Opciones de acceso">{links}</nav>}<WorkspaceFooter/></div>
 </main>;
}
