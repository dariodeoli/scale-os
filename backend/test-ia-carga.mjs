// «Carga con IA» (scale-os#117 y #119): configuración, prompt, JSON estricto,
// normalización, **coincidencias locales**, **acciones propuestas** y el camino
// completo con un **proveedor mockeado** (sin red). Las guardas de fuente fijan
// que el análisis no escribe registros de negocio, no ejecuta acciones y no
// persiste ni imprime el texto pegado.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {migrationOrder} from './scripts/migration-order.mjs';
import {zoneToday} from './business-time.js';
import {
 IA_TEXTO_MAX,IA_REGISTROS_MAX,IA_RATE_LIMIT,IA_COINCIDENCIAS_MAX,IA_TIMEOUT_MS,
 iaConfig,iaConfigurada,tiposPermitidos,instruccionesIa,mensajesDeCarga,
 parsearSalidaIa,normalizarAnalisis,normalizarCliente,normalizarEquipo,
 analizarCarga,IaError,iaCarga,iaTokensPresupuesto,
 normalizarBusqueda,documentoDigitos,documentosCompatibles,telefonosCompatibles,
 senalesDeCliente,estadoDeCoincidencias,coincidenciasClientes,coincidenciasEquipos,
 enriquecerCoincidencias,normalizarAcciones,resolverClienteDeAccion,fechaDeTextoIa,
 IA_ACCIONES,
} from './ia-carga.js';

const read=file=>fs.readFile(new URL(file,import.meta.url),'utf8');

// ── Configuración ───────────────────────────────────────────────────────────

