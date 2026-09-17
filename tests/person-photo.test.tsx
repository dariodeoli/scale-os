import React from 'react';
import assert from 'node:assert/strict';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});
require.extensions['.css']=()=>{};
const {PersonPhotoField}=require('../app/person-photo') as typeof import('../app/person-photo');
const textOf=(children:unknown):string=>{if(typeof children==='string')return children;if(Array.isArray(children))return children.map(textOf).join('');return '';};
const text=(node:{props:{children?:unknown}}|undefined):string=>node?textOf(node.props.children):'';
const findButton=(label:string,instance:any)=>instance.root.findAllByType('button').find((node:any)=>text(node).includes(label)||String(node.props['aria-label']||'').includes(label));
async function main(){
 let renderer:any;
 act(()=>{renderer=create(<PersonPhotoField photo={null} name="Guille Larán" save={async()=>{}}/>);});
 assert.match(JSON.stringify(renderer.toJSON()),/G/,'sin foto muestra la inicial del nombre');
 assert(renderer.root.findByProps({'aria-label':'Elegir foto de Guille Larán'}),'el avatar abre el selector de archivo');
 let saved='',rendererB:any;
 act(()=>{rendererB=create(<PersonPhotoField photo="https://cdn.example/p.jpg" name="Guille Larán" save={async value=>{saved=value;}}/>);});
 const quit=findButton('Quitar foto',rendererB);assert(quit,'el botón Quitar foto aparece con foto');
 await act(async()=>{quit.props.onClick();});
 assert.equal(saved,'','quitar foto guarda el vacío para borrarla del servidor');
 assert.match(JSON.stringify(rendererB.toJSON()),/Foto quitada/,'confirma la eliminación y avisa que la foto de Google no se restaura sola');
 const link=findButton('Usar enlace',rendererB);assert(link,'el modo enlace está disponible');
 act(()=>{link.props.onClick();});
 assert(rendererB.root.findAllByType('input').some((node:any)=>node.props.type==='url'),'el modo enlace muestra el campo de URL');
 act(()=>rendererB.unmount());
 console.log('PASS: person photo field renders initials, saves removal as empty, exposes link mode and keeps accessible labels');
}
void main();
