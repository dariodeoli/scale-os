import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Unit-level DOM doubles; this does not claim visual browser verification.
require.extensions['.css']=()=>{};
// El transform de `tsx` compila el JSX de los módulos de la app en modo
// clásico: el shim global es lo que permite renderizarlos fuera de Next.
(globalThis as unknown as {React:typeof React}).React=React;
const {LoadingScreen}=require('../app/loading-screen') as typeof import('../app/loading-screen');

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
const signedIn=render(<LoadingScreen name="Fredd D." photoUrl="https://cdn.example/foto.webp" roleLabel="Propietario"/>);
assert(signedIn.includes('Fredd D.'),'la carga con sesión muestra el nombre');
assert(signedIn.includes('Propietario'),'la carga con sesión muestra el rol');
assert(signedIn.includes('person-container-avatar'),'la carga con sesión muestra el avatar');
assert(signedIn.includes('Cargando tu espacio…'),'la carga con sesión conserva el estado de espera');
assert(!signedIn.includes('Un momento, estamos preparando todo…'),'las variantes no se mezclan');
assert(signedIn.indexOf('person-container')<signedIn.indexOf('loading-bar-fill'),'la barra va debajo del nombre');
assert(!signedIn.includes('loading-orb'),'la pantalla con sesión no monta el orbe');

// Sin foto: iniciales, nunca una imagen rota en el avatar.
let initialsRenderer!:ReactTestRenderer;
act(()=>{initialsRenderer=create(<LoadingScreen name="Fredd D." roleLabel="Propietario"/>);});
const avatarChildren=JSON.stringify(initialsRenderer.root.findByProps({className:'person-container-avatar'}).children);
assert(!avatarChildren.includes('img'),'sin foto el avatar no renderiza una imagen');
assert(avatarChildren.includes('FD'),'sin foto el avatar usa las iniciales');

// Accesibilidad: un solo anuncio cortés, barra decorativa.
const statusProps=create(<LoadingScreen/>).root.findByProps({role:'status'}).props;
assert(statusProps['aria-live']==='polite','la pantalla se anuncia sin interrumpir');
assert(create(<LoadingScreen/>).root.findAllByProps({'aria-hidden':'true'}).length>=1,'la barra es decorativa (aria-hidden)');

console.log('PASS: una sola pantalla de carga con marca estática, identidad y barra debajo del nombre (issue #64)');
