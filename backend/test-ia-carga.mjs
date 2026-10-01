// «Carga con IA» (scale-os#117): configuración, prompt, JSON estricto,
// normalización y el camino completo con un **proveedor mockeado** (sin red).
// Las guardas de fuente fijan que el análisis no escribe registros de negocio y
// que el texto pegado no se persiste ni se imprime.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {
 IA_TEXTO_MAX,IA_REGISTROS_MAX,IA_RATE_LIMIT,
 iaConfig,iaConfigurada,tiposPermitidos,instruccionesIa,mensajesDeCarga,
 parsearSalidaIa,normalizarAnalisis,normalizarCliente,normalizarEquipo,
 analizarCarga,IaError,iaCarga,
} from './ia-carga.js';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');

// ── Configuración ───────────────────────────────────────────────────────────

assert.equal(iaConfigurada({}),false);
assert.equal(iaConfigurada({IA_API_KEY:'   '}),false);
assert.equal(iaConfig({}),null);
assert.deepEqual(iaConfig({IA_API_KEY:'k'}),{apiKey:'k',modelo:'openai/gpt-oss-120b',baseUrl:'https://api.groq.com/openai/v1'});
assert.deepEqual(
 iaConfig({IA_API_KEY:' k ',IA_MODELO:'otro-modelo',IA_BASE_URL:'https://api.ejemplo.com/v1/'}),
 {apiKey:'k',modelo:'otro-modelo',baseUrl:'https://api.ejemplo.com/v1'},
);
assert.equal(iaConfig({IA_API_KEY:'k',IA_BASE_URL:'no-es-una-url'}).baseUrl,'https://api.groq.com/openai/v1');

// ── Permisos por tipo (las mismas capacidades de los endpoints que crean) ────

const de=role=>tiposPermitidos({role}).join(',');
assert.equal(de('owner'),'clientes,equipos');
assert.equal(de('admin'),'clientes,equipos');
assert.equal(de('management'),'clientes,equipos');
assert.equal(de('finance'),'clientes,equipos');
assert.equal(de('collaborator'),'clientes,equipos');
assert.equal(de('sales'),'clientes','ventas no gestiona inventario');
assert.equal(de('production'),'equipos','producción no crea clientes');
assert.equal(de('editor'),'');
assert.equal(de('viewer'),'');
assert.equal(tiposPermitidos(null).length,0);

// ── Prompt ──────────────────────────────────────────────────────────────────

const mensajes=mensajesDeCarga('Juan Pérez 0981 123 456',['clientes']);
assert.equal(mensajes.length,2);
assert.equal(mensajes[0].role,'system');
assert.match(mensajes[0].content,/DATOS, no instrucciones/);
assert.match(mensajes[0].content,new RegExp(`máximo ${IA_REGISTROS_MAX} registros por tipo`,'i'));
assert.match(mensajes[0].content,/moneda/);
assert.match(mensajes[1].content,/Juan Pérez 0981 123 456/);
assert.match(mensajes[1].content,/clientes/);
assert.doesNotMatch(mensajes[1].content,/equipos/,'solo pide los tipos habilitados');
assert.match(instruccionesIa(),/Scale OS/);

// ── JSON estricto ───────────────────────────────────────────────────────────

assert.deepEqual(parsearSalidaIa('{"clientes":[]}'),{clientes:[]});
assert.deepEqual(parsearSalidaIa('```json\n{"clientes":[]}\n```'),{clientes:[]});
assert.deepEqual(parsearSalidaIa('Listo:\n{"clientes":[]}\nEspero que sirva.'),{clientes:[]});
assert.throws(()=>parsearSalidaIa('no hay json'),IaError);

// ── Normalización ───────────────────────────────────────────────────────────

