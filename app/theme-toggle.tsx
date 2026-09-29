'use client';
import {useEffect,useState} from 'react';
import {Contrast,Moon,Sun} from 'lucide-react';
import './theme-toggle.css';

// Tres temas (§15 regla 4, Refs #82): claro → oscuro → alto contraste. La
// preferencia vive en `scale-theme` y el layout la aplica antes del primer
// pintado (sin parpadeo). El alto contraste se declara con los mismos tokens
// (app/contrast.css); el control sólo cambia `data-theme`.
export type ThemeName='light'|'dark'|'contrast';
export const TEMAS:ThemeName[]=['light','dark','contrast'];
export const ETIQUETAS_TEMA:Record<ThemeName,string>={light:'Tema claro',dark:'Tema oscuro',contrast:'Alto contraste'};
const ICONOS={light:Sun,dark:Moon,contrast:Contrast};

/** Tema vigente en el documento (o preferencia guardada). */
export function temaActual():ThemeName{
 const applied=document.documentElement.dataset.theme;
 if(applied==='dark'||applied==='contrast')return applied;
 try{const stored=localStorage.getItem('scale-theme');if(stored==='dark'||stored==='contrast')return stored;}catch{/* Preferencia opcional. */}
 return 'light';
}

/** Siguiente tema del ciclo claro → oscuro → alto contraste. */
export function siguienteTema(actual:ThemeName):ThemeName{return TEMAS[(TEMAS.indexOf(actual)+1)%TEMAS.length]!;}

export function ThemeToggle({className=''}:{className?:string}){
 const [theme,setTheme]=useState<ThemeName>('light');
 useEffect(()=>{setTheme(temaActual());},[]);
 function toggle(){
  const next=siguienteTema(temaActual());
  if(next==='light')document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme=next;
  setTheme(next);
  try{localStorage.setItem('scale-theme',next);}catch{/* Sin almacenamiento el tema igual se aplicó. */}
 }
 const Icon=ICONOS[theme];
 return <button type="button" className={className?`theme-toggle ${className}`:'theme-toggle'} onClick={toggle} aria-label={`Cambiar tema (ahora: ${ETIQUETAS_TEMA[theme]})`} title={`${ETIQUETAS_TEMA[theme]} · clic para el siguiente`} data-theme-state={theme}><Icon size={18}/></button>;
}