assert.equal(iaConfigurada({}),false);
assert.equal(iaConfigurada({IA_API_KEY:'   '}),false);
assert.equal(iaConfig({}),null);
assert.deepEqual(iaConfig({IA_API_KEY:'k'}),{apiKey:'k',modelo:'openai/gpt-oss-120b',baseUrl:'https://api.groq.com/openai/v1',reasoningEffort:'low'});
assert.deepEqual(
 iaConfig({IA_API_KEY:' k ',IA_MODELO:'otro-modelo',IA_BASE_URL:'https://api.ejemplo.com/v1/'}),
 {apiKey:'k',modelo:'otro-modelo',baseUrl:'https://api.ejemplo.com/v1',reasoningEffort:'low'},
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
assert.match(mensajes[0].content,/registrar_cobro/,'el prompt pide acciones');
assert.match(mensajes[0].content,/No se piden equipos/,'sin equipos el prompt lo aclara');
assert.match(mensajes[1].content,/Juan Pérez 0981 123 456/);
assert.match(mensajes[1].content,/clientes/);
assert.doesNotMatch(mensajes[1].content,/equipos/,'solo pide los tipos habilitados');
assert.match(mensajesDeCarga('texto',['equipos'])[0].content,/No se piden clientes/,'sin clientes no se piden acciones');
assert.match(instruccionesIa(),/Scale OS/);

// ── JSON estricto ───────────────────────────────────────────────────────────

assert.deepEqual(parsearSalidaIa('{"clientes":[]}'),{clientes:[]});
assert.deepEqual(parsearSalidaIa('```json\n{"clientes":[]}\n```'),{clientes:[]});
assert.deepEqual(parsearSalidaIa('Listo:\n{"clientes":[]}\nEspero que sirva.'),{clientes:[]});
assert.throws(()=>parsearSalidaIa('no hay json'),IaError);

// ── Normalización (Fase 1) ──────────────────────────────────────────────────

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
assert.equal(salida.clientes[0].telefono,'+595 981000111');
assert.deepEqual(salida.avisos,[]);

const soloPedido=normalizarAnalisis({clientes:[{empresa:'Sin nombre'},{nombre:'Válido'}],equipos:[{nombre:'No pedido'}]},['clientes']);
assert.equal(soloPedido.clientes.length,1);
assert.equal(soloPedido.equipos.length,0,'los equipos no se pidieron');
assert.ok(soloPedido.avisos.some(aviso=>aviso.includes('Descartamos 1 registro')));

const muchos=Array.from({length:IA_REGISTROS_MAX+5},(_,indice)=>({nombre:`Cliente ${indice}`}));
const recortado=normalizarAnalisis({clientes:muchos},['clientes']);
assert.equal(recortado.clientes.length,IA_REGISTROS_MAX);
assert.ok(recortado.avisos.some(aviso=>aviso.includes('se recortó')));
assert.throws(()=>normalizarAnalisis('texto suelto',['clientes']),IaError);

// ── Coincidencias locales (Fase 2) ──────────────────────────────────────────

assert.equal(normalizarBusqueda('  ÑANDÚ  '),'nandu');
assert.equal(documentoDigitos('80012345-6'),'800123456');
assert.equal(documentosCompatibles('80012345-6','800123456'),true,'mismos dígitos con y sin guion');
assert.equal(documentosCompatibles('80012345','80012345-6'),true,'base sin dígito verificador');
assert.equal(documentosCompatibles('80012345-7','80012345-6'),false);
assert.equal(documentosCompatibles('123','123'),false,'un documento demasiado corto no matchea');
assert.equal(telefonosCompatibles('+595 981 234 567','0981 234 567'),true,'prefijo país y cero inicial');
assert.equal(telefonosCompatibles('+595 981 234 567','+595 971 555 444'),false);

const cartera=[
 {id:'1',name:'Constructora Ñandú S.A.',legal_name:'Constructora Ñandú Sociedad Anónima',email:'contacto@nandu.example',phone:'+595 981 234 567',tax_id:'80012345-6',active:true},
 {id:'2',name:'Juan Pérez',legal_name:null,email:'juan@perez.example',phone:'0981 555 000',tax_id:'1234567',active:true},
 {id:'3',name:'Pérez Hnos',legal_name:null,email:'info@perezhnos.example',phone:null,tax_id:null,active:false},
 {id:'4',name:'Juan Pérez',legal_name:'JP Servicios',email:'jp@servicios.example',phone:null,tax_id:null,active:true},
];
const porRuc=coincidenciasClientes(cartera,{nombre:'otra cosa',ruc:'80012345-6'});
assert.equal(porRuc.estado,'coincide');
assert.equal(porRuc.coincidencias[0].id,'1');
assert.deepEqual(porRuc.coincidencias[0].senales,['ruc_ci_exacto']);
const porRucSinGuion=coincidenciasClientes(cartera,{nombre:'otra cosa',ruc:'80012345'});
assert.equal(porRucSinGuion.estado,'coincide','la base sin guion matchea el RUC guardado');
const porCorreo=coincidenciasClientes(cartera,{nombre:'otra cosa',correo:'CONTACTO@NANDU.EXAMPLE'});
assert.equal(porCorreo.estado,'coincide','el correo se compara en minúsculas');
assert.ok(porCorreo.coincidencias[0].senales.includes('correo'));
const porTelefono=coincidenciasClientes(cartera,{nombre:'otra cosa',telefono:'0981 234 567'});
assert.equal(porTelefono.coincidencias[0]?.id,'1','el teléfono encuentra al cliente');
assert.equal(porTelefono.estado,'ambiguo','el teléfono solo propone: no es un match fuerte');
const porNombre=coincidenciasClientes(cartera,{nombre:'Juan Perez'});
assert.equal(porNombre.estado,'ambiguo','hay dos homónimos');
assert.equal(porNombre.coincidencias.length,2);
const porNombreParcial=coincidenciasClientes(cartera,{nombre:'Constructora'});
assert.equal(porNombreParcial.estado,'ambiguo');
assert.ok(porNombreParcial.coincidencias[0].senales.includes('nombre_parcial'));
const exactoUnico=coincidenciasClientes([{id:'9',name:'Único Cliente',legal_name:null,email:null,phone:null,tax_id:null,active:true}],{nombre:'unico cliente'});
assert.equal(exactoUnico.estado,'coincide','un único nombre exacto alcanza');
const nuevo=coincidenciasClientes(cartera,{nombre:'Fantasma',ruc:'99999999-9'});
assert.deepEqual(nuevo,{estado:'nuevo',coincidencias:[]});
const inactivo=coincidenciasClientes(cartera,{nombre:'Pérez Hnos'});
assert.equal(inactivo.estado,'coincide');
assert.equal(inactivo.coincidencias[0].activo,false,'el cliente inactivo viaja marcado');
assert.equal(estadoDeCoincidencias([{id:'1',nombre:'A',senales:['ruc_ci_exacto'],activo:true},{id:'2',nombre:'B',senales:['nombre_normalizado'],activo:true}]),'coincide','un fuerte único gana aunque haya débiles');
assert.equal(estadoDeCoincidencias([{id:'1',nombre:'A',senales:['correo'],activo:true},{id:'2',nombre:'B',senales:['correo'],activo:true}]),'ambiguo','dos fuertes no se resuelven solos');

const equipos=[{id:'7',name:'Cámara Sony FX3',category:'Cámara',status:'available',active:true},{id:'8',name:'Cámara Sony FX3',category:'Cámara',status:'available',active:true},{id:'9',name:'Trípode Manfrotto',category:'Accesorio',status:'available',active:true}];
assert.equal(coincidenciasEquipos(equipos,{nombre:'cámara sony fx3'}).estado,'ambiguo','hay dos equipos con el mismo nombre');
assert.equal(coincidenciasEquipos(equipos,{nombre:'trípode manfrotto'}).estado,'coincide');
assert.equal(coincidenciasEquipos(equipos,{nombre:'Trípode'}).estado,'ambiguo','parcial no alcanza');
assert.equal(coincidenciasEquipos(equipos,{nombre:'Micrófono'}).estado,'nuevo');

const enriquecido=enriquecerCoincidencias(
 {clientes:[{nombre:'Constructora Ñandú S.A.',empresa:null,ruc:'80012345-6',telefono:null,correo:null,avisos:[]}],equipos:[{nombre:'Trípode Manfrotto'}],avisos:[]},
 {clientes:cartera,equipos},
);
assert.equal(enriquecido.clientes[0].estado,'coincide');
assert.equal(enriquecido.clientes[0].coincidencias[0].id,'1');
assert.equal(enriquecido.equipos[0].estado,'coincide');
assert.equal(enriquecido.equipos[0].coincidencias[0].id,'9');

// ── Acciones propuestas (Fase 2) ────────────────────────────────────────────

const hoy=zoneToday();
const ayer=fechaDeTextoIa('ayer',{hoy:'2026-10-01'});
assert.equal(ayer,'2026-09-30');
assert.equal(fechaDeTextoIa('hoy',{hoy:'2026-10-01'}),'2026-10-01');
assert.equal(fechaDeTextoIa('anteayer',{hoy:'2026-10-01'}),'2026-09-29');
assert.equal(fechaDeTextoIa('30/09/2026'),'2026-09-30');
assert.equal(fechaDeTextoIa('2026-09-30T15:30:00Z'),'2026-09-30');
assert.equal(fechaDeTextoIa('31/02/2026'),null);
assert.equal(fechaDeTextoIa('la semana pasada'),null);

assert.deepEqual(IA_ACCIONES,['registrar_cobro']);
const acciones=normalizarAcciones({acciones:[
 {tipo:'registrar_cobro',cliente:'Juan Pérez',monto:'1.500.000',fecha:'ayer',detalle:'Seña del proyecto'},
 {tipo:'registrar_cobro',cliente:'Ana',monto:'mil',fecha:null},
 {tipo:'otra_cosa',cliente:'Ana',monto:100},
 {tipo:'registrar_cobro',cliente:'',monto:100},
 {tipo:'registrar_cobro',cliente:'Cero',monto:0},
 {tipo:'registrar_cobro',cliente:'Negativo',monto:-5},
]});
assert.equal(acciones.acciones.length,1);
assert.equal(acciones.acciones[0].monto,1500000);
assert.equal(acciones.acciones[0].moneda,'PYG');
assert.equal(acciones.acciones[0].detalle,'Seña del proyecto');
assert.equal(acciones.acciones[0].fecha,fechaDeTextoIa('ayer'));
assert.ok(acciones.avisos.some(aviso=>aviso.includes('Descartamos 5 acciones')));
const muchasAcciones=normalizarAcciones({acciones:Array.from({length:IA_REGISTROS_MAX+3},(_,indice)=>({tipo:'registrar_cobro',cliente:`Cliente ${indice}`,monto:1000}))});
assert.equal(muchasAcciones.acciones.length,IA_REGISTROS_MAX);
assert.ok(muchasAcciones.avisos.some(aviso=>aviso.includes('se recortó')));

const accionUnica=resolverClienteDeAccion({tipo:'registrar_cobro',cliente:{nombre:'Juan Pérez',id:null,candidatos:[]},monto:500000,moneda:'PYG',fecha:null,detalle:null,avisos:[]},[{id:'2',name:'Juan Pérez',legal_name:null,email:null,phone:null,tax_id:null,active:true}]);
assert.equal(accionUnica.cliente.id,'2');
assert.equal(accionUnica.estado,'coincide');
assert.deepEqual(accionUnica.avisos,[]);
const accionAmbigua=resolverClienteDeAccion({tipo:'registrar_cobro',cliente:{nombre:'Pérez',id:null,candidatos:[]},monto:500000,moneda:'PYG',fecha:null,detalle:null,avisos:[]},cartera);
assert.equal(accionAmbigua.cliente.id,null);
assert.ok(accionAmbigua.cliente.candidatos.length>=2);
assert.ok(accionAmbigua.avisos.some(aviso=>aviso.includes('elegí cuál')));
const accionFantasma=resolverClienteDeAccion({tipo:'registrar_cobro',cliente:{nombre:'Nadie',id:null,candidatos:[]},monto:500000,moneda:'PYG',fecha:null,detalle:null,avisos:[]},cartera);
assert.equal(accionFantasma.estado,'nuevo');
assert.ok(accionFantasma.avisos.some(aviso=>aviso.includes('No encontramos')));
assert.equal(hoy.length,10);

// ── Presupuesto de tokens y resiliencia (#127) ──────────────────────────────

assert.equal(IA_TIMEOUT_MS,60000,'el timeout sube a 60 s para textos grandes');
assert.equal(iaTokensPresupuesto(''),5000);
assert.equal(iaTokensPresupuesto('x'.repeat(4000)),5000);
assert.equal(iaTokensPresupuesto('x'.repeat(4001)),6500);
assert.equal(iaTokensPresupuesto('x'.repeat(12000)),6500);
assert.equal(iaTokensPresupuesto('x'.repeat(12001)),8000);
assert.equal(iaTokensPresupuesto('x'.repeat(IA_TEXTO_MAX)),8000);

// ── Proveedor mockeado (sin red) ────────────────────────────────────────────

const visto={};
const proveedorDePrueba={
 id:'prueba',label:'Proveedor de prueba',
 async analizar(mensajesRecibidos,opciones){
  visto.mensajes=mensajesRecibidos.length;visto.maxTokens=opciones.maxTokens;
  return JSON.stringify({
   clientes:[{nombre:'Ana',telefono:'0981 000 111'}],
   equipos:[{nombre:'Cámara',cantidad:'2',valor:'1.500.000'}],
   acciones:[{tipo:'registrar_cobro',cliente:'Ana',monto:'250.000'}],
  });
 },
};
const {registros,acciones:propuestas,meta}=await analizarCarga({texto:'Ana me pagó 250.000 y sumá una cámara',tipos:['clientes','equipos'],proveedor:proveedorDePrueba});
assert.equal(visto.mensajes,2);
assert.equal(visto.maxTokens,5000,'texto corto usa el presupuesto base');
assert.deepEqual(meta,{finishReason:null,intentos:1,presupuesto:5000,tokens_salida:null});
assert.equal(registros.clientes[0].nombre,'Ana');
assert.equal(registros.equipos[0].valor,1500000);
assert.equal(propuestas.length,1);
assert.equal(propuestas[0].monto,250000);
const soloEquipos=await analizarCarga({texto:'texto',tipos:['equipos'],proveedor:proveedorDePrueba});
assert.deepEqual(soloEquipos.acciones,[],'sin clientes permitidos no se proponen acciones');
const textoMaximo=await analizarCarga({texto:'x'.repeat(IA_TEXTO_MAX),tipos:['clientes'],proveedor:proveedorDePrueba});
assert.equal(textoMaximo.meta.presupuesto,8000,'el texto máximo usa el tope');

const enSerie=salidas=>{
 let indice=0;
 return {id:'serie',label:'serie',async analizar(){return salidas[Math.min(indice++,salidas.length-1)];}};
};
const valido={contenido:'{"clientes":[{"nombre":"Ana"}]}',finishReason:'stop'};

// Un truncado no se reintenta y explica qué hacer.
let llamadasTruncado=0;
const truncado={id:'t',label:'t',async analizar(){llamadasTruncado+=1;return {contenido:'{"clientes":[',finishReason:'length'};}};
await assert.rejects(
 ()=>analizarCarga({texto:'x',tipos:['clientes'],proveedor:truncado}),
 error=>error instanceof IaError&&error.code==='ia_truncado'&&error.retryable===false&&/dos partes/.test(error.message)&&error.finishReason==='length',
);
assert.equal(llamadasTruncado,1,'el truncado no se reintenta');

// Vacío o JSON roto: un reintento único (solo análisis, sin efectos).
const vacioLuegoOk=await analizarCarga({texto:'x',tipos:['clientes'],proveedor:enSerie([{contenido:''},valido])});
assert.equal(vacioLuegoOk.meta.intentos,2,'un vacío se reintenta una vez');
assert.equal(vacioLuegoOk.registros.clientes[0].nombre,'Ana');
const rotoLuegoOk=await analizarCarga({texto:'x',tipos:['clientes'],proveedor:enSerie([{contenido:'no es json'},valido])});
assert.equal(rotoLuegoOk.meta.intentos,2,'un JSON inválido se reintenta una vez');
await assert.rejects(
 ()=>analizarCarga({texto:'x',tipos:['clientes'],proveedor:enSerie([{contenido:''},{contenido:''}])}),
 error=>error.code==='ia_vacio'&&error.retryable===true,
);
await assert.rejects(
 ()=>analizarCarga({texto:'x',tipos:['clientes'],proveedor:enSerie([{contenido:'no'},{contenido:'tampoco'}])}),
 error=>error.code==='ia_json'&&error.retryable===true,
);

// Un error del proveedor (429/timeout) no dispara el reintento del motor.
let llamadasError=0;
await assert.rejects(
 ()=>analizarCarga({texto:'texto',tipos:['clientes'],proveedor:{id:'x',label:'x',async analizar(){llamadasError+=1;throw new IaError('El proveedor de IA está limitando las consultas; probá de nuevo en un rato.',{code:'ia_proveedor'});}}}),
 /limitando/,
);
assert.equal(llamadasError,1,'un 429 no se reintenta desde el motor');
await assert.rejects(()=>analizarCarga({texto:'x',tipos:['clientes'],proveedor:null}),IaError);

const llamadas=[];
const fetchFalso=(async (url,init)=>{
 llamadas.push({url:String(url),init});
 return new Response(JSON.stringify({choices:[{message:{content:'{"clientes":[]}'},finish_reason:'stop'}],usage:{completion_tokens:321}}),{status:200});
});
const {iaProviderDeConfig}=await import('./ia-carga.js');
const config=iaConfig({IA_API_KEY:'secreto',IA_MODELO:'modelo-x'});
assert.equal(config.reasoningEffort,'low','el razonamiento se acota por defecto');
const proveedor=iaProviderDeConfig(config,{fetcher:fetchFalso});
const salidaProveedor=await proveedor.analizar(mensajesDeCarga('texto',['clientes']),{maxTokens:123});
assert.deepEqual(salidaProveedor,{contenido:'{"clientes":[]}',finishReason:'stop',uso:{completion_tokens:321}});
assert.equal(llamadas[0].url,'https://api.groq.com/openai/v1/chat/completions');
assert.equal(llamadas[0].init.headers.Authorization,'Bearer secreto');
const cuerpo=JSON.parse(llamadas[0].init.body);
assert.equal(cuerpo.model,'modelo-x');
assert.equal(cuerpo.max_tokens,123);
assert.equal(cuerpo.reasoning_effort,'low','el request acota el razonamiento');
assert.deepEqual(cuerpo.response_format,{type:'json_object'});
const sinEffort=iaConfig({IA_API_KEY:'k',IA_REASONING_EFFORT:'none'});
assert.equal(sinEffort.reasoningEffort,null);
let cuerpoSinEffort=null;
await iaProviderDeConfig(sinEffort,{fetcher:async(url,init)=>{cuerpoSinEffort=JSON.parse(init.body);return new Response(JSON.stringify({choices:[{message:{content:'{}'},finish_reason:'stop'}]}),{status:200});}}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1});
assert.equal(Object.hasOwn(cuerpoSinEffort,'reasoning_effort'),false,'IA_REASONING_EFFORT=none lo omite');
const conEstado=status=>(async()=>new Response('{}',{status}));
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:conEstado(401)}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/IA_API_KEY/);
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:conEstado(429)}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/limitando/);
await assert.rejects(()=>iaProviderDeConfig(config,{fetcher:async()=>{throw Object.assign(new Error('timed out'),{name:'TimeoutError'});}}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1}),/más de un minuto/);
const vacioDelProveedor=await iaProviderDeConfig(config,{fetcher:async()=>new Response(JSON.stringify({choices:[]}),{status:200})}).analizar(mensajesDeCarga('x',['clientes']),{maxTokens:1});
assert.deepEqual(vacioDelProveedor,{contenido:'',finishReason:null,uso:null},'el proveedor no decide: expone el vacío para el reintento');

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
const prodId=await insert("insert into users(email,password_hash) values('ia-prod@example.invalid','unused')");
await query("insert into organization_members(organization_id,user_id,role) values($1,$2,'owner'),($1,$3,'viewer'),($1,$4,'sales'),($1,$5,'production')",[orgA,ownerId,viewerId,salesId,prodId]);
const owner={id:ownerId,email:'ia-owner@example.invalid',organization_id:orgA,role:'owner',full_name:'Dueña IA'};
const viewer={...owner,id:viewerId,role:'viewer'};
const sales={...owner,id:salesId,email:'ia-sales@example.invalid',role:'sales'};
const production={...owner,id:prodId,email:'ia-prod@example.invalid',role:'production'};

