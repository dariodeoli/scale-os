import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {FotoPerfil}=require('../app/foto-perfil') as typeof import('../app/foto-perfil');
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const system=file('app/ui-system.css');
const plain=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(plain).join(''):plain(node.children);

test('objeto único de foto: la foto se muestra o caen las iniciales (#107)',async()=>{
 let renderer:any;
 await act(async()=>{renderer=create(<FotoPerfil nombre="María Ejemplo Fernández de Vera"/>);});
 assert.equal(renderer.root.findAllByType('img').length,0,'sin foto no inventa una imagen');
 assert(plain(renderer.toJSON()).includes('MV'),'sin foto usa las iniciales del autor (primera y última palabra)');
 assert(renderer.root.findAllByProps({className:'foto-perfil-iniciales'}).length===1,'las iniciales viven en el objeto');
 assert(String(renderer.toJSON().props.className).includes('foto-perfil-circulo'));
 await act(async()=>{renderer=create(<FotoPerfil nombre="Ana Pérez" foto="https://cdn.example/foto.webp"/>);});
 const img=renderer.root.findByType('img');
 assert.equal(img.props.referrerPolicy,'no-referrer');
 assert.equal(img.props.alt,'','la foto es decorativa: el nombre va al lado');
 assert.equal(img.props.loading,'lazy');
 await act(async()=>img.props.onError());
 assert.equal(renderer.root.findAllByType('img').length,0,'si la imagen falla, vuelven las iniciales');
 assert(plain(renderer.toJSON()).includes('AP'));
 for(const url of ['javascript:alert(1)','http://example.invalid/a.png','https://user:pass@example.invalid/a.png','data:text/html,hola']){
  await act(async()=>{renderer=create(<FotoPerfil nombre="Ana Pérez" foto={url}/>);});
  assert.equal(renderer.root.findAllByType('img').length,0,`no muestra ${url.split(':')[0]}`);
 }
});

test('objeto único de foto: tamaño, forma, variante y botón (#107)',async()=>{
 const sizes:{tamano:any;css:string}[]=[{tamano:'xs',css:'.foto-perfil-xs{--foto-perfil-size:22px}'},{tamano:'sm',css:'.foto-perfil-sm{--foto-perfil-size:24px}'},{tamano:'md',css:'.foto-perfil-md{--foto-perfil-size:28px}'},{tamano:'lg',css:'.foto-perfil-lg{--foto-perfil-size:32px}'},{tamano:'xl',css:'.foto-perfil-xl{--foto-perfil-size:40px}'},{tamano:'2xl',css:'.foto-perfil-2xl{--foto-perfil-size:48px}'},{tamano:'3xl',css:'.foto-perfil-3xl{--foto-perfil-size:64px}'}];
 for(const {tamano,css} of sizes){
  assert(system.includes(css),`la escala declara ${tamano}: ${css}`);
  let renderer:any;
  await act(async()=>{renderer=create(<FotoPerfil nombre="Ana" tamano={tamano}/>);});
  assert(String(renderer.toJSON().props.className).includes(`foto-perfil-${tamano}`));
 }
 let renderer:any;
 await act(async()=>{renderer=create(<FotoPerfil nombre="Estudio" tamano="xl" forma="cuadrado" variante="logo" foto="https://cdn.example/logo.png"/>);});
 const logo=renderer.toJSON() as any;
 assert(String(logo.props.className).includes('foto-perfil-logo')&&String(logo.props.className).includes('foto-perfil-cuadrado'));
 assert(system.includes('.foto-perfil-logo img{object-fit:contain'),'el logo se ve entero');
 assert(system.includes('.foto-perfil img{display:block;width:100%;height:100%;object-fit:cover;object-position:center top}'),'la persona encuadra desde el borde superior');
 let clicks=0;
 await act(async()=>{renderer=create(<FotoPerfil nombre="Ana Pérez" tamano="3xl" foto="https://cdn.example/a.webp" onClick={()=>{clicks+=1;}} etiqueta="Cambiar foto de Ana Pérez" badge={<span>ij</span>}/>);});
 const button=renderer.root.findByType('button');
 assert.equal(button.props['aria-label'],'Cambiar foto de Ana Pérez');
 assert(String(button.props.className).includes('foto-perfil-3xl'));
 assert(renderer.root.findAllByProps({className:'foto-perfil-badge'}).length===1,'el badge (zoom/recorte) vive en el objeto');
 await act(async()=>button.props.onClick());
 assert.equal(clicks,1);
 await act(async()=>{renderer=create(<FotoPerfil nombre="Ana" onClick={()=>{}} disabled/>);});
 assert.equal(renderer.root.findByType('button').props.disabled,true,'el estado de guardado deshabilita el botón');
});

test('objeto único de foto: no quedan implementaciones paralelas (#107)',()=>{
 const appFiles=['app/person-container.tsx','app/actor-identity.tsx','app/presence.tsx','app/client-identity.tsx','app/my-profile.tsx','app/photo-viewer.tsx','app/profile-photo.tsx','app/person-photo.tsx'];
 for(const path of appFiles){
  const source=file(path);
  assert(!/object-fit|objectPosition/.test(source),`${path} no define encuadre propio`);
 }
 for(const [path,selector] of [['app/person-container.css','person-container-avatar'],['app/actor-identity.css','actor-identity-avatar'],['app/photo-cropper.css','editable-photo'],['app/qa-fixes.css','photo-preview-button'],['app/assigned-people.css','actor-identity-avatar'],['app/operations.css','.avatar img']] as [string,string][]){
  const css=file(path);
  assert(!css.includes(`${selector}{`)&&!css.includes(`${selector} img{`)&&!css.includes(`${selector} {`),`${path} ya no define ${selector}`);
 }
 assert(cssCount('object-fit:cover')>=1,'el objeto declara el encuadre de persona');
 const avatarSheets=['app/person-container.css','app/actor-identity.css','app/presence.css','app/photo-cropper.css','app/client-identity.css','app/operations.css','app/qa-fixes.css','app/assigned-people.css','app/client-directory.css'];
 // Única excepción documentada: el lienzo ampliado del visor (no es un avatar).
 for(const path of avatarSheets){
  const hits=(file(path).match(/object-fit/g)??[]).length;
  const lienzo=path==='app/photo-cropper.css'||path==='app/qa-fixes.css';
  assert(lienzo?hits<=1:hits===0,`${path} no repite el encuadre de fotos (${hits} object-fit)`);
 }
 assert(file('app/photo-cropper.css').includes('.photo-canvas img{pointer-events:none;user-select:none;object-fit:cover!important}'),'el visor ampliado conserva su encuadre de zoom');
 assert(file('app/qa-fixes.css').includes('.photo-canvas img{display:block;width:100%;height:100%;max-width:none;object-fit:contain}'),'y su lienzo');
 function cssCount(token:string){return system.split(token).length-1;}
 assert(file('app/ui-system.css').includes('Objeto único (`app/foto-perfil.tsx`)'),'el encuadre vive en el sistema, una sola vez');
});
