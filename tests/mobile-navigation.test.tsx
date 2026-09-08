import React from 'react';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PathnameContext} from 'next/dist/shared/lib/hooks-client-context.shared-runtime';

// Unit-level DOM doubles; this does not claim visual browser verification.
require.extensions['.css']=()=>{};
const dom=require('react-dom');
const originalPortal=dom.createPortal;
dom.createPortal=(children:React.ReactNode)=>children;
const {MobileNavigation}=require('../app/mobile-navigation') as typeof import('../app/mobile-navigation');
const shell={inert:false};
let restored=0;
const previous={isConnected:true,focus(){assert.equal(shell.inert,false);restored++;}};
const keyboard=new Set<(e:unknown)=>void>();
const resize=new Set<()=>void>();
const media={matches:false,addEventListener(_name:string,fn:()=>void){resize.add(fn);},removeEventListener(_name:string,fn:()=>void){resize.delete(fn);}};
Object.defineProperty(globalThis,'document',{configurable:true,value:{
 body:{style:{overflow:'auto'}},activeElement:previous,
 querySelector:()=>shell,
 addEventListener(_name:string,fn:(e:unknown)=>void){keyboard.add(fn);},
 removeEventListener(_name:string,fn:(e:unknown)=>void){keyboard.delete(fn);},
}});
Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>media}});
let renderer:ReactTestRenderer;
const tree=(path:string)=><PathnameContext.Provider value={path}><MobileNavigation><nav><a href="/equipo">Equipo</a></nav></MobileNavigation></PathnameContext.Provider>;
const button=()=>renderer.root.findByProps({'aria-label':'Abrir menú'});
const open=()=>act(()=>button().props.onClick());
const closed=()=>{assert.equal(button().props['aria-expanded'],false);assert.equal(renderer.root.findAllByProps({role:'dialog'}).length,0);assert.equal(shell.inert,false);assert.equal(document.body.style.overflow,'auto');assert.equal(keyboard.size,0);};
act(()=>{renderer=create(tree('/resumen'),{createNodeMock:()=>({querySelector:()=>({focus(){}})})});});
closed();open();
assert.equal(button().props['aria-expanded'],true);assert.equal(shell.inert,true);assert.equal(document.body.style.overflow,'hidden');
const dialog=renderer!.root.findByProps({role:'dialog'});
assert.equal(dialog.props['aria-modal'],'true');assert.equal(button().props['aria-controls'],dialog.props.id);
assert.equal(renderer!.root.findByType('a').props.href,'/equipo');
act(()=>renderer.root.findByProps({'aria-label':'Cerrar menú'}).props.onClick());closed();assert.equal(restored,1);
open();act(()=>{keyboard.forEach(fn=>fn({key:'Escape',defaultPrevented:false,preventDefault(){},stopImmediatePropagation(){}}));});closed();
open();act(()=>{const backdrop=renderer.root.findByProps({className:'mobile-sidebar-backdrop'});const target={};backdrop.props.onClick({target,currentTarget:target});});closed();
open();act(()=>renderer.root.findByProps({className:'mobile-sidebar-body'}).props.onClick({target:{closest:()=>({})}}));closed();
open();act(()=>renderer.update(tree('/equipo')));closed();
open();act(()=>{media.matches=true;resize.forEach(fn=>fn());});closed();
act(()=>renderer.unmount());assert.equal(resize.size,0);assert.equal(keyboard.size,0);
dom.createPortal=originalPortal;
const source=readFileSync(new URL('../app/scale-workspace.tsx',import.meta.url),'utf8');
assert(source.includes('<MobileNavigation>{sidebarContent}</MobileNavigation>'));
assert(!source.includes('className="mobile-nav"'));
assert.equal((source.match(/visibleNav.map/g)||[]).length,1,'one permission-filtered menu shared on both sizes');
assert(source.includes('className="topbar-logo"'));
const css=readFileSync(new URL('../app/mobile-navigation.css',import.meta.url),'utf8');
assert(css.includes('height:100dvh'));assert(css.includes('prefers-reduced-motion'));assert(css.includes('z-index:40'));assert(css.includes('min-height:44px'));
assert(!css.match(/#[0-9a-f]{3,8}\b/i));
console.log('PASS: mobile drawer starts closed; opens/closes by button, Escape, backdrop, link, route and desktop resize; focus/scroll/inert restored; shared permission-filtered menu and topbar logo');
