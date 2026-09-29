import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {CREDITO_PIE,CREDITO_PIE_URL} from 'owncoding-ui';
import {APP_VERSION} from '../app/app-version';

Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {WorkspaceFooter}=require('../app/workspace-footer') as typeof import('../app/workspace-footer');
const {AccessLayout}=require('../app/access-layout') as typeof import('../app/access-layout');
const ClientPortalLayout=(require('../app/cliente/layout') as typeof import('../app/cliente/layout')).default;

const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

/** Contrato del pie institucional (§14) que toda superficie tiene que cumplir. */
function assertProductFooter(html:string,surface:string){
 assert(html.includes('data-testid="product-footer"'),`${surface}: el pie sale del objeto de la biblioteca`);
 assert(html.includes(`© ${new Date().getFullYear()} Scale OS. Todos los derechos reservados. · v${APP_VERSION}`),`${surface}: copyright con la versión real de la app`);
 assert(html.includes(`href="${CREDITO_PIE_URL}"`),`${surface}: el crédito enlaza al sitio del grupo`);
 assert(html.includes(CREDITO_PIE),`${surface}: crédito «${CREDITO_PIE}»`);
}

test('panel: shell, suscripción bloqueada, error y superadmin montan el pie',()=>{
 const shell=file('app/scale-workspace.tsx');
 assert.equal((shell.match(/<WorkspaceFooter\s*\/>/g)||[]).length,3,'shell, login y suscripción bloqueada');
 assert(shell.includes("from './workspace-footer'"),'el shell usa el puente único');
 assert(file('app/superadmin/page.tsx').includes('<WorkspaceFooter />'),'el panel global monta el pie');
 assert(file('app/error.tsx').includes('<WorkspaceFooter/>'),'el lienzo de error del panel monta el pie');
 assertProductFooter(renderToStaticMarkup(<WorkspaceFooter/>),'panel');
});

test('acceso: registro, invitación, recuperar, verificar, pendiente, demo y status pasan por AccessLayout',()=>{
 for(const page of ['registro','invitacion','recuperar-cuenta','verificar-correo','acceso-pendiente','demo','status']){
  assert(file(`app/${page}/page.tsx`).includes('AccessLayout'),`${page} usa el marco de acceso`);
 }
 assertProductFooter(renderToStaticMarkup(<AccessLayout><p>Contenido de acceso</p></AccessLayout>),'acceso');
});

test('tokenizadas: el portal del cliente monta el pie en su layout',()=>{
 for(const page of ['ingresar','recuperar','invitacion','entregas']){
  assert(file(`app/cliente/${page}/page.tsx`).includes('client-portal'),`${page} vive en el portal tokenizado`);
 }
 assertProductFooter(renderToStaticMarkup(<ClientPortalLayout><p>Portal</p></ClientPortalLayout>),'portal del cliente');
});

test('públicas: la landing standalone publica el mismo pie canónico',()=>{
 const landing=file('public/scale-os.html');
 const footers=landing.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/g)||[];
 assert.equal(footers.length,1,'la landing mantiene un solo pie');
 assertProductFooter(footers[0],'landing');
 assert(footers[0].includes('href="#precio"'),'la landing conserva su enlace de venta');
 assert(!footers[0].includes('<script'),'el pie de la landing no agrega runtime');
 assert(file('build-tools/sync-landing-footer.tsx').includes('variant="landing"'),'la landing se regenera desde el puente');
});

test('puente sin lógica y excepciones documentadas de impresión',()=>{
 const bridge=file('app/workspace-footer.tsx');
 assert(!bridge.includes('<footer'),'el puente no dibuja el footer a mano');
 assert(!bridge.includes('Desarrollado por'),'el crédito no se copia: sale de la biblioteca');
 assert(bridge.includes("from 'owncoding-ui'"),'el puente importa el objeto publicado');
 const print=file('app/reports-print.tsx');
 assert(print.includes('Scale OS v${APP_VERSION} · Desarrollado por Owncoding'),'la impresión de informes conserva versión y crédito');
 assert(file('app/global-error.tsx').includes('Scale OS v{APP_VERSION} · Desarrollado por'),'el error global conserva versión y crédito sin depender de la hoja');
 const label=file('app/inventory-label.tsx');
 assert(!/<footer/.test(label),'la etiqueta 80×50 mm no lleva pie (excepción documentada)');
 assert(file('docs/ADOPCION-V2.md').includes('inventory-label'),'la excepción de la etiqueta queda documentada');
});
