import React from 'react';
import assert from 'node:assert/strict';
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

// Variante neutra: sin sesión, sin identidad inventada.
const neutral=render(<LoadingScreen/>);
assert(neutral.includes('Un momento, estamos preparando todo…'),'la carga sin sesión usa el texto neutro');
assert(!neutral.includes('person-container'),'la carga neutra no inventa identidad');
assert(neutral.includes('loading-orb')&&neutral.includes('workspace-wordmark'),'la marca está presente en las dos variantes');
assert(neutral.includes('loading-bar-fill'),'la barra de progreso es parte de la pantalla');

// Variante con sesión: nombre, rol y avatar.
const signedIn=render(<LoadingScreen name="Fredd D." photoUrl="https://cdn.example/foto.webp" roleLabel="Propietario"/>);
assert(signedIn.includes('Fredd D.'),'la carga con sesión muestra el nombre');
assert(signedIn.includes('Propietario'),'la carga con sesión muestra el rol');
assert(signedIn.includes('person-container-avatar'),'la carga con sesión muestra el avatar');
assert(signedIn.includes('Cargando tu espacio…'),'la carga con sesión conserva el estado de espera');
assert(!signedIn.includes('Un momento, estamos preparando todo…'),'las variantes no se mezclan');

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

console.log('PASS: la pantalla de carga muestra la identidad con sesión, cae a neutra sin sesión y anuncia el estado con cortesía');
