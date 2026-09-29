import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {VersionNotice,versionPublicada}=require('../app/version-notice') as typeof import('../app/version-notice');
const {APP_VERSION}=require('../app/app-version') as typeof import('../app/app-version');
const text=(node:any):string=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.children?text(node.children):'';
const state:{version?:string;fail:boolean}={fail:false};
function environment(t:any){
 let reloads=0;const intervals=new Set<()=>void>(),listeners:Record<string,()=>void>={};
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>{
  assert.equal(String(input),'/core-api/health','la versión publicada sale de la fuente pública del API');
  if(state.fail)throw new Error('sin red');
  return {json:async()=>state.version?{ok:true,database:'ready',release:{version:state.version}}:{ok:true,database:'ready'}} as Response;
 });
 Object.assign(globalThis,{document:{hidden:false,addEventListener:(name:string,callback:()=>void)=>{listeners[name]=callback;},removeEventListener:()=>{}},window:{setInterval:((callback:()=>void)=>{intervals.add(callback);return callback;}) as any,clearInterval:(callback:()=>void)=>{intervals.delete(callback);},location:{reload:()=>{reloads+=1;}}}});
 return {reloads:()=>reloads,intervals,listeners};
}
async function mount(){let renderer!:ReactTestRenderer;await act(async()=>{renderer=create(<VersionNotice/>);});return renderer;}

test('a newer published version raises an actionable reload notice',async t=>{
 state.fail=false;state.version='99.9.9';
 const env=environment(t);
 const renderer=await mount();
 const copy=text(renderer.toJSON());
 assert(copy.includes('Versión nueva')&&copy.includes('Recargar'),'el aviso ofrece recargar');
 const button=renderer.root.findAllByType('button')[0]!;
 assert(String(button.props.title).includes('v99.9.9'),'el tooltip nombra la versión publicada');
 await act(async()=>button.props.onClick());
 assert.equal(env.reloads(),1,'recargar aplica la versión nueva');
 await act(()=>renderer.unmount());
});

test('the same or unknown version never claims a false update',async t=>{
 state.fail=false;
 for(const version of [APP_VERSION,`v${APP_VERSION}`,undefined]){
  state.version=version as string|undefined;
  const renderer=await mount();
  assert.equal(text(renderer.toJSON()),'','sin versión nueva no hay aviso');
  await act(()=>renderer.unmount());
 }
 state.fail=true;state.version=undefined;
 const offline=await mount();
 assert.equal(text(offline.toJSON()),'','una falla de red no inventa versión');
 await act(()=>offline.unmount());
});

test('the published version comes from /health release.version and tolerates its absence',async t=>{
 const calls:string[]=[];
 t.mock.method(globalThis,'fetch',async(input:RequestInfo|URL)=>{calls.push(String(input));return {json:async()=>({release:{version:'v1.2.3'}})} as Response;});
 assert.equal(await versionPublicada(),'v1.2.3');
 t.mock.method(globalThis,'fetch',async()=>{throw new Error('sin red');});
 assert.equal(await versionPublicada(),'','una falla de red no inventa versión');
 assert(calls.every(url=>url==='/core-api/health'));
});

test('the shell mounts the notice in the topbar status and the layout applies the stored theme',()=>{
 const shell=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
 const status=shell.slice(shell.indexOf('topbar-status'),shell.indexOf('topbar-utility-actions'));
 assert(status.includes('<VersionNotice/>'),'el aviso vive en el marco, junto al chip de suscripción');
 assert(status.includes('SubscriptionNotice'));
 const layout=readFileSync(new URL('../app/layout.tsx',import.meta.url),'utf8');
 assert(layout.includes("'contrast'")&&layout.includes('prefers-contrast'),'el layout aplica el alto contraste guardado o pedido por el sistema');
 const guide=readFileSync(new URL('../app/workspace-guide.tsx',import.meta.url),'utf8');
 assert(guide.includes('href="/status"'),'el estado del sistema se alcanza desde la ayuda');
});
