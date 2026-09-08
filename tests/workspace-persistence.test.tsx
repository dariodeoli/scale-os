import React, {useEffect,useState} from 'react';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {create,act,ReactTestRenderer} from 'react-test-renderer';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';
import {usePathname} from 'next/navigation';
import {WorkspaceFrame} from '../app/workspace-frame';
import {sections,sectionLabel} from '../app/navigation';

let mounts=0,unmounts=0;
function WorkspaceProbe(){
 const [value,setValue]=useState(0),path=usePathname();
 useEffect(()=>{mounts++;return()=>{unmounts++;};},[]);
 return <button onClick={()=>setValue(v=>v+1)}>{sectionLabel(path)}:{value}</button>;
}
function PageBeforeA(){return <WorkspaceProbe/>;}
function PageBeforeB(){return <WorkspaceProbe/>;}
let renderer:ReactTestRenderer;
// Reproduce the previous route-page architecture: it loses component state.
act(()=>{renderer=create(<PathnameContext.Provider value="/clientes"><PageBeforeA/></PathnameContext.Provider>);});
act(()=>{renderer.root.findByType('button').props.onClick();});
act(()=>{renderer.update(<PathnameContext.Provider value="/proyectos"><PageBeforeB/></PathnameContext.Provider>);});
assert.equal(mounts,2);assert.equal(unmounts,1);assert.equal(renderer!.root.findByType('button').children.join(''),'Proyectos:0');
act(()=>renderer.unmount());mounts=0;unmounts=0;

function tree(path:string){return <PathnameContext.Provider value={path}><WorkspaceFrame workspace={<WorkspaceProbe/>}><p>Not found</p></WorkspaceFrame></PathnameContext.Provider>;}
act(()=>{renderer=create(tree('/'));});
act(()=>{renderer.root.findByType('button').props.onClick();});
for(const [label,slug] of [...sections,...sections.slice().reverse()]){
 act(()=>renderer.update(tree('/'+slug)));
 assert.equal(mounts,1,`workspace remounted at ${slug}`);assert.equal(unmounts,0);
 assert.equal(renderer!.root.findByType('button').children.join(''),`${label}:1`,'section changes while state survives');
}
act(()=>renderer.update(tree('/unknown')));assert.equal(renderer!.root.findByType('p').children.join(''),'Not found');assert.equal(unmounts,1);
act(()=>renderer.unmount());
const layout=readFileSync(new URL('../app/(workspace)/layout.tsx',import.meta.url),'utf8');
assert(layout.includes('workspace={<ScaleWorkspace/>}'));assert(!layout.includes('key='));
const workspace=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
const backgroundRefresh=workspace.slice(workspace.indexOf('if(lastDataPath.current===pathname)'),workspace.indexOf('},[pathname,signedIn]);'));
assert(backgroundRefresh.includes('void load()'));assert(!backgroundRefresh.includes('setLoading'));assert(!backgroundRefresh.includes('/api/auth/me'));
for(const path of ['page.tsx','[section]/page.tsx','[section]/[view]/page.tsx']){
 const page=readFileSync(new URL('../app/(workspace)/'+path,import.meta.url),'utf8');
 assert(!page.includes('ScaleWorkspace'));assert(page.includes('return null'));assert(!existsSync(new URL('../app/'+path,import.meta.url)));
}
console.log('PASS: reproduced page remount; persistent layout retains state through 30 forward/back route updates; invalid routes delegate to 404; only the shared layout owns ScaleWorkspace');