const clienteAndu=await insert(`insert into agency_clients(organization_id,name,legal_name,email,phone,tax_id) values($1,'Constructora Ñandú S.A.','Constructora Ñandú Sociedad Anónima','contacto@nandu.example','+595 981 234 567','80012345-6')`,[orgA]);
const clienteJonatan=await insert("insert into agency_clients(organization_id,name,email,phone) values($1,'Jonatan Giménez','jonatan@example.invalid','+595 981 555 000')",[orgA]);
const aleph=await insert("insert into agency_clients(organization_id,name,email,tax_id) values($1,'Constructora Ñandú S.A.','otro@nandu.example','80012345-6')",[orgB]);
const teamA=await insert("insert into agency_inventory(organization_id,name,category,value) values($1,'Trípode Manfrotto','Accesorio',450000)",[orgA]);
const teamB=await insert("insert into agency_inventory(organization_id,name,category,value) values($1,'Trípode Manfrotto','Accesorio',450000)",[orgB]);
assert.ok(aleph&&teamB&&clienteJonatan&&teamA);

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
 assert.deepEqual(r.tipos,['clientes','equipos']);
 assert.deepEqual(r.acciones_soportadas,['registrar_cobro']);
 assert.equal(r.limites.texto,IA_TEXTO_MAX);assert.equal(r.limites.coincidencias,IA_COINCIDENCIAS_MAX);
 assert.deepEqual((await call('/api/ia/carga',{as:sales})).tipos,['clientes']);
 assert.deepEqual((await call('/api/ia/carga',{as:production})).tipos,['equipos']);
 assert.equal((await call('/api/ia/carga',{as:viewer})).status,403);

 const proveedorRealista=jsonProvider({
  clientes:[
   {nombre:'Constructora Ñandú S.A.',ruc:'80012345-6'},
   {nombre:'Jonatan Gimenez',telefono:'0981 555 000'},
   {nombre:'Cliente Nuevo',correo:'nuevo@example.invalid'},
  ],
  equipos:[{nombre:'Tripode Manfrotto',cantidad:1}],
  acciones:[{tipo:'registrar_cobro',cliente:'Jonatan Gimenez',monto:'1.500.000',fecha:'ayer',detalle:'Seña'}],
 });
 const antesClientes=(await query('select count(*)::int as n from agency_clients')).rows[0].n;
 const antesEquipos=(await query('select count(*)::int as n from agency_inventory')).rows[0].n;
 r=await call('/api/ia/carga',{method:'POST',payload:{texto:'cobro, clientes y equipo'},proveedor:proveedorRealista});
 assert.equal(r.status,200);
 assert.equal(r.registros.clientes.length,3);
 const andu=r.registros.clientes.find(cliente=>cliente.nombre.includes('Ñandú'));
 assert.equal(andu.estado,'coincide');
 assert.equal(andu.coincidencias[0].id,String(clienteAndu));
 assert.ok(andu.coincidencias[0].senales.includes('ruc_ci_exacto'));
 assert.equal(r.registros.clientes.find(cliente=>cliente.nombre==='Cliente Nuevo').estado,'nuevo');
 const jonatan=r.registros.clientes.find(cliente=>cliente.nombre==='Jonatan Gimenez');
 assert.equal(jonatan.coincidencias[0].id,String(clienteJonatan),'el teléfono sin prefijo matchea');
 assert.ok(jonatan.coincidencias[0].senales.includes('telefono'));
 assert.ok(jonatan.coincidencias[0].senales.includes('nombre_normalizado'),'sin acentos el nombre también coincide');
 assert.equal(jonatan.estado,'coincide');
 const itemEquipo=r.registros.equipos[0];
 assert.equal(itemEquipo.estado,'coincide','el nombre exacto de un equipo único');
 assert.equal(itemEquipo.coincidencias[0].id,String(teamA));
 assert.equal(r.acciones.length,1);
 assert.equal(r.acciones[0].cliente.id,String(clienteJonatan));
 assert.equal(r.acciones[0].monto,1500000);
 assert.equal(r.acciones[0].fecha,fechaDeTextoIa('ayer'));
 assert.equal(r.modelo,'modelo-prueba');
 // Multi-agencia: la misma razón social de la otra empresa no aparece.
 const idsCoincidencias=r.registros.clientes.flatMap(cliente=>(cliente.coincidencias||[]).map(item=>item.id));
 assert.ok(!idsCoincidencias.includes(String(aleph)),'los candidatos son solo de la empresa activa');
 assert.ok(r.registros.clientes.every(cliente=>!cliente.coincidencias?.some(item=>item.id===String(aleph))));
 assert.ok(!r.registros.equipos.some(equipo=>(equipo.coincidencias||[]).some(item=>item.id===String(teamB))));

 // La transferencia queda en la bitácora con conteos (nunca el texto) y no se escribe nada.
 const bitacora=(await query("select details from personal_data_access_log where organization_id=$1 and action='ai.transfer' order by id desc limit 1",[orgA])).rows[0];
 assert.deepEqual(bitacora.details,{modelo:'modelo-prueba',clientes:3,equipos:1,acciones:1,finish_reason:null,intentos:1,presupuesto:5000,tokens_salida:null});
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,antesClientes);
 assert.equal((await query('select count(*)::int as n from agency_inventory')).rows[0].n,antesEquipos);
 assert.equal((await query('select count(*)::int as n from agency_leads')).rows[0].n,0);

 // Idempotencia: el mismo texto devuelve exactamente lo mismo y no duplica nada.
 const otraVez=await call('/api/ia/carga',{method:'POST',payload:{texto:'cobro, clientes y equipo'},proveedor:proveedorRealista});
 assert.equal(otraVez.status,200);
 assert.deepEqual(otraVez.registros,r.registros);
 assert.deepEqual(otraVez.acciones,r.acciones);
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,antesClientes);
 assert.equal((await query('select count(*)::int as n from agency_inventory')).rows[0].n,antesEquipos);

 // Truncado del proveedor: error claro con código propio y traza en la bitácora.
 const truncadoHandler=await call('/api/ia/carga',{method:'POST',payload:{texto:'x'},proveedor:{id:'t',label:'t',analizar:async()=>({contenido:'{"clientes":[',finishReason:'length'})}});
 assert.equal(truncadoHandler.status,502);
 assert.equal(truncadoHandler.code,'ia_truncado');
 assert.match(truncadoHandler.error,/dos partes/);
 const bitacoraTruncado=(await query("select details from personal_data_access_log where organization_id=$1 and action='ai.transfer' order by id desc limit 1",[orgA])).rows[0];
 assert.deepEqual(bitacoraTruncado.details,{modelo:'modelo-prueba',error:'ia_truncado',finish_reason:'length',presupuesto:5000});
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,antesClientes,'un truncado no escribe nada');

 // Texto máximo: el presupuesto sube al tope y el proveedor lo recibe.
 let presupuestoVisto=null;
 const registraPresupuesto={id:'p',label:'p',async analizar(mensajes,{maxTokens}){presupuestoVisto=maxTokens;return {contenido:'{"clientes":[]}',finishReason:'stop'};}};
 const maximo=await call('/api/ia/carga',{method:'POST',payload:{texto:'x'.repeat(IA_TEXTO_MAX)},proveedor:registraPresupuesto});
 assert.equal(maximo.status,200);assert.equal(presupuestoVisto,8000);

 // Producción no ve clientes ni acciones aunque el proveedor las devuelva.
 const soloEquipo=await call('/api/ia/carga',{method:'POST',as:production,payload:{texto:'x'},proveedor:jsonProvider({clientes:[{nombre:'Constructora Ñandú S.A.',ruc:'80012345-6'}],equipos:[{nombre:'Trípode Manfrotto'}],acciones:[{tipo:'registrar_cobro',cliente:'Constructora Ñandú S.A.',monto:100}]})});
 assert.equal(soloEquipo.status,200);
 assert.equal(soloEquipo.registros.clientes.length,0,'sin clients.manage no se procesan clientes');
 assert.deepEqual(soloEquipo.acciones,[],'sin clients.manage no se proponen acciones');
 assert.equal(soloEquipo.registros.equipos[0].estado,'coincide');

 // Montos inválidos: la acción se descarta con aviso y nada se ejecuta.
 const montoMalo=await call('/api/ia/carga',{method:'POST',payload:{texto:'x'},proveedor:jsonProvider({clientes:[],equipos:[],acciones:[{tipo:'registrar_cobro',cliente:'Jonatan',monto:'mil'}]})});
 assert.deepEqual(montoMalo.acciones,[]);
 assert.ok(montoMalo.registros.avisos.some(aviso=>aviso.includes('monto inválido')));

 // Cliente archivado: no se propone como existente.
 const archivado=await insert("insert into agency_clients(organization_id,name) values($1,'Cliente Archivado')",[orgA]);
 await query("insert into agency_archived_records(organization_id,kind,record_id) values($1,'clients',$2)",[orgA,archivado]);
 const conArchivado=await call('/api/ia/carga',{method:'POST',payload:{texto:'x'},proveedor:jsonProvider({clientes:[{nombre:'Cliente Archivado'}],equipos:[]})});
 assert.equal(conArchivado.registros.clientes[0].estado,'nuevo','lo archivado no cuenta como existente');
 assert.deepEqual(conArchivado.registros.clientes[0].coincidencias,[]);

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
 assert.equal((await query('select count(*)::int as n from agency_clients')).rows[0].n,antesClientes+1,'solo el archivado de prueba');
}finally{
 if(previousKey===undefined)delete process.env.IA_API_KEY;else process.env.IA_API_KEY=previousKey;
 delete process.env.IA_MODELO;
}
await pg.close();

