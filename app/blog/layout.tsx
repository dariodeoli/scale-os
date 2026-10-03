import Link from 'next/link';
import type {ReactNode} from 'react';
import {WorkspaceBrand} from '../workspace-brand';
import {WorkspaceFooter} from '../workspace-footer';
import '../blog.css';

// Chrome del blog (#156/#157): marca arriba, contenido y pie institucional.
// DSN pule las plantillas en la misma ronda; los hosts hacen el rewrite a
// /blog/<sección> para que las URLs públicas sean la raíz y /<slug>.
export default function BlogLayout({children}:{children:ReactNode}){
 return <div className="blog-shell">
  <header className="blog-header">
   <Link href="/" aria-label="Inicio del blog" prefetch={false}><WorkspaceBrand/></Link>
  </header>
  <main className="blog-main">{children}</main>
  <div className="blog-footer"><WorkspaceFooter/></div>
 </div>;
}
