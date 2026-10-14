import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Unit-level DOM doubles; this does not claim visual browser verification.
require.extensions['.css']=()=>{};
// El transform de `tsx` compila el JSX de los módulos de la app en modo
// clásico: el shim global es lo que permite renderizarlos fuera de Next.
(globalThis as unknown as {React:typeof React}).React=React;
const {LoadingScreen,LOADING_SLOW_MS}=require('../app/loading-screen') as typeof import('../app/loading-screen');

const render=(element:React.ReactElement)=>{
  let renderer!:ReactTestRenderer;
  act(()=>{renderer=create(element);});
  return JSON.stringify(renderer.toJSON());
};

// Issue #64: una sola pantalla de carga, sin orbe ni anillos sobre el logo.
const globals=readFileSync('app/globals.css','utf8');
assert(!globals.includes('.loading-orb'),'no queda el orbe de carga');
assert(!globals.includes('@keyframes loading-spin'),'no queda la animación del anillo');
assert(!globals.includes('@keyframes loading-breathe'),'no queda el latido del ícono');
const tailwind=readFileSync('app/tailwind.css','utf8');
assert(tailwind.includes('.loading-bar-fill'),'la barra sigue siendo la animación de la carga');
assert(/prefers-reduced-motion[\s\S]{0,220}\.loading-bar-fill/.test(tailwind),'la barra se apaga con prefers-reduced-motion');

// Variante neutra: sin sesión, sin identidad inventada; marca estática.
const neutral=render(<LoadingScreen/>);
assert(neutral.includes('Un momento, estamos preparando todo…'),'la carga sin sesión usa el texto neutro');
assert(!neutral.includes('person-container'),'la carga neutra no inventa identidad');
assert(neutral.includes('workspace-brand')&&neutral.includes('workspace-wordmark'),'la marca está presente en las dos variantes');
assert(neutral.includes('loading-bar-fill'),'la barra de progreso es parte de la pantalla');
assert(!neutral.includes('loading-orb'),'la variante neutra no monta el orbe');

// Variante con sesión: nombre, rol y avatar, con la barra debajo del nombre.
const signedIn=render(<LoadingScreen name="Lucía Acosta" photoUrl="https://cdn.example/foto.webp" roleLabel="Propietario"/>);
assert(signedIn.includes('Lucía Acosta'),'la carga con sesión muestra el nombre');
assert(signedIn.includes('Propietario'),'la carga con sesión muestra el rol');
assert(signedIn.includes('person-container')&&signedIn.includes('foto-perfil'),'la carga con sesión muestra el avatar (objeto único)');
assert(signedIn.includes('Cargando tu espacio…'),'la carga con sesión conserva el estado de espera');
assert(!signedIn.includes('Un momento, estamos preparando todo…'),'las variantes no se mezclan');
assert(signedIn.indexOf('foto-perfil')<signedIn.indexOf('loading-bar-fill'),'la barra va debajo del nombre');
assert(!signedIn.includes('loading-orb'),'la pantalla con sesión no monta el orbe');

// Sin foto: iniciales, nunca una imagen rota en el avatar (objeto único #107).
const initials=render(<LoadingScreen name="Lucía Acosta" roleLabel="Propietario"/>);
assert(!initials.includes('<img'),'sin foto el avatar no renderiza una imagen');
assert(initials.includes('LA')&&initials.includes('foto-perfil-iniciales'),'sin foto el avatar usa las iniciales del objeto único');

// Accesibilidad: un solo anuncio cortés, barra decorativa.
const statusProps=create(<LoadingScreen/>).root.findByProps({role:'status'}).props;
assert(statusProps['aria-live']==='polite','la pantalla se anuncia sin interrumpir');
assert(create(<LoadingScreen/>).root.findAllByProps({'aria-hidden':'true'}).length>=1,'la barra es decorativa (aria-hidden)');

// Carga lenta: pasado el umbral aparece el aviso y el botón Recargar (no antes).
{
  const realSetTimeout=globalThis.setTimeout, realClear=globalThis.clearTimeout;
  const timers:(()=>void)[]=[];let delay=0;
  (globalThis as any).setTimeout=(fn:()=>void,ms:number)=>{timers.push(fn);delay=ms;return timers.length;};
  (globalThis as any).clearTimeout=()=>{};
  let renderer!:ReactTestRenderer;
  act(()=>{renderer=create(<LoadingScreen name="Lucía Acosta" roleLabel="Propietario"/>);});
  assert(!JSON.stringify(renderer.toJSON()).includes('Recargar'),'una carga normal no ofrece recargar');
  assert.equal(delay,LOADING_SLOW_MS,'el aviso espera el umbral de carga lenta');
  act(()=>{timers.forEach(fn=>fn());});
  const slow=JSON.stringify(renderer.toJSON());
  assert(slow.includes('Está tardando más de lo normal')&&slow.includes('Recargar'),'la carga lenta ofrece recargar');
  assert(slow.indexOf('loading-bar-fill')<slow.indexOf('Recargar'),'el aviso va debajo de la barra');
  globalThis.setTimeout=realSetTimeout;globalThis.clearTimeout=realClear;
}
const css=readFileSync('app/tailwind.css','utf8');
assert(/prefers-reduced-motion[\s\S]{0,120}\.loading-stage \{ animation: none/.test(css),'el fundido de entrada se apaga con prefers-reduced-motion');

console.log('PASS: una sola pantalla de carga con marca estática, identidad y barra debajo del nombre (issue #64)');
