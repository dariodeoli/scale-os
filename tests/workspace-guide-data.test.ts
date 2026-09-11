import assert from 'node:assert/strict';
import {test} from 'node:test';
import {suggestedWorkspaceGuideStep,workspaceGuideScope,workspaceGuideSteps,type WorkspaceGuideIdentity,type WorkspaceGuideData} from '../app/workspace-guide-data';

const identity:WorkspaceGuideIdentity={userId:'1',organizationId:'10',role:'owner',demo:false};
const scope=workspaceGuideScope(identity);
const evidence=(status:WorkspaceGuideData['status'],counts?:WorkspaceGuideData['counts']):WorkspaceGuideData=>({scope,status,counts});
const records=(data?:WorkspaceGuideData,who=identity)=>workspaceGuideSteps(who,data).filter(step=>step.record);

test('unknown, loading, error and absent counts are never interpreted as zero',()=>{
 for(const [data,state] of [[undefined,'unknown'],[evidence('unknown',{clients:0,projects:0,orders:0}),'unknown'],[evidence('loading',{clients:0}),'loading'],[evidence('error',{clients:0,orders:5}),'error'],[evidence('ready'),'unknown']] as const){
  assert(records(data).every(step=>step.state===state));
 }
 for(const count of [NaN,Infinity,-1,0.5])assert(records(evidence('ready',{clients:count})).every(step=>step.state==='unknown'));
 const result=records(evidence('ready',{clients:0,projects:2}));
 assert.deepEqual(result.map(step=>step.state),['empty','present','unknown']);
});

test('data from another user, company, role or demo cannot become current evidence',()=>{
 const old=evidence('ready',{clients:0,projects:0,orders:0});
 for(const change of [{userId:'2'},{organizationId:'20'},{role:'viewer'},{demo:true}]){
  assert(records(old,{...identity,...change}).every(step=>step.state==='unknown'));
 }
 assert(records({...old,scope:null}).every(step=>step.state==='unknown'));
 assert(records(old,{role:'owner'}).every(step=>step.state==='unknown'));
 assert.notEqual(workspaceGuideScope({...identity,userId:'a:b',organizationId:'c'}),workspaceGuideScope({...identity,userId:'a',organizationId:'b:c'}));
});

test('configuration, invitations and proposals have no fabricated completion state',()=>{
 for(const data of [undefined,evidence('ready',{clients:20,projects:20,orders:80}),evidence('error')]){
  const actions=workspaceGuideSteps(identity,data).filter(step=>!step.record);
  assert.deepEqual(actions.map(step=>step.module),['Configuración','Invitaciones','Presupuestos']);
  assert(actions.every(step=>step.state==='available'&&step.statusLabel==='Disponible'));
 }
});

test('demo evidence is always example data and discarded on leaving demo',()=>{
 const demo={...identity,demo:true};
 const data={scope:workspaceGuideScope(demo),status:'ready' as const,counts:{clients:20,projects:0,orders:80}};
 assert.deepEqual(records(data,demo).map(step=>step.statusLabel),['Datos de ejemplo disponibles','Sin registros de ejemplo','Datos de ejemplo disponibles']);
 assert(records(data).every(step=>step.state==='unknown'));
});

test('suggestions use known missing records, keep prerequisite order, and never infer progress from errors',()=>{
 const suggest=(data:WorkspaceGuideData)=>suggestedWorkspaceGuideStep(workspaceGuideSteps(identity,data))?.module;
 assert.equal(suggest(evidence('ready',{clients:0,projects:0,orders:0})),'Clientes');
 assert.equal(suggest(evidence('ready',{clients:1,projects:0,orders:0})),'Proyectos');
 assert.equal(suggest(evidence('ready',{clients:1,projects:1,orders:0})),'Producción');
 assert.equal(suggest(evidence('error',{clients:0,projects:0,orders:0})),'Configuración');
 assert.equal(suggest(evidence('ready',{clients:1,projects:1,orders:1})),'Configuración');
 const viewer=workspaceGuideSteps({...identity,role:'viewer'});
 assert(viewer.every(step=>!step.canCreate));
});