// ── Guardas de fuente ───────────────────────────────────────────────────────

const modulo=await read('./ia-carga.js');
assert.doesNotMatch(modulo,/console\./,'el texto pegado no se imprime en logs');
assert.doesNotMatch(modulo,/insert into/i,'el análisis no escribe registros');
assert.match(modulo,/from agency_clients/,'las coincidencias leen la empresa activa');
assert.match(modulo,/organization_id=\$1/,'el matching vive dentro de la organización');
assert.doesNotMatch(modulo,/update\s+agency_|delete\s+from/i,'el análisis no toca datos');
assert.match(modulo,/throttle\(db,'ia-carga:'\+user\.organization_id,IA_RATE_LIMIT\)/,'rate-limit por organización');
assert.match(modulo,/action:'ai\.transfer'/,'la transferencia al encargado queda auditada');
assert.match(modulo,/No crea registros, no ejecuta acciones/,'el contrato declara que no ejecuta');
assert.match(modulo,/reasoning_effort/,'el request acota el razonamiento');
assert.match(modulo,/finishReason==='length'/,'el motor detecta el truncado');
assert.match(modulo,/IA_INTENTOS_MAX/,'el reintento único está acotado');
assert.match(modulo,/60 s|más de un minuto/,'el timeout es de 60 s con mensaje accionable');
const servidor=await read('./server.js');
assert.match(servidor,/iaCarga\(\{req,res,url,db,session,body,send\}\)/,'el endpoint está montado en el server');
const pdp=await read('./personal-data.js');
assert.match(pdp,/'ai\.transfer'/,'la bitácora admite la acción de IA');
const encargados=await read('../docs/PRIVACIDAD-ENCARGADOS.md');
assert.match(encargados,/Groq/,'el proveedor de IA está en el inventario de encargados');
assert.match(encargados,/coincidencias/i,'el inventario aclara que el matching es local');
const rat=await read('../docs/PRIVACIDAD-RAT.md');
assert.match(rat,/Carga con IA/,'la actividad está en el RAT');
assert.match(rat,/coincidencias locales/i,'el RAT documenta el matching local');
const politica=await read('../docs/PRIVACIDAD-POLITICA.md');
assert.match(politica,/inteligencia artificial/i,'la política menciona el tratamiento con IA');

console.log('PASS: IA — configuración por entorno (Groq por defecto), permisos por tipo, prompt con acciones, JSON estricto, normalización con avisos, coincidencias locales (RUC con/sin guion, correo, teléfono, homónimos, parciales, archivados, multi-agencia), acciones propuestas con montos válidos, proveedor mockeado sin red, idempotencia, rate-limit, resiliencia (reasoning_effort, presupuesto por texto, truncado, reintento único, timeout 60 s) y guardas de no-persistencia/no-escritura/no-ejecución');
