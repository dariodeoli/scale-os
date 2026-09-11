import React from 'react';
import assert from 'node:assert/strict';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';

Object.assign(globalThis,{React});
const writes:{path:string;values:Record<string,string>}[]=[];
let fail=false,finish:(()=>void)|undefined;
const replaced:string[]=[];
const location={search:'?resetToken=synthetic-test-token&next=login',pathname:'/'};
Object.assign(globalThis,{window:{location,history:{replaceState(_data:unknown,_title:string,url:string){replaced.push(url);}}}});
function EditorStub(){return null;}
function DialogStub({children}:{children:React.ReactNode}){return <section role="dialog">{children}</section>;}
const id=require.resolve('../app/operations');
require.cache[id]={id,filename:id,loaded:true,exports:{Editor:EditorStub,Dialog:DialogStub,api:async(path:string,values:Record<string,string>)=>{
 writes.push({path,values});
 if(fail)throw Error('No se pudo guardar');
 if(path.endsWith('/reset'))await new Promise<void>(resolve=>{finish=resolve;});
 return {message:'Si el correo tiene acceso, recibirá un enlace.'};
}}} as NodeModule;
const {PasswordPanel}=require('../app/password-panel') as typeof import('../app/password-panel');

async function main(){
 let renderer:ReactTestRenderer;
 await act(async()=>{renderer=create(<PasswordPanel/>);});
 const editor=()=>renderer!.root.findByType(EditorStub);
 const dialogs=()=>renderer!.root.findAllByType(DialogStub);
 const open=()=>act(()=>renderer!.root.findByType('button').props.onClick());
 assert.deepEqual(replaced,['/?next=login']);
 assert.equal(dialogs()[0].props.title,'Nueva contraseña');
 await assert.rejects(()=>editor().props.save({password:'synthetic-password',confirm:'different'}),/no coinciden/);
 assert.equal(writes.length,0);assert.equal(dialogs().length,1);
 fail=true;
 await assert.rejects(()=>editor().props.save({password:'synthetic-password',confirm:'synthetic-password'}),/No se pudo guardar/);
 assert.equal(dialogs().length,1,'a failed reset must retain its editor');
 fail=false;let save:Promise<void>;
 await act(async()=>{save=editor().props.save({password:'synthetic-password',confirm:'synthetic-password'});await Promise.resolve();});
 assert.equal(dialogs().length,1,'do not close before the server confirms success');
 await act(async()=>{finish!();await save;});
 assert.equal(dialogs().length,0,'successful main password save closes the editor');
 assert.match(JSON.stringify(renderer!.toJSON()),/Contraseña actualizada/,'confirmation remains visible outside the closed dialog');
 open();
 assert.equal(dialogs()[0].props.title,'Recuperar acceso');
 assert.equal(editor().props.label,'Enviar enlace','reopening clears old success state');
 await act(async()=>editor().props.save({email:'fixture@example.invalid'}));
 assert.equal(dialogs().length,1,'requesting a link retains the informative confirmation');
 assert.match(JSON.stringify(renderer!.toJSON()),/Si el correo tiene acceso/);
 act(()=>dialogs()[0].props.close());open();
 assert.equal(editor().props.label,'Enviar enlace','a new request is possible after closing the confirmation');
 assert.equal(writes.at(-1)!.path,'/api/auth/password/request');
 await act(async()=>renderer!.unmount());
 console.log('PASS: password reset closes only on confirmed success, failures retain editor, link confirmation stays open, reopening resets notices');
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
