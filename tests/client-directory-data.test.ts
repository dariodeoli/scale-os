import assert from 'node:assert/strict';
import {test} from 'node:test';
const {directorySummaryText,filterClientDirectory,normalizeSearch}=require('../app/client-directory-data') as typeof import('../app/client-directory-data');
type DirectoryClientRecord=import('../app/client-directory-data').DirectoryClientRecord;

const clients=[
 {id:'1',name:'Estudio Ñandú',email:'FACTURACION@estudio.com.py',phone:'+595 981 111 111',active:true,lifecycle_status:'active'},
 {id:'2',name:'Cooperativa del Sur',email:'compras@coop.com.py',phone:null,active:true,lifecycle_status:'paused'},
 {id:'3',name:'Fundación Niñez',email:null,phone:'+595 971 222 222',active:false,lifecycle_status:'inactive'},
];
// El tipo local lista los campos reales del endpoint (spec #43 §1.2).
const record:DirectoryClientRecord={id:'9',name:'Cliente nuevo',legal_name:'Cliente Nuevo S.A.',email:null,phone:null,tax_id:'80012345-6',active:true,notes:null,created_at:'2026-01-02T12:00:00Z',updated_at:'2026-09-20T12:00:00Z',lifecycle_status:'active',logo_url:null,color_key:'violet',social_links:{website:'https://cliente.com'},customer_kind:'company',service_plan_id:'3',relationship_started_on:'2026-01-02',has_recurring_price:true,ruc_legal_name:'Cliente Nuevo S.A.',ruc_tax_state:'activo',ruc_source:'ruc-provider',ruc_refreshed_at:'2026-09-01T12:00:00Z'};

test('search normalization ignores accents, case and padding',()=>{
 assert.equal(normalizeSearch('  Ñandú  '),'nandu');
 assert.equal(normalizeSearch('FACTURACIÓN'),'facturacion');
 // Issue #65: un valor ausente del API no puede tirar `normalize`.
 assert.equal(normalizeSearch(undefined as unknown as string),'','undefined se pliega a texto vacío');
 assert.equal(normalizeSearch(null as unknown as string),'','null se pliega a texto vacío');
 assert.equal(normalizeSearch(42 as unknown as string),'42','un número se normaliza como texto');
});

test('client filtering searches name, email and phone and respects lifecycle',()=>{
 assert.deepEqual(filterClientDirectory(clients,'ñandu','').map(client=>client.id),['1']);
 assert.deepEqual(filterClientDirectory(clients,'facturacion@','').map(client=>client.id),['1'],'email search ignores case');
 assert.deepEqual(filterClientDirectory(clients,'971 222','').map(client=>client.id),['3'],'phone search ignores formatting');
 assert.deepEqual(filterClientDirectory(clients,'','paused').map(client=>client.id),['2']);
 assert.deepEqual(filterClientDirectory(clients,'coop','paused').map(client=>client.id),['2']);
 assert.deepEqual(filterClientDirectory(clients,'coop','active').map(client=>client.id),[],'query and lifecycle combine');
 assert.deepEqual(filterClientDirectory(clients,'','').map(client=>client.id),['1','2','3']);
 assert.deepEqual(filterClientDirectory([record],'80012345','').map(client=>client.id),[],'other fields do not join the search');
});

test('directory summary keeps singular and plural right',()=>{
 assert.equal(directorySummaryText(1,1),'Mostrando 1 cliente de 1 cliente');
 assert.equal(directorySummaryText(0,3),'Mostrando 0 clientes de 3 clientes');
 assert.equal(directorySummaryText(4,10),'Mostrando 4 clientes de 10 clientes');
});
