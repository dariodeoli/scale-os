import React from 'react';
import {APP_VERSION} from './app-version';
export function WorkspaceFooter({variant='workspace',year=new Date().getFullYear()}:{variant?:'workspace'|'landing';year?:number}={}){
 const copyright=<span>© {year} Scale OS. Todos los derechos reservados. · v{APP_VERSION}{variant==='landing'?' · Un producto de Scale Strategy Group':''}</span>;
 if(variant==='landing')return <footer><div className="wrap footer-inner">{copyright}<a href="#precio">Ver el plan</a><a href="https://scaleparaguay.com/">Conocé Scale Strategy Group ↗</a></div></footer>;
  return <footer className="workspace-footer flex flex-wrap items-center justify-between gap-2 border-t border-ink-600 pt-4 text-xs text-mute">{copyright}<span>Desarrollado por <a href="https://owncoding.dev/" target="_blank" rel="noopener noreferrer" className="text-fono-light hover:underline">Owncoding</a></span></footer>;
}