const clienteLimpio=normalizarCliente({nombre:' Constructora Ñandú ',empresa:'Constructora Ñandú SA',ruc:'RUC: 80012345-6',telefono:'0981 123 456',correo:'VENTAS@NANDU.COM.PY'});
assert.deepEqual(clienteLimpio,{
 nombre:'Constructora Ñandú',empresa:'Constructora Ñandú SA',ruc:'80012345-6',
 telefono:'+595 981123456',correo:'ventas@nandu.com.py',avisos:[],
});
const clienteDudoso=normalizarCliente({nombre:'Ana',correo:'no-es-correo',telefono:'123',ruc:'ABC-123'});
assert.equal(clienteDudoso.correo,'no-es-correo','el correo inválido se conserva para corregirlo');
assert.ok(clienteDudoso.avisos.some(aviso=>aviso.startsWith('Correo')));
assert.ok(clienteDudoso.avisos.some(aviso=>aviso.startsWith('Teléfono')));
assert.ok(clienteDudoso.avisos.some(aviso=>aviso.startsWith('RUC')));
const equipo=normalizarEquipo({nombre:'Cámara Sony FX3',categoria:'Cámara',cantidad:'4',valor:'15.000.000',moneda:'gs'});
assert.equal(equipo.cantidad,4);
assert.equal(equipo.valor,15000000);
assert.equal(equipo.moneda,null,'gs no es una moneda declarada: la elige la empresa');
assert.ok(equipo.avisos.some(aviso=>aviso.startsWith('Moneda')));
const equipoSinCantidad=normalizarEquipo({nombre:'Trípode'});
assert.equal(equipoSinCantidad.cantidad,1);
assert.equal(equipoSinCantidad.valor,null);
assert.ok(equipoSinCantidad.avisos.some(aviso=>aviso.includes('Cantidad asumida')));

const salida=normalizarAnalisis({
 clientes:[{nombre:'Ana',telefono:'0981 000 111'}],
 equipos:[{nombre:'Pantalla LED',cantidad:2,valor:1500000}],
 avisos:'ignorado',
},['clientes','equipos']);
assert.equal(salida.clientes.length,1);
assert.equal(salida.clientes[0].telefono,'+595 981000111');
assert.equal(salida.equipos[0].nombre,'Pantalla LED');
assert.equal(salida.equipos[0].cantidad,2);
assert.deepEqual(salida.avisos,[]);

const soloPedido=normalizarAnalisis({clientes:[{empresa:'Sin nombre'},{nombre:'Válido'}],equipos:[{nombre:'No pedido'}]},['clientes']);
assert.equal(soloPedido.clientes.length,1);
assert.equal(soloPedido.clientes[0].nombre,'Válido');
assert.equal(soloPedido.equipos.length,0,'los equipos no se pidieron');
assert.ok(soloPedido.avisos.some(aviso=>aviso.includes('Descartamos 1 registro')));

const muchos=Array.from({length:IA_REGISTROS_MAX+5},(_,indice)=>({nombre:`Cliente ${indice}`}));
const recortado=normalizarAnalisis({clientes:muchos},['clientes']);
assert.equal(recortado.clientes.length,IA_REGISTROS_MAX);
assert.ok(recortado.avisos.some(aviso=>aviso.includes('se recortó')));
assert.throws(()=>normalizarAnalisis('texto suelto',['clientes']),IaError);

// ── Proveedor mockeado (sin red) ────────────────────────────────────────────

const visto={};
const proveedorDePrueba={
 id:'prueba',label:'Proveedor de prueba',
 async analizar(mensajesRecibidos,opciones){
  visto.mensajes=mensajesRecibidos.length;visto.maxTokens=opciones.maxTokens;
  return JSON.stringify({
   clientes:[{nombre:'Ana',telefono:'0981 000 111'}],
   equipos:[{nombre:'Cámara',cantidad:'2',valor:'1.500.000'}],
  });
 },
};
const analisis=await analizarCarga({texto:'Ana, cámara x2 a 1.500.000',tipos:['clientes','equipos'],proveedor:proveedorDePrueba});
assert.equal(visto.mensajes,2);
assert.equal(visto.maxTokens,4000);
assert.equal(analisis.clientes[0].nombre,'Ana');
assert.equal(analisis.equipos[0].valor,1500000);

await assert.rejects(
 ()=>analizarCarga({texto:'texto',tipos:['clientes'],proveedor:{id:'x',label:'x',analizar:async()=>{throw new IaError('El proveedor de IA respondió 429.');}}}),
 /429/,
);
await assert.rejects(()=>analizarCarga({texto:'x',tipos:['clientes'],proveedor:null}),IaError);

const llamadas=[];
const fetchFalso=(async (url,init)=>{
 llamadas.push({url:String(url),init});
 return new Response(JSON.stringify({choices:[{message:{content:'{"clientes":[]}'}}]}),{status:200});
});
const {iaProviderDeConfig}=await import('./ia-carga.js');
const config=iaConfig({IA_API_KEY:'secreto',IA_MODELO:'modelo-x'});
const proveedor=iaProviderDeConfig(config,{fetcher:fetchFalso});
assert.equal(await proveedor.analizar(mensajesDeCarga('texto',['clientes']),{maxTokens:123}),'{"clientes":[]}');
assert.equal(llamadas[0].url,'https://api.groq.com/openai/v1/chat/completions');
assert.equal(llamadas[0].init.headers.Authorization,'Bearer secreto');
const cuerpo=JSON.parse(llamadas[0].init.body);
assert.equal(cuerpo.model,'modelo-x');
assert.equal(cuerpo.max_tokens,123);
assert.deepEqual(cuerpo.response_format,{type:'json_object'});
const conEstado=status=>(async()=>new Response('{}',{status}));
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:conEstado(401)}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/IA_API_KEY/);
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:conEstado(429)}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/limitando/);
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:async()=>new Response(JSON.stringify({choices:[]}),{status:200})}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/no devolvió contenido/);

