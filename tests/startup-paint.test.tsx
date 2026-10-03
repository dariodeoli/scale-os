import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {act,create} from 'react-test-renderer';
Object.assign(globalThis,{React});require.extensions['.css']=()=>{};
const {KpiStripSkeleton}=require('../app/ui-v2') as typeof import('../app/ui-v2');
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const shell=file('app/scale-workspace.tsx');

test('arranque #109: el shell pinta al conocer la identidad, no cuando llegan los datos',()=>{
 // La carga inicial sigue siendo la puerta de permisos: el arranque espera la
 // identidad (auth), no el paquete de datos.
 const auth=shell.slice(shell.indexOf('request<{ user: User }>("/api/auth/me")'));
 const block=auth.slice(0, auth.indexOf('}, []);'));
 assert.match(block, /void load\(data\.user,sectionScope\(sectionLabel\(pathname\)\)\)/,'los datos arrancan sin bloquear el pintado');
 assert.doesNotMatch(block, /return load\(/,'el pintado no espera el resultado de los datos');
 assert.match(block, /\.finally\(\(\) => setLoading\(false\)\)/,'la pantalla de carga se apaga con la identidad');
 assert.ok(block.indexOf('void load(')<block.indexOf('.finally(() => setLoading(false))'),'el orden es: pintar y seguir cargando');
 // El proveedor de Google no bloquea: viaja en el mismo efecto, en paralelo.
 const effectStart=shell.lastIndexOf('useEffect', shell.indexOf('request<{ user: User }>("/api/auth/me")'));
 const effect=shell.slice(effectStart, shell.indexOf('}, []);', effectStart)+8);
 assert(effect.includes('("/api/auth/providers")'),'providers corre en el mismo efecto (paralelo)');
 assert(effect.indexOf('/api/auth/providers')<effect.indexOf('/api/auth/me'),'y no espera al usuario');
 // La identidad fresca (#81) se conserva: el alcance por sección y el estado de
 // identidad siguen igual.
 assert(shell.includes('setWorkspaceScope(scope);userRef.current=data.user;'),'el alcance por tenant se fija con la identidad');
 assert(shell.includes('setIdentityLoading(true)')&&shell.includes('setIdentityLoading(false)'),'la identidad fresca conserva su estado de carga');
});

test('arranque #109: los bloques muestran esqueletos honestos, no ceros',async()=>{
 // Resumen: la sección entera espera con esqueleto (ya existía).
 assert(file('app/sections/resumen.tsx').includes("dataState === 'loading' && !orders.length && !projects.length && !summary.active_clients"),'Resumen no inventa ceros');
 // Clientes y Proyectos: la tira de KPIs usa el esqueleto del sistema.
 for(const [path,condition] of [
  ['app/sections/clientes.tsx',"dataState === 'loading' && !clients.length ? <KpiStripSkeleton"],
  ['app/sections/proyectos.tsx',"projectsState === 'loading' && !projects.length ? <KpiStripSkeleton"],
 ] as [string,string][])assert(file(path).includes(condition),`${path} espera con esqueleto`);
 // El contador del directorio no afirma «0» mientras carga.
 const toolbar=file('app/client-directory-toolbar.tsx');
 assert(toolbar.includes('loading?: boolean'),'la toolbar acepta el estado de carga');
 assert(toolbar.includes("loading ? 'Cargando el directorio…' : summary"),'y lo dice en vez del resumen');
 assert(shell.includes("loading={shellDataState==='loading'}"),'el shell le pasa el estado real');
 assert(shell.includes("active==='Proyectos'&&shellDataState!=='loading'"),'el contador de Proyectos no afirma cero');
 // El esqueleto: misma grilla que la tira real, sin números.
 let renderer:any;
 await act(async()=>{renderer=create(<KpiStripSkeleton count={3} label="Cargando el directorio…"/>);});
 const tree=renderer.toJSON() as any;
 assert.equal(tree.props.role,'status');
 assert.equal(tree.props['aria-busy'],'true');
 assert.equal(tree.props['aria-label'],'Cargando el directorio…');
 assert.equal(tree.children.length,3,'un esqueleto por KPI');
 const texto=(node:any):string=>!node?'':typeof node==='string'?node:Array.isArray(node)?node.map(texto).join(''):texto(node.children);
 assert(!/\d/.test(texto(tree)),'el esqueleto no dibuja cifras (nada de ceros inventados)');
 assert(String(tree.props.className).includes('ui-kpi-strip grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4'),'comparte la grilla del sistema');
});
