import React,{useEffect,useRef} from 'react';
import assert from 'node:assert/strict';
import {test,after,afterEach} from 'node:test';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

// Real components/hooks, local DOM doubles only. No browser, network, native picker
// rendering or CSS layout is simulated; key event propagation is explicit below.
require.extensions['.css']=()=>{};
Object.assign(globalThis,{React});
const reactDOM=require('react-dom');
const originalPortal=reactDOM.createPortal;
const portals:{children:React.ReactNode;target:unknown}[]=[];
reactDOM.createPortal=(children:React.ReactNode,target:unknown)=>{portals.push({children,target});return children;};
const {Dialog,FormActions,useOverlay,useDialogClose,useDialogPending}=require('../app/dialog') as typeof import('../app/dialog');
const {SelectCustom}=require('../app/profile-controls') as typeof import('../app/profile-controls');
const {PhotoViewer}=require('../app/photo-viewer') as typeof import('../app/photo-viewer');

type FakeEvent={key?:string;target?:FakeElement;shiftKey?:boolean;repeat?:boolean;isComposing?:boolean;defaultPrevented:boolean;stopped:boolean;preventDefault:()=>void;stopPropagation:()=>void;stopImmediatePropagation:()=>void};
const listeners=new Map<string,Set<(event:FakeEvent)=>void>>();
function emit(name:string,event:FakeEvent){for(const listener of Array.from(listeners.get(name)||[])){listener(event);if(event.stopped)break;}}
function event(key?:string,target=doc.activeElement):FakeEvent{return {key,target,defaultPrevented:false,stopped:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){this.stopped=true;},stopImmediatePropagation(){this.stopped=true;}};}
function key(key:string,options:Partial<FakeEvent>={}){const e=Object.assign(event(key),options);act(()=>emit('keydown',e));return e;}
class FakeElement {
 tagName:string;tabIndex:number;id='';isConnected=true;disabled=false;hidden=false;inert=false;visible=true;visibility='visible';type='';role='';selected=false;focuses=0;
 parent:FakeElement|null=null;children:FakeElement[]=[];
 ownerDocument={defaultView:{getComputedStyle:(el:FakeElement)=>({visibility:el.visibility})}};
 constructor(tag='section',children:FakeElement[]=[]){this.tagName=tag.toUpperCase();this.tabIndex=['BUTTON','SELECT','INPUT','TEXTAREA','A','SUMMARY'].includes(this.tagName)?0:-1;this.append(...children);}
 append(...children:FakeElement[]){children.forEach(child=>{child.parent=this;this.children.push(child);});return this;}
 contains(node:FakeElement|null|undefined):boolean{return !!node&&(node===this||this.children.some(child=>child.contains(node)));}
 matches(selector:string){assert.equal(selector,':disabled');return this.disabled;}
 closest(selector:string):FakeElement|null{
  if(selector==='form'&&this.tagName==='FORM')return this;
  if(selector==='[role="dialog"]'&&this.role==='dialog')return this;
  if(selector==='[hidden],[inert]'&&(this.hidden||this.inert))return this;
  return this.parent?.closest(selector)||null;
 }
 querySelectorAll(selector:string):FakeElement[]{
  const all=this.children.flatMap(child=>[child,...child.querySelectorAll('*')]);
  if(selector==='*')return all;
  if(selector.includes('[role="option"]'))return all.filter(child=>child.role==='option');
  return all.filter(child=>!(child.tagName==='INPUT'&&child.type==='hidden')&&(selector.split(',').some(part=>part.startsWith(child.tagName.toLowerCase()))||child.tabIndex>=0));
 }
 querySelector(selector:string){return this.querySelectorAll(selector).find(child=>!selector.includes('[aria-selected="true"]')||child.selected)||this.querySelectorAll(selector)[0]||null;}
 getClientRects(){return this.visible?[{}]:[];}
 getBoundingClientRect(){return {x:20,y:20,left:20,top:20,right:220,bottom:60,width:200,height:40};}
 focus(){doc.activeElement=this;this.focuses++;emit('focusin',event(undefined,this));}
}
const external=new FakeElement('button');
const doc={body:{style:{overflow:'auto'}},activeElement:external,addEventListener(name:string,listener:(event:FakeEvent)=>void){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name)!.add(listener);},removeEventListener(name:string,listener:(event:FakeEvent)=>void){listeners.get(name)?.delete(listener);}};
const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
Object.defineProperty(globalThis,'document',{configurable:true,value:doc});
Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:800,innerHeight:700,addEventListener(){},removeEventListener(){}}});
let renderer:ReactTestRenderer|undefined;
function mount(children:React.ReactElement,nodeMock:(element:React.ReactElement)=>unknown=()=>new FakeElement()){
 act(()=>{renderer=create(children,{createNodeMock:nodeMock});});return renderer!;
}
function finish(){act(()=>renderer?.unmount());renderer=undefined;assert.equal(doc.body.style.overflow,'auto');assert.equal(Array.from(listeners.values()).reduce((sum,set)=>sum+set.size,0),0,'all overlay listeners released');doc.activeElement=external;}
function Overlay({element,close,children}:{element:FakeElement;close:()=>void;children?:React.ReactNode}){
 const panel=useRef(element as unknown as HTMLElement);useOverlay(panel,close);return <>{children}</>;
}
afterEach(()=>finish());
function check(name:string,run:()=>void){test(name,run);}
 check('native selects participate in initial focus and both Tab boundaries; unavailable controls excluded',()=>{
  const disabled=new FakeElement('button');disabled.disabled=true;
  const hidden=new FakeElement('input');hidden.type='hidden';
  const negative=new FakeElement('button');negative.tabIndex=-1;
  const invisible=new FakeElement('button');invisible.visibility='hidden';
  const noRect=new FakeElement('button');noRect.visible=false;
  const inert=new FakeElement('div',[new FakeElement('button')]);inert.inert=true;
  const select=new FakeElement('select'),text=new FakeElement('textarea');
  const panel=new FakeElement('section',[disabled,hidden,negative,invisible,noRect,inert,select,text]);
  let closed=0;mount(<Overlay element={panel} close={()=>closed++}/>);
  assert.equal(doc.activeElement,select);assert.equal(doc.body.style.overflow,'hidden');
  assert.equal(key('Tab',{shiftKey:true}).defaultPrevented,true);assert.equal(doc.activeElement,text);
  key('Tab');assert.equal(doc.activeElement,select);
  key('Escape');assert.equal(closed,0,'focused native select owns Escape, even when its open state is unknowable');
  text.focus();key('Escape',{isComposing:true});key('Escape',{repeat:true});assert.equal(closed,0);
  key('Escape');assert.equal(closed,1);
 });
 check('focus containment recovers external/programmatic focus and keeps portal descendants reachable',()=>{
  const first=new FakeElement('button'),last=new FakeElement('button'),panel=new FakeElement('section',[first,last]);
  mount(<Overlay element={panel} close={()=>{}}/>);
  external.focus();assert.equal(doc.activeElement,first);
  const portalOption=new FakeElement('button');panel.append(portalOption);portalOption.focus();assert.equal(doc.activeElement,portalOption);
  key('Tab');assert.equal(doc.activeElement,first);
  doc.activeElement=external;key('Tab',{shiftKey:true});assert.equal(doc.activeElement,portalOption);
 });
 check('an empty overlay receives fallback focus and traps Tab; disconnected trigger is not focused',()=>{
  const panel=new FakeElement();external.isConnected=false;const before=external.focuses;
  mount(<Overlay element={panel} close={()=>{}}/>);assert.equal(doc.activeElement,panel);
  assert.equal(key('Tab').defaultPrevented,true);assert.equal(doc.activeElement,panel);
  finish();assert.equal(external.focuses,before);external.isConnected=true;
 });
 check('nested dialogs mounted together close only the top layer and restore the original trigger',()=>{
  let parentClosed=0,childClosed=0;const parent=new FakeElement('section',[new FakeElement('button')]),child=new FakeElement('section',[new FakeElement('button')]);let sections=0;
  function tree(showChild:boolean){return <Dialog title="Parent" close={()=>parentClosed++}>{showChild&&<Dialog title="Child" close={()=>childClosed++}><p>Child body</p></Dialog>}</Dialog>;}
  mount(tree(true),el=>el.type==='section'?(sections++===0?child:parent):new FakeElement());
  // Ref commit order is child first too; assertions do not depend on visual layout.
  external.focus();assert.equal(doc.activeElement,child.children[0],'only the top layer contains focus');
  key('Escape');assert.equal(childClosed,1);assert.equal(parentClosed,0);
  const buttons=renderer!.root.findAllByProps({'aria-label':'Cerrar'});act(()=>buttons[0].props.onClick());assert.equal(parentClosed,0,'covered parent close button is guarded');
  act(()=>{const target={};renderer!.root.findAllByProps({className:'ops-overlay'})[0].props.onMouseDown({target,currentTarget:target,button:0});});assert.equal(parentClosed,0,'covered parent backdrop is guarded');
  act(()=>renderer!.update(tree(false)));assert.equal(doc.body.style.overflow,'hidden');
  key('Escape',{repeat:true});assert.equal(parentClosed,0,'holding Escape must not cascade');
  key('Escape');assert.equal(parentClosed,1);
  finish();assert.equal(doc.activeElement,external);
 });
 check('real photo overlay keeps its legacy hook, nested focus, zoom and independent Escape dismissal',()=>{
  let closed=0;const opener=new FakeElement('button'),parent=new FakeElement('section',[opener]),photoClose=new FakeElement('button'),range=new FakeElement('input'),photo=new FakeElement('section',[photoClose,range]);range.type='range';
  mount(<Dialog title="Profile" close={()=>closed++}><PhotoViewer photo="data:image/png;base64,cGhvdG8=" name="Fictional person"/></Dialog>,el=>el.props.className==='photo-dialog'?photo:el.type==='section'?parent:new FakeElement());
  opener.focus();act(()=>renderer!.root.findByProps({'aria-label':'Ampliar foto de Fictional person'}).props.onClick());
  assert.equal(renderer!.root.findAllByProps({role:'dialog'}).length,2);assert.equal(doc.activeElement,photoClose);
  opener.focus();assert.equal(doc.activeElement,photoClose,'underlying dialog cannot reclaim focus');
  const zoom=renderer!.root.findByProps({'aria-label':'Nivel de zoom de la foto'});act(()=>zoom.props.onChange({target:{value:'200'}}));assert.equal(renderer!.root.findByProps({'aria-label':'Nivel de zoom de la foto'}).props.value,200);
  key('Escape');assert.equal(closed,0);assert.equal(renderer!.root.findAllByProps({role:'dialog'}).length,1);assert.equal(doc.activeElement,opener);assert.equal(doc.body.style.overflow,'hidden');
  key('Escape');assert.equal(closed,1);
 });
 check('unmounting a covered overlay does not steal focus; surviving child inherits trigger restoration',()=>{
  const parentControl=new FakeElement('button'),parent=new FakeElement('section',[parentControl]),childControl=new FakeElement('button'),child=new FakeElement('section',[childControl]);
  function tree(showParent:boolean,showChild:boolean){return <>{showParent&&<Overlay key="parent" element={parent} close={()=>{}}/>}{showChild&&<Overlay key="child" element={child} close={()=>{}}/>}</>;}
  mount(tree(true,false));assert.equal(doc.activeElement,parentControl);
  act(()=>renderer!.update(tree(true,true)));assert.equal(doc.activeElement,childControl);
  act(()=>renderer!.update(tree(false,true)));assert.equal(doc.activeElement,childControl);assert.equal(doc.body.style.overflow,'hidden');
  finish();assert.equal(doc.activeElement,external);
 });
 check('explicit busy blocks Escape, backdrop, header and contextual cancel; unlock uses current close callback',()=>{
  let oldClosed=0,closed=0;let dismiss:(()=>void)|undefined,initial:(()=>void)|undefined;
  function Consumer(){dismiss=useDialogClose();return null;}
  function tree(busy:boolean,close:()=>void){return <Dialog title="Save" close={close} busy={busy}><Consumer/></Dialog>;}
  const panel=new FakeElement('section',[new FakeElement('button')]);mount(tree(true,()=>oldClosed++),el=>el.type==='section'?panel:new FakeElement());initial=dismiss;
  function attempt(){key('Escape');act(()=>{renderer!.root.findByProps({'aria-label':'Cerrar'}).props.onClick();const backdrop=renderer!.root.findByProps({className:'ops-overlay'}),target={};backdrop.props.onMouseDown({target,currentTarget:target,button:0});dismiss?.();});}
  assert.equal(renderer!.root.findByProps({role:'dialog'}).props['aria-busy'],true);assert.equal(renderer!.root.findByProps({'aria-label':'Cerrar'}).props.disabled,true);
  attempt();assert.equal(oldClosed,0);
  act(()=>renderer!.update(tree(false,()=>closed++)));assert.equal(dismiss,initial);attempt();assert.equal(closed,4);assert.equal(oldClosed,0);
  const backdrop=renderer!.root.findByProps({className:'ops-overlay'});act(()=>{backdrop.props.onMouseDown({target:{},currentTarget:{},button:0});const target={};backdrop.props.onMouseDown({target,currentTarget:target,button:2});});assert.equal(closed,4);
 });
 check('pending registrations combine, release on unmount, and are absent outside Dialog',()=>{
  let closed=0,dismiss:(()=>void)|undefined,outside:(()=>void)|undefined;
  function Pending({pending}:{pending:boolean}){useDialogPending(pending);dismiss=useDialogClose();return null;}
  function Outside(){useDialogPending(true);outside=useDialogClose();return null;}
  function tree(a:boolean,b:boolean,includeA=true){return <><Outside/><Dialog title="Two forms" close={()=>closed++}>{includeA&&<Pending key="a" pending={a}/>}<Pending key="b" pending={b}/></Dialog></>;}
  mount(tree(true,true));assert.equal(outside,undefined);key('Escape');assert.equal(closed,0);
  act(()=>renderer!.update(tree(false,true)));act(()=>dismiss?.());assert.equal(closed,0,'one idle registration must not clear another pending form');
  act(()=>renderer!.update(tree(true,false)));key('Escape');assert.equal(closed,0);
  act(()=>renderer!.update(tree(true,false,false)));act(()=>dismiss?.());assert.equal(closed,1,'unmounted pending form releases lock');
 });
 check('pending releases before the post-save effect requests close; no registration churn or double close',()=>{
  let closed=0,initial:(()=>void)|undefined;
  function Editor({pending}:{pending:boolean}){useDialogPending(pending);const close=useDialogClose();if(!initial)initial=close;assert.equal(close,initial);useEffect(()=>{if(!pending)close?.();},[pending,close]);return null;}
  function tree(pending:boolean){return <Dialog title="Editor" close={()=>closed++}><Editor pending={pending}/></Dialog>;}
  mount(tree(true));key('Escape');assert.equal(closed,0);
  act(()=>renderer!.update(tree(false)));assert.equal(closed,1);
  act(()=>renderer!.update(tree(false)));assert.equal(closed,1);
 });
 check('nested Dialog contexts isolate pending state while preserving the parent save lock',()=>{
  let parentClosed=0,childClosed=0;
  function Pending({pending}:{pending:boolean}){useDialogPending(pending);return null;}
  function tree(child:boolean){return <Dialog title="Saving parent" close={()=>parentClosed++}><Pending pending/>{child&&<Dialog title="Idle child" close={()=>childClosed++}><Pending pending={false}/></Dialog>}</Dialog>;}
  mount(tree(true));key('Escape');assert.equal(childClosed,1);assert.equal(parentClosed,0);
  act(()=>renderer!.update(tree(false)));key('Escape');assert.equal(parentClosed,0);
 });
 check('real SelectCustom consumes Escape before the dialog; a second Escape dismisses',()=>{
  let closed=0;const option=new FakeElement('button');option.role='option';option.selected=true;
  const trigger=new FakeElement('button'),menu=new FakeElement('div',[option]),root=new FakeElement('div',[trigger]),panel=new FakeElement('section',[root,menu]);panel.role='dialog';
  mount(<Dialog title="Select" close={()=>closed++}><SelectCustom label="State" value="a" choices={[{value:'a',label:'A'},{value:'b',label:'B'}]} onChange={()=>{}}/></Dialog>,el=>el.type==='section'?panel:el.props.className==='ops-select'?root:el.props.className==='ops-select-trigger'?trigger:el.props.className==='ops-select-options ops-select-floating'?menu:new FakeElement());
  act(()=>renderer!.root.findByProps({className:'ops-select-trigger'}).props.onClick());assert.equal(renderer!.root.findByProps({className:'ops-select-trigger'}).props['aria-expanded'],true);
  assert(portals.some(portal=>portal.target===panel),'select popup portals into its dialog, inside the focus boundary');
  const e=event('Escape',option);act(()=>{renderer!.root.findByProps({className:'ops-select'}).props.onKeyDown(e);if(!e.stopped)emit('keydown',e);});
  assert.equal(e.defaultPrevented,true);assert.equal(closed,0);assert.equal(renderer!.root.findByProps({className:'ops-select-trigger'}).props['aria-expanded'],false);
  assert.equal(doc.activeElement,trigger);key('Escape',{defaultPrevented:true});assert.equal(closed,0);key('Escape');assert.equal(closed,1);
 });
 check('footer association preserves validation/button state, explicit targets and dialog structure',()=>{
  const form=new FakeElement('form'),anchor=new FakeElement('span'),footer=new FakeElement('div');form.append(anchor);
  mount(<Dialog title="A heading" close={()=>{}} size="compact"><form><FormActions><button type="submit" disabled>Save</button><button type="button" form="other-form">Other action</button></FormActions></form></Dialog>,el=>el.type==='span'?anchor:el.props.className==='dialog-footer'?footer:new FakeElement());
  const dialog=renderer!.root.findByProps({role:'dialog'}),heading=renderer!.root.findByType('h2');assert.equal(dialog.props['aria-labelledby'],heading.props.id);assert.equal(dialog.props['data-dialog-size'],'compact');
  const buttons=renderer!.root.findAllByType('button'),save=buttons.find(button=>button.props.type==='submit')!;
  assert(form.id);assert.equal(save.props.form,form.id);assert.equal(save.props.disabled,true);assert.equal(save.props.type,'submit');assert.equal(buttons.find(button=>button.props.form==='other-form')!.props.type,'button');
  assert(portals.some(portal=>portal.target===footer),'actions use footer portal');
  assert.equal(renderer!.root.findAllByProps({className:'dialog-body'}).length,1);assert.equal(renderer!.root.findAllByProps({className:'dialog-footer'}).length,1);
 });
after(()=>{
 if(renderer)finish();reactDOM.createPortal=originalPortal;
 if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
 if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
});