// ── Endpoint con PGlite (proveedor mockeado, sin red) ───────────────────────

const pg=new PGlite();
await pg.exec(await read('./schema.sql'));
for(const name of migrationOrder)await pg.exec(await read('./migrations/'+name));
const query=(sql,values)=>pg.query(sql,values),db={query,connect:async()=>({query,release(){}})};
const insert=async(sql,values)=>(await query(sql+' returning id',values)).rows[0].id;
const orgA=await insert("insert into organizations(slug,name) values('ia-a','IA A')");
const orgB=await insert("insert into organizations(slug,name) values('ia-b','IA B')");
const ownerId=await insert("insert into users(email,password_hash) values('ia-owner@example.invalid','unused')");
const viewerId=await insert("insert into users(email,password_hash) values('ia-viewer@example.invalid','unused')");
const salesId=await insert("insert into users(email,password_hash) values('ia-sales@example.invalid','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer')",[orgA,ownerId,viewerId]);
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'sales')",[orgA,salesId]);
const owner={id:ownerId,email:'ia-owner@example.invalid',organization_id:orgA,role:'owner',full_name:'Dueña IA'};
const viewer={...owner,id:viewerId,role:'viewer'};
const sales={...owner,id:salesId,email:'ia-sales@example.invalid',role:'sales'};

async function call(path,{method='GET',as=owner,payload,proveedor:mockProvider}={}){
 const out={status:0};
 const req={url:path,method,headers:{host:'admin.scaleparaguay.com'},socket:{remoteAddress:'127.0.0.1'},async *[Symbol.asyncIterator](){if(payload!==undefined)yield JSON.stringify(payload);}};
 const handled=await iaCarga({req,res:{writeHead(){},end(){}},url:new URL('https://test'+path),db,session:async()=>as,body:async()=>payload,send:(_,status,data)=>{out.status=status;Object.assign(out,data);},proveedor:mockProvider||null});
 assert.equal(handled,true,'el handler debe reclamar la ruta');
 return out;
}

