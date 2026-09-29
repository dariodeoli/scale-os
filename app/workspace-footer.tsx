import React from 'react';
import {ProductFooter,CREDITO_PIE,CREDITO_PIE_URL} from 'owncoding-ui';
import {APP_VERSION} from './app-version';

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
 // La landing es un documento standalone sin Tailwind: conserva sus enlaces de
 // venta dentro del pie y se viste con la hoja propia del landing.
 if(variant==='landing')return <ProductFooter {...props} className="workspace-footer workspace-footer-landing">
   <a href="#precio">Ver el plan</a>
   {' · '}
   <a href="https://scaleparaguay.com/">Un producto de Scale Strategy Group ↗</a>
  </ProductFooter>;
 return <ProductFooter {...props} className="workspace-footer"/>;
}
