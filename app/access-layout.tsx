import type {ReactNode} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from './workspace-brand';
import {WorkspaceFooter} from './workspace-footer';

type AccessLayoutProps={children:ReactNode;eyebrow?:string;cardClassName?:string;pageClassName?:string;showBrand?:boolean};

/** Shared access frame: one centered glass panel over the soft branded shell. */
export function AccessLayout({children,eyebrow,cardClassName='',pageClassName='login-page',showBrand=true}:AccessLayoutProps){
 return <main className={`${pageClassName} access-layout`.trim()}>
  <div className="access-layout-shell">
   <section className={`login-card ${cardClassName}`.trim()} aria-label={eyebrow||'Acceso a Scale OS'}>
    <header className="access-layout-header">
     {showBrand&&<Link className="access-layout-brand" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></Link>}
     {eyebrow&&<p className="eyebrow">{eyebrow}</p>}
    </header>
    {children}
    <WorkspaceFooter/>
   </section>
  </div>
 </main>;
}
