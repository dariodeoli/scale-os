import type {Metadata} from 'next';
import Link from 'next/link';
import {WorkspaceFooter} from './workspace-footer';

export const docsOrigin='https://sistema.scaleparaguay.com';
export const docsLinks={home:docsOrigin+'/',login:'https://app.scaleparaguay.com/',signup:'https://app.scaleparaguay.com/registro',demo:docsOrigin+'/demo'};
export function docsMetadata(title:string,description:string,path:string):Metadata{return {title,description,metadataBase:new URL(docsOrigin),alternates:{canonical:docsOrigin+path},robots:{index:true,follow:true},openGraph:{title:title+' · Scale OS',description,url:docsOrigin+path,type:'website'}};}
export function DocsFrame({title,intro,section,children,toc}:{title:string;intro:string;section:'inicio'|'mcp'|'api';children:React.ReactNode;toc:{id:string;label:string}[]}){
 return <div className="public-docs" data-testid="public-docs">
  <a className="docs-skip" href="#contenido">Ir al contenido</a>
  <header className="docs-header"><a className="docs-brand" href={docsLinks.home}>scale<span>OS</span><span className="docs-brand-label">Documentación</span></a><nav aria-label="Navegación pública"><a href={docsLinks.home}>Producto</a><Link href="/documentacion" aria-current={section==='inicio'?'page':undefined}>Guías</Link><a href={docsLinks.demo}>Explorar demo</a><a className="docs-button" href={docsLinks.login}>Ingresar</a></nav></header>
  <div className="docs-layout"><aside className="docs-sidebar"><nav aria-label="Guías de documentación"><p className="docs-kicker">Integraciones</p><Link href="/documentacion" aria-current={section==='inicio'?'page':undefined}>Empezar</Link><Link href="/documentacion/mcp" aria-current={section==='mcp'?'page':undefined}>Conectar un asistente · MCP</Link><Link href="/documentacion/api" aria-current={section==='api'?'page':undefined}>API e integraciones</Link></nav><nav className="docs-toc" aria-label="En esta página"><p className="docs-kicker">En esta página</p>{toc.map(item=><a key={item.id} href={'#'+item.id}>{item.label}</a>)}</nav><p className="docs-sidebar-note">Tu equipo conserva el control. Las conexiones respetan los permisos actuales de cada persona.</p></aside>
  <main id="contenido" className="docs-content" tabIndex={-1}><div className="docs-page-heading"><p className="docs-kicker">Guías de Scale OS</p><h1>{title}</h1><p className="docs-intro">{intro}</p></div>{children}<div className="docs-next"><span>Conocé el espacio de trabajo antes de conectar tus herramientas.</span><a className="docs-button" href={docsLinks.demo}>Explorar demo</a></div></main></div>
  <WorkspaceFooter variant="landing"/>
 </div>;
}
export function DocsSection({id,title,children}:{id:string;title:string;children:React.ReactNode}){return <section className="docs-section" aria-labelledby={id}><h2 id={id}>{title}<a className="docs-anchor" href={'#'+id} aria-label={'Enlace a '+title}>#</a></h2>{children}</section>;}
export function Code({children}:{children:string}){return <pre className="docs-code" tabIndex={0}><code>{children}</code></pre>;}
export function Note({title,children}:{title:string;children:React.ReactNode}){return <aside className="docs-note"><strong>{title}</strong><div>{children}</div></aside>;}
