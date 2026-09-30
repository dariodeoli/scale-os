import React from 'react';
import Link from 'next/link';
import {ProductFooter,CREDITO_PIE,CREDITO_PIE_URL} from 'owncoding-ui';
import {APP_VERSION} from './app-version';
import {PRIVACY_NOTICE_URL} from './privacy-notice';

// Puente sin lógica al pie institucional de la biblioteca (owncoding-ui §14,
// Refs #82): la app sólo aporta marca y versión real; el pie con
// `data-testid="product-footer"`, el copyright y el crédito del grupo (con
// enlace) los dibuja `ProductFooter`. Prohibido volver a dibujar el pie a mano.
export const APP_NAME='Scale OS';
export const APP_VERSION_LABEL=`v${APP_VERSION}`;
export const APP_CREDIT=CREDITO_PIE;
export const APP_CREDIT_URL=CREDITO_PIE_URL;

export function WorkspaceFooter({variant='workspace',year}:{variant?:'workspace'|'landing';year?:number}={}){
 const props={nombre:APP_NAME,version:APP_VERSION_LABEL,credito:APP_CREDIT,creditoUrl:APP_CREDIT_URL,...(year?{anio:year}:{})};
 // Toda superficie con pie enlaza el aviso público (Ley 7593/2025, Refs #113):
 // en el marco interno se navega dentro del host; la landing es un documento
 // standalone sin Tailwind y usa la URL absoluta canónica.
 if(variant==='landing')return <ProductFooter {...props} className="workspace-footer workspace-footer-landing">
   <a href="#precio">Ver el plan</a>
   {' · '}
   <a href={PRIVACY_NOTICE_URL}>Privacidad</a>
   {' · '}
   <a href="https://scaleparaguay.com/">Un producto de Scale Strategy Group ↗</a>
  </ProductFooter>;
 return <ProductFooter {...props} className="workspace-footer">
  <Link href="/privacidad">Privacidad</Link>
 </ProductFooter>;
}