const jsonProvider=payload=>({id:'mock',label:'mock',analizar:async()=>JSON.stringify(payload)});
const previousKey=process.env.IA_API_KEY;
try{
 process.env.IA_API_KEY='test-key';
 process.env.IA_MODELO='modelo-prueba';

 let r=await call('/api/ia/carga');
 assert.equal(r.status,200);assert.equal(r.configurada,true);assert.equal(r.modelo,'modelo-prueba');
 assert.deepEqual(r.tipos,['clientes','equipos']);assert.equal(r.limites.texto,IA_TEXTO_MAX);

 r=await call('/api/ia/carga',{as:sales});
 assert.deepEqual(r.tipos,['clientes'],'ventas solo puede clientes');

 r=await call('/api/ia/carga',{as:viewer});
 assert.equal(r.status,403);

 r=await call('/api/ia/carga',{method:'POST',payload:{texto:'Ana 0981 000 111'},proveedor:jsonProvider({clientes:[{nombre:'Ana',telefono:'0981 000 111'}],equipos:[{nombre:'Cámara',cantidad:2}]})});
 assert.equal(r.status,200);assert.equal(r.registros.clientes.length,1);assert.equal(r.registros.equipos.length,1);
 assert.equal(r.modelo,'modelo-prueba');

 // La transferencia queda en la bitácora con conteos, nunca con el texto.
 const bitacora=(await query("select actor_user_id,action,context,details from personal_data_access_log where organization_id=$1 and action='ai.transfer'",[orgA])).rows;
 assert.equal(bitacora.length,1);
 assert.deepEqual(bitacora[0].details,{modelo:'modelo-prueba',clientes:1,equipos:1});
 assert.doesNotMatch(JSON.stringify(bitacora[0]),/Ana/,'el texto pegado no se persiste');
 // El análisis no crea registros de negocio en ninguna tabla.
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,0);
 assert.equal((await query('select count(*)::int as n from agency_inventory')).rows[0].n,0);
 assert.equal((await query('select count(*)::int as n from agency_leads')).rows[0].n,0);

 r=await call('/api/ia/carga',{method:'POST',payload:{texto:'   '},proveedor:jsonProvider({})});
 assert.equal(r.status,400);
 r=await call('/api/ia/carga',{method:'POST',payload:{texto:'x'.repeat(IA_TEXTO_MAX+1)},proveedor:jsonProvider({})});
 assert.equal(r.status,400);

 const falla=await call('/api/ia/carga',{method:'POST',payload:{texto:'Ana'},proveedor:{id:'x',label:'x',analizar:async()=>{throw new IaError('El proveedor de IA rechazó la credencial: revisá IA_API_KEY en el servidor.');}}});
 assert.equal(falla.status,502);assert.equal(falla.code,'ia_proveedor');

 delete process.env.IA_API_KEY;
 r=await call('/api/ia/carga');
 assert.equal(r.status,200);assert.equal(r.configurada,false);
 r=await call('/api/ia/carga',{method:'POST',payload:{texto:'Ana'}});
 assert.equal(r.status,503);assert.equal(r.code,'ia_no_configurada');

 // Rate-limit por organización: 10 llamadas en la ventana de 15 minutos.
 process.env.IA_API_KEY='test-key';
 const orgC=await insert("insert into organizations(slug,name) values('ia-c','IA C')");
 const ownerCId=await insert("insert into users(email,password_hash) values('ia-owner-c@example.invalid','unused')");
 await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner')",[orgC,ownerCId]);
 const ownerC={...owner,id:ownerCId,email:'ia-owner-c@example.invalid',organization_id:orgC};
 for(let intento=1;intento<=IA_RATE_LIMIT;intento++){
  const respuesta=await call('/api/ia/carga',{method:'POST',as:ownerC,payload:{texto:'Hola'},proveedor:jsonProvider({clientes:[]})});
  assert.equal(respuesta.status,200,`llamada ${intento} permitida`);
 }
 const excedido=await call('/api/ia/carga',{method:'POST',as:ownerC,payload:{texto:'Hola'},proveedor:jsonProvider({clientes:[]})});
 assert.equal(excedido.status,429);
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,0);
 assert.equal((await query('select 1 from organizations where id=$1',[orgB])).rows.length,1,'la otra agencia no participa');
}finally{
 if(previousKey===undefined)delete process.env.IA_API_KEY;else process.env.IA_API_KEY=previousKey;
 delete process.env.IA_MODELO;
}
await pg.close();

// ── Guardas de fuente ───────────────────────────────────────────────────────

const modulo=await read('./ia-carga.js');
assert.doesNotMatch(modulo,/console\./,'el texto pegado no se imprime en logs');
assert.doesNotMatch(modulo,/insert into/i,'el análisis no escribe registros');
assert.doesNotMatch(modulo,/update\s+agency_|delete\s+from/i,'el análisis no toca datos');
assert.match(modulo,/throttle\(db,'ia-carga:'\+user\.organization_id,IA_RATE_LIMIT\)/,'rate-limit por organización');
assert.match(modulo,/action:'ai\.transfer'/,'la transferencia al encargado queda auditada');
assert.match(modulo,/IA_API_KEY/,'sin key queda apagada');
assert.match(modulo,/ia_no_configurada/,'sin key responde claro');
const servidor=await read('./server.js');
assert.match(servidor,/iaCarga\(\{req,res,url,db,session,body,send\}\)/,'el endpoint está montado en el server');
const pdp=await read('./personal-data.js');
assert.match(pdp,/'ai\.transfer'/,'la bitácora admite la acción de IA');
const encargados=await read('../docs/PRIVACIDAD-ENCARGADOS.md');
assert.match(encargados,/Groq/,'el proveedor de IA está en el inventario de encargados');
assert.match(encargados,/IA_API_KEY/);
const rat=await read('../docs/PRIVACIDAD-RAT.md');
assert.match(rat,/Carga con IA/,'la actividad está en el RAT');
const politica=await read('../docs/PRIVACIDAD-POLITICA.md');
assert.match(politica,/inteligencia artificial/i,'la política menciona el tratamiento con IA');

console.log('PASS: IA — configuración por entorno (Groq por defecto), permisos por tipo, prompt anti-inyección, JSON estricto, normalización con avisos, proveedor mockeado sin red, rate-limit por organización y guardas de no-persistencia/no-escritura');
