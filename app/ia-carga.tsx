"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Aviso,AvisoPrivacidad,Checkbox,FormField,Input} from 'owncoding-ui';
import {Dialog,FormActions} from './dialog';
import {AmountInput,SelectCustom} from './profile-controls';
import {EmailField} from './email-field';
import {PhoneField} from './phone-field';
import {EmptyBlock,LoadingBlock,MoneyText,StateChip} from './ui-v2';
import {useCompanyCurrency} from './currency-provider';
import {roleCan} from './capabilities';
import {api} from './operations';
import {money} from './money-format';
import {todayAsuncion} from './client-format';
import {listDateShort} from './list-format';
import {PRIVACY_IA_DETAIL,PRIVACY_IA_FINALITY,PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL} from './privacy-links';
import {
  IA_REGISTROS_MAX,IA_TEXTO_MAX,IA_TIPO_LABEL,
  analizarIa,cargarConfigIa,clasificarIaFallo,crearClienteDesdeIa,crearEquipoDesdeIa,mensajeIaError,montoDudosoIa,senalMatchLabel,
  type AccionIA,type CoincidenciaIA,type EstadoMatch,type IaCliente,type IaConfig,type IaFallo,type IaResultado,type IaTipo,
} from './ia-carga-data';
import {cargarCuentasCobro,cuentaSugeridaIa,cuentasCobroIa,registrarCobroDesdeIa,validarCobroIa,type IaCuentaCobro} from './ia-cobro-data';

/**
 * «Carga con IA» (Refs #118, #119, #120 y #121, réplica de LedBox #120): el
 * diálogo de pegado, revisión con coincidencias y creación/ejecución con
 * confirmación.
 *
 * Fase 2: cada registro llega con `estado` (nuevo / coincide / ambiguo) y
 * `coincidencias` con lo ya creado; las acciones propuestas (registrar cobro)
 * se confirman de a una con la ejecución real de Finanzas. Reglas duras:
 * - El análisis **no escribe nada**; el texto viaja sólo al endpoint de #119.
 * - Con coincidencia o ambigüedad **no se crea** hasta que haya decisión
 *   explícita (vincular una ficha o crear un duplicado a propósito).
 * - Ninguna acción se ejecuta sin el OK de su tarjeta, con cuenta elegida.
 * - La creación usa los endpoints existentes y el cobro el de Finanzas (#121);
 *   los duplicados se avisan y exigen una segunda decisión.
 */

type Fase = 'entrada' | 'revision' | 'listo';
/** Decisión por registro: crear, vincular a una ficha existente, o pendiente. */
type Decision = 'crear' | 'vincular' | 'pendiente';
/** Estado de la tarjeta de acción: nada se ejecuta sin pasar por 'pendiente'. */
type EstadoAccion = 'pendiente' | 'ejecutando' | 'ejecutada' | 'duplicado' | 'error';

type ClienteEdit = IaCliente & {clave: string; incluir: boolean; decision: Decision; elegidoId: string};
type EquipoEdit = {
  clave: string; incluir: boolean; nombre: string; categoria: string | null; categoriaValor: string;
  cantidad: string; valor: string; estado: EstadoMatch | undefined; coincidencias: CoincidenciaIA[]; avisos: string[];
  decision: Decision; elegidoId: string;
};
type AccionEdit = {
  clave: string; accion: AccionIA; clienteId: string; cuentaId: string; monto: string; fecha: string; detalle: string;
  estado: EstadoAccion; mensaje: string;
};

type Resultado = {
  creados: {clientes: number; equipos: number};
  vinculados: {clientes: number; equipos: number};
  acciones: {ejecutadas: number; pendientes: number};
  errores: string[];
};

type CategoriaOpcion = {value: string; label: string};

const CARD = 'grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5 transition [&[data-off="true"]]:opacity-70';
const CARD_TITLE = 'min-w-0 truncate text-[13.5px] font-semibold text-fore';
const CONTADOR = 'text-[11px] tabular-nums text-mute';
const OPCION = 'inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-ink-500 px-2.5 py-1.5 text-left text-[11.5px] font-medium text-mute transition hover:border-fono hover:text-fore aria-pressed:border-fono aria-pressed:bg-fono/10 aria-pressed:text-fore md:min-h-9';

/** Decisión inicial: la coincidencia fuerte propone vincular; la ambigua exige elegir. */
function decisionInicial(estado: EstadoMatch | undefined, coincidencias: CoincidenciaIA[] = []): {decision: Decision; elegidoId: string} {
  if (estado === 'coincide' && coincidencias[0]) return {decision: 'vincular', elegidoId: coincidencias[0].id};
  if (estado === 'ambiguo') return {decision: 'pendiente', elegidoId: ''};
  return {decision: 'crear', elegidoId: ''};
}

/** Reparte el resultado del análisis (registros + acciones) en tarjetas editables. */
function aTarjetas(resultado: IaResultado, siguienteClave: (prefijo: string) => string, tipos: IaTipo[]) {
  const clientes: ClienteEdit[] = tipos.includes('clientes')
    ? resultado.clientes.map((cliente) => ({...cliente, clave: siguienteClave('cliente'), incluir: true, ...decisionInicial(cliente.estado, cliente.coincidencias ?? [])}))
    : [];
  const equipos: EquipoEdit[] = tipos.includes('inventario')
    ? resultado.inventario.map((equipo) => ({
        clave: siguienteClave('equipo'),
        incluir: true,
        nombre: equipo.nombre,
        categoria: equipo.categoria,
        categoriaValor: equipo.categoria ? `nombre:${equipo.categoria}` : '',
        cantidad: String(equipo.cantidad ?? 1),
        valor: equipo.valor === null ? '' : String(equipo.valor),
        estado: equipo.estado,
        coincidencias: equipo.coincidencias ?? [],
        avisos: equipo.avisos,
        ...decisionInicial(equipo.estado, equipo.coincidencias ?? []),
      }))
    : [];
  const acciones: AccionEdit[] = resultado.acciones.map((accion) => ({
    clave: siguienteClave('accion'),
    accion,
    clienteId: accion.cliente.id || '',
    cuentaId: '',
    monto: String(accion.monto),
    fecha: accion.fecha || todayAsuncion(),
    detalle: accion.detalle || '',
    estado: 'pendiente',
    mensaje: '',
  }));
  return {clientes, equipos, acciones};
}

export function IaCargaDialog({role, close, onCreated}:{role:string; close:()=>void; onCreated:()=>Promise<void>|void}){
  const {currency} = useCompanyCurrency();
  const [config,setConfig]=useState<IaConfig|null>(null);
  const [estadoConfig,setEstadoConfig]=useState<'cargando'|'lista'|'no-configurada'|'pendiente'|'sin-tipos'|'error'>('cargando');
  const [configError,setConfigError]=useState('');
  const [reintento,setReintento]=useState(0);
  const [texto,setTexto]=useState('');
  const [fase,setFase]=useState<Fase>('entrada');
  const [analizando,setAnalizando]=useState(false);
  const [creando,setCreando]=useState(false);
  const [error,setError]=useState('');
  const [fallo,setFallo]=useState<IaFallo|null>(null);
  const [avisos,setAvisos]=useState<string[]>([]);
  const [clientes,setClientes]=useState<ClienteEdit[]>([]);
  const [equipos,setEquipos]=useState<EquipoEdit[]>([]);
  const [acciones,setAcciones]=useState<AccionEdit[]>([]);
  const [resultado,setResultado]=useState<Resultado|null>(null);
  const [categorias,setCategorias]=useState<CategoriaOpcion[]>([]);
  const [cuentas,setCuentas]=useState<IaCuentaCobro[]>([]);
  const [intentado,setIntentado]=useState(false);
  const contador=useRef(0);
  const revisionRef=useRef<HTMLDivElement|null>(null);
  const resultadoRef=useRef<HTMLDivElement|null>(null);
  const siguienteClave=(prefijo:string)=>`${prefijo}-${contador.current+=1}`;
  const puedeClientes=roleCan(role,'clients.manage');
  const puedeInventario=roleCan(role,'inventory.manage');
  const puedeCategorias=roleCan(role,'inventory.view');

  useEffect(()=>{
    let activo=true;
    setEstadoConfig('cargando');setConfigError('');
    void cargarConfigIa().then((value)=>{
      if(!activo)return;
      setConfig(value);
      const tipos=value.tipos.filter((tipo)=>tipo==='clientes'?puedeClientes:puedeInventario);
      setEstadoConfig(!value.configurada?'no-configurada':tipos.length?'lista':'sin-tipos');
    }).catch((cause)=>{
      if(!activo)return;
      const status=cause&&typeof cause==='object'&&'status' in cause?Number((cause as {status?:unknown}).status):0;
      setConfigError(mensajeIaError(cause));
      setEstadoConfig(status===404||status===501?'pendiente':'error');
    });
    return()=>{activo=false;};
  },[reintento,puedeClientes,puedeInventario]);

  useEffect(()=>{
    if(!puedeInventario||!puedeCategorias)return;
    let activo=true;
    void api<{categories?:Array<{id?:unknown;name?:unknown;active?:unknown}>}>('/api/agency/inventory-categories').then((data)=>{
      if(!activo)return;
      setCategorias((Array.isArray(data?.categories)?data.categories:[]).filter((categoria)=>categoria.active!==false&&categoria.name).map((categoria)=>({value:`id:${String(categoria.id)}`,label:String(categoria.name)})));
    }).catch(()=>{/* Sin categorías el equipo viaja por nombre y el servidor la resuelve. */});
    return()=>{activo=false;};
  },[puedeInventario,puedeCategorias]);

  // Cuentas de ingreso para confirmar cobros (#121): se cargan cuando hay
  // acciones propuestas y se sugiere la única cuenta en guaraníes si existe.
  useEffect(()=>{
    if(!acciones.length){setCuentas([]);return;}
    let activo=true;
    void cargarCuentasCobro().then((lista)=>{
      if(!activo)return;
      setCuentas(lista);
      const sugerida=cuentaSugeridaIa(lista,currency);
      setAcciones((actuales)=>actuales.map((fila)=>fila.cuentaId?fila:{...fila,cuentaId:sugerida||''}));
    }).catch(()=>{/* Sin cuentas la tarjeta lo dice y pide elegir a mano en Finanzas. */});
    return()=>{activo=false;};
  },[acciones.length,currency]);

  // Foco al cambiar de fase (#128): el contenido nuevo recibe el foco en vez de
  // dejarlo en un control que desapareció; el resumen se anuncia por `role=status`.
  useEffect(()=>{
    if(fase==='revision')revisionRef.current?.focus();
    if(fase==='listo')resultadoRef.current?.focus();
  },[fase]);

  const incluidos=useMemo(()=>({    clientes:clientes.filter((fila)=>fila.incluir&&fila.decision==='crear').length,
    equipos:equipos.filter((fila)=>fila.incluir&&fila.decision==='crear').length,
    vinculados:clientes.filter((fila)=>fila.incluir&&fila.decision==='vincular').length+equipos.filter((fila)=>fila.incluir&&fila.decision==='vincular').length,
  }),[clientes,equipos]);
  const totalCrear=incluidos.clientes+incluidos.equipos;
  const unidades=equipos.filter((fila)=>fila.incluir&&fila.decision==='crear').reduce((suma,fila)=>suma+Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(fila.cantidad)||1))),0);
  const accionesPendientes=acciones.filter((fila)=>fila.estado==='pendiente'||fila.estado==='duplicado'||fila.estado==='error').length;
  const tipos=config?.tipos.filter((tipo)=>tipo==='clientes'?puedeClientes:puedeInventario)||[];
  /** Aviso cerca del límite (auditoría #128): el contador supera el 80 %. */
  const cercaDelLimite=texto.length>IA_TEXTO_MAX*0.8;

  function nombreValido(valor:string,min=2){return valor.trim().length>=min;}
  function cantidadValida(valor:string){const numero=Math.floor(Number(valor));return Number.isFinite(numero)&&numero>=1&&numero<=IA_REGISTROS_MAX;}
  function valorValido(valor:string){if(valor==='')return true;const numero=Number(valor);return Number.isFinite(numero)&&numero>=0;}
  function montoValido(valor:string){const numero=Math.floor(Number(valor));return Number.isFinite(numero)&&numero>0;}

  async function analizar(){
    if(!texto.trim()||analizando)return;
    setAnalizando(true);setError('');setFallo(null);
    try{
      const analisis=await analizarIa(texto.trim());
      const tarjetas=aTarjetas(analisis,siguienteClave,tipos);
      setAvisos(analisis.avisos);
      setClientes(tarjetas.clientes);setEquipos(tarjetas.equipos);setAcciones(tarjetas.acciones);
      const ignorados=(puedeClientes?0:analisis.clientes.length)+(puedeInventario?0:analisis.inventario.length);
      if(ignorados)setAvisos((actuales)=>[...actuales,`Se ignoraron ${ignorados} registro(s) detectados porque tu rol no puede crearlos.`]);
      setResultado(null);setIntentado(false);setFase('revision');
    }catch(cause){
      setFallo(clasificarIaFallo(cause));
    }finally{setAnalizando(false);}
  }
  /** Nada se crea si una tarjeta incluida sigue sin decisión o sin ficha elegida. */
  function pendientesDeDecision(){
    return [...clientes,...equipos].filter((fila)=>fila.incluir&&(fila.decision==='pendiente'||(fila.decision==='vincular'&&!fila.elegidoId)));
  }

  function validarRegistros(){
    const sinDecision=pendientesDeDecision();
    if(sinDecision.length){setError('Elegí qué hacer con las coincidencias antes de crear: vincular una ficha existente o crear un registro nuevo.');return false;}
    const invalidos=clientes.some((fila)=>fila.incluir&&fila.decision==='crear'&&!nombreValido(fila.nombre,2))||equipos.some((fila)=>fila.incluir&&fila.decision==='crear'&&(!nombreValido(fila.nombre,2)||!cantidadValida(fila.cantidad)||!valorValido(fila.valor)));
    if(invalidos){setError('Revisá los campos marcados: falta el nombre, la cantidad o el valor.');return false;}
    return true;
  }

  async function crearTodo(){
    if(creando)return;
    if(totalCrear===0&&!acciones.length)return;
    setIntentado(true);setError('');
    if(totalCrear>0&&!validarRegistros())return;
    setCreando(true);
    const creados={clientes:0,equipos:0};
    const errores:string[]=[];
    const vinculados={
      clientes:clientes.filter((fila)=>fila.incluir&&fila.decision==='vincular'&&fila.elegidoId).length,
      equipos:equipos.filter((fila)=>fila.incluir&&fila.decision==='vincular'&&fila.elegidoId).length,
    };
    for(const cliente of clientes.filter((fila)=>fila.incluir&&fila.decision==='crear')){
      try{await crearClienteDesdeIa(cliente);creados.clientes+=1;}
      catch(cause){errores.push(`Cliente «${cliente.nombre.trim()||'sin nombre'}»: ${cause instanceof Error?cause.message:'no se pudo crear'}`);}
    }
    for(const equipo of equipos.filter((fila)=>fila.incluir&&fila.decision==='crear')){
      const unidadesEquipo=Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(equipo.cantidad)||1)));
      const categoria=equipo.categoriaValor||categorias[0]?.value||'nombre:Otro';
      const [categoriaId,categoriaNombre]=categoria.startsWith('nombre:')?['',categoria.slice(7)]:[categoria.slice(3),''];
      for(let unidad=1;unidad<=unidadesEquipo;unidad+=1){
        try{await crearEquipoDesdeIa({nombre:equipo.nombre.trim(),categoriaId,categoriaNombre:categoriaNombre||null,valor:Number(equipo.valor)||0,moneda:currency});creados.equipos+=1;}
        catch(cause){errores.push(`Equipo «${equipo.nombre.trim()||'sin nombre'}»${unidadesEquipo>1?` (unidad ${unidad})`:''}: ${cause instanceof Error?cause.message:'no se pudo crear'}`);break;}
      }
    }
    setResultado({creados,vinculados,acciones:{ejecutadas:acciones.filter((fila)=>fila.estado==='ejecutada').length,pendientes:acciones.filter((fila)=>fila.estado!=='ejecutada').length},errores});
    setCreando(false);setFase('listo');
    if(creados.clientes||creados.equipos){try{await onCreated();}catch{/* El resumen ya está: la recarga no puede taparlo. */}}
  }

  /** Confirma UNA acción con la ejecución real de Finanzas (#121). */
  async function confirmarAccion(clave:string,permitirDuplicado=false){
    const fila=acciones.find((item)=>item.clave===clave);
    if(!fila||fila.estado==='ejecutando'||fila.estado==='ejecutada')return;
    const actualizar=(patch:Partial<AccionEdit>)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===clave?{...item,...patch}:item));
    const cobro={clienteId:fila.clienteId,monto:Math.floor(Number(fila.monto)),fecha:fila.fecha||todayAsuncion(),detalle:fila.detalle||''};
    const problema=validarCobroIa(cobro);
    if(problema){actualizar({estado:'error',mensaje:problema});return;}
    if(!fila.cuentaId){actualizar({estado:'error',mensaje:'Elegí la cuenta donde entró el cobro.'});return;}
    actualizar({estado:'ejecutando',mensaje:''});
    try{
      const salida=await registrarCobroDesdeIa({cobro,accountId:fila.cuentaId,permitirDuplicado});
      if(salida.estado==='duplicado'){
        const facturas=salida.duplicados.map((pago)=>pago.invoiceNumber||`#${pago.id}`).join(', ');
        actualizar({estado:'duplicado',mensaje:`Ya registramos un cobro igual${facturas?` (${facturas})`:''}. ¿Querés registrarlo igual?`});
        return;
      }
      actualizar({estado:'ejecutada',mensaje:`${salida.yaRegistrado?'El cobro ya estaba registrado':'Cobro registrado'} · Gs ${salida.total.toLocaleString('es-PY')}${salida.pagos.length>1?` en ${salida.pagos.length} facturas`:''}.`});
      // Un cobro ejecutado cambia datos de Finanzas: se refresca el panel.
      try{await onCreated();}catch{/* El resultado ya está visible en la tarjeta. */}
    }catch(cause){
      actualizar({estado:'error',mensaje:cause instanceof Error?cause.message:'No se pudo registrar el cobro.'});
    }
  }

  function reiniciar(){
    setTexto('');setError('');setFallo(null);setAvisos([]);setClientes([]);setEquipos([]);setAcciones([]);setResultado(null);setIntentado(false);setFase('entrada');
  }

  return <Dialog title="Carga con IA" close={close} busy={analizando||creando} size={fase==='revision'?'wide':'default'}>
    {estadoConfig==='cargando'?<LoadingBlock label="Consultando la configuración de IA…" lines={2}/>:null}

    {estadoConfig==='pendiente'?<div className="grid gap-3">
      <Aviso tono="warn" como="div" className="grid gap-1">
        <strong>El motor de IA todavía no está publicado en este servidor.</strong>
        <span className="text-[12px] leading-5">La interfaz ya está lista y el asistente se activa cuando la base técnica (Refs #117) quede desplegada. Mientras tanto, clientes y equipos se cargan a mano desde cada módulo, sin perder nada.</span>
      </Aviso>
      <p className="text-[11.5px] text-mute">{configError}</p>
      <FormActions>
        <button type="button" className="secondary" onClick={()=>setReintento((valor)=>valor+1)}>Volver a chequear</button>
        <button type="button" className="primary" onClick={close}>Entendido</button>
      </FormActions>
    </div>:null}

    {estadoConfig==='no-configurada'?<div className="grid gap-3">
      <Aviso tono="warn" como="div" className="grid gap-1">
        <strong>La IA no está configurada en el servidor.</strong>
        <span className="text-[12px] leading-5">Se activa cargando la clave del proveedor (el modelo y la base se ajustan por entorno). Hasta entonces el asistente no está disponible y no se envía ningún texto.</span>
      </Aviso>
      <FormActions>
        <button type="button" className="secondary" onClick={()=>setReintento((valor)=>valor+1)}>Volver a chequear</button>
        <button type="button" className="primary" onClick={close}>Entendido</button>
      </FormActions>
    </div>:null}

    {estadoConfig==='sin-tipos'?<div className="grid gap-3">
      <Aviso tono="warn" como="div">Tu rol no puede crear clientes ni equipos de inventario, así que el asistente no está disponible. Si necesitás cargar esos registros, pedile el permiso a un administrador.</Aviso>
      <FormActions><button type="button" className="primary" onClick={close}>Entendido</button></FormActions>
    </div>:null}

    {estadoConfig==='error'?<div className="grid gap-3">
      <Aviso tono="error" como="div">{configError||'No pudimos consultar la configuración de IA.'}</Aviso>
      <FormActions>
        <button type="button" className="secondary" onClick={()=>setReintento((valor)=>valor+1)}>Reintentar</button>
        <button type="button" className="primary" onClick={close}>Cerrar</button>
      </FormActions>
    </div>:null}

    {estadoConfig==='lista'&&config&&fase==='entrada'?<form className="grid gap-3" onSubmit={(event)=>{event.preventDefault();void analizar();}}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-mute">Pegá mensajes, listas o catálogos. La IA detecta <b className="text-fore">{tipos.map((tipo)=>IA_TIPO_LABEL[tipo].toLowerCase()).join(' y ')}</b>, reconoce lo ya creado y arma la vista previa.</p>
        {config.modelo?<StateChip tone="mute" title="Modelo configurado en el servidor">{config.modelo}</StateChip>:null}
      </div>
      <FormField label="Texto para cargar" htmlFor="ia-carga-texto" hint={`Máximo ${IA_TEXTO_MAX.toLocaleString('es-PY')} caracteres; hasta ${IA_REGISTROS_MAX} registros por tipo. Nada se crea ni se guarda al analizar.`}>
        <textarea
          id="ia-carga-texto"
          className="min-h-44 w-full resize-y rounded-lg border border-ink-500 bg-ink-800 px-3.5 py-2.5 text-base text-fore outline-none transition focus:border-fono focus:ring-1 focus:ring-fono/40 md:text-sm"
          value={texto}
          onChange={(event)=>setTexto(event.target.value)}
          maxLength={IA_TEXTO_MAX}
          disabled={analizando}
          placeholder={'Ejemplo:\nJuan Pérez (Constructora Sur) — RUC 80012345-6, 0981 123 456, juan@sur.com.py\nPantalla LED 3x2, iluminación, cantidad 4, valor 1.500.000\nConstructora Sur me pagó 2.500.000 el 28/09 por el saldo'}
        />
      </FormField>
      <p className={`${CONTADOR} self-end`} data-cerca={cercaDelLimite||undefined} aria-live="polite">{texto.length.toLocaleString('es-PY')} / {IA_TEXTO_MAX.toLocaleString('es-PY')}</p>
      {cercaDelLimite?<Aviso tono="warn" compact role="status">Estás cerca del límite de {IA_TEXTO_MAX.toLocaleString('es-PY')} caracteres: si el texto es más largo, probá en dos partes.</Aviso>:null}
      <AvisoPrivacidad finalidad={PRIVACY_IA_FINALITY} detalle={PRIVACY_IA_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact/>
      {fallo?<FalloIa fallo={fallo}/>:null}
      {error?<Aviso tono="error">{error}</Aviso>:null}
      <FormActions>
        <button type="button" className="secondary" disabled={analizando} onClick={close}>Cancelar</button>
        <button type="submit" className="primary" disabled={analizando||!texto.trim()}>{analizando?'Analizando…':'Analizar con IA'}</button>
      </FormActions>
    </form>:null}

    {estadoConfig==='lista'&&fase==='revision'?<div ref={revisionRef} tabIndex={-1} className="grid gap-4 outline-none">
      <p className="text-sm text-mute" role="status">Detectamos <b className="text-fore">{resumenDetectado(clientes.length,equipos.length,acciones.length,puedeClientes,puedeInventario)}</b>. Revisá, corregí o descartá: <b className="text-fore">nada se crea ni se ejecuta sin tu confirmación</b>.</p>
      {incluidos.vinculados?<p className="text-[11.5px] text-mute">Vinculás <b className="tabular-nums text-fore">{incluidos.vinculados}</b> registro(s) a fichas existentes: no se crea nada para esos.</p>:null}
      {unidades>incluidos.equipos?<p className="text-[11.5px] text-mute">Se crearán <b className="tabular-nums text-fore">{unidades}</b> equipos en total: un registro por unidad reservable.</p>:null}
      {avisos.length?<Aviso tono="warn" como="div" className="grid gap-1">{avisos.map((aviso,index)=><span key={index} className="text-[12px] leading-5">{aviso}</span>)}</Aviso>:null}
      {error?<Aviso tono="error">{error}</Aviso>:null}
      {!clientes.length&&!equipos.length&&!acciones.length?<EmptyBlock icon="sparkles" title="No detectamos registros" description="Probá con un texto más completo (nombres, RUC, correo, categorías o montos) o volvé a pegar."/>:null}

      {clientes.length?<section className="grid gap-3" aria-label={`Clientes detectados (${clientes.length})`}>
        <h3 className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Clientes <span className="tabular-nums">{clientes.length}</span></h3>
        {clientes.map((cliente)=><article key={cliente.clave} className={CARD} data-off={!cliente.incluir}>
          <CardHead titulo={cliente.nombre} estado={cliente.estado} incluir={cliente.incluir} decision={cliente.decision} onIncluir={(incluir)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,incluir}:fila))}/>
          <MatchBlock estado={cliente.estado} coincidencias={cliente.coincidencias??[]} decision={cliente.decision} elegidoId={cliente.elegidoId} tipo="cliente"
            onDecidir={(decision,elegidoId)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,decision,elegidoId}:fila))}/>
          {cliente.avisos.length?<Aviso tono="warn" compact>{cliente.avisos.join(' ')}</Aviso>:null}
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor={`${cliente.clave}-nombre`} error={intentado&&cliente.incluir&&cliente.decision==='crear'&&!nombreValido(cliente.nombre)?'Obligatorio: 2 caracteres o más.':undefined}>
              <Input id={`${cliente.clave}-nombre`} value={cliente.nombre} maxLength={120} disabled={!cliente.incluir||cliente.decision==='vincular'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,nombre:event.target.value}:fila))}/>
            </FormField>
            <FormField label="Empresa / razón social" htmlFor={`${cliente.clave}-empresa`}>
              <Input id={`${cliente.clave}-empresa`} value={cliente.empresa||''} maxLength={160} disabled={!cliente.incluir||cliente.decision==='vincular'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,empresa:event.target.value||null}:fila))}/>
            </FormField>
            <FormField label="RUC / C.I." htmlFor={`${cliente.clave}-ruc`}>
              <Input id={`${cliente.clave}-ruc`} value={cliente.ruc||''} maxLength={60} autoCapitalize="characters" disabled={!cliente.incluir||cliente.decision==='vincular'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,ruc:event.target.value||null}:fila))}/>
            </FormField>
            <FormField label="Teléfono" htmlFor={`${cliente.clave}-telefono`}>
              <PhoneField id={`${cliente.clave}-telefono`} value={cliente.telefono||''} disabled={!cliente.incluir||cliente.decision==='vincular'} onChange={(value)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,telefono:value||null}:fila))}/>
            </FormField>
            <FormField label="Correo" htmlFor={`${cliente.clave}-correo`}>
              <EmailField id={`${cliente.clave}-correo`} value={cliente.correo||''} disabled={!cliente.incluir||cliente.decision==='vincular'} onChange={(value)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,correo:value||null}:fila))}/>
            </FormField>
          </div>
        </article>)}
      </section>:null}

      {equipos.length?<section className="grid gap-3" aria-label={`Equipos detectados (${equipos.length})`}>
        <h3 className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Equipos de inventario <span className="tabular-nums">{equipos.length}</span></h3>
        {equipos.map((equipo)=><article key={equipo.clave} className={CARD} data-off={!equipo.incluir}>
          <CardHead titulo={equipo.nombre} estado={equipo.estado} incluir={equipo.incluir} decision={equipo.decision} unidades={equipo.decision==='vincular'?undefined:Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(equipo.cantidad)||1)))} onIncluir={(incluir)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,incluir}:fila))}/>
          <MatchBlock estado={equipo.estado} coincidencias={equipo.coincidencias} decision={equipo.decision} elegidoId={equipo.elegidoId} tipo="equipo"
            onDecidir={(decision,elegidoId)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,decision,elegidoId}:fila))}/>
          {equipo.avisos.length?<Aviso tono="warn" compact>{equipo.avisos.join(' ')}</Aviso>:null}
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor={`${equipo.clave}-nombre`} error={intentado&&equipo.incluir&&equipo.decision==='crear'&&!nombreValido(equipo.nombre)?'Obligatorio: 2 caracteres o más.':undefined}>
              <Input id={`${equipo.clave}-nombre`} value={equipo.nombre} maxLength={160} disabled={!equipo.incluir||equipo.decision==='vincular'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,nombre:event.target.value}:fila))}/>
            </FormField>
            <SelectCustom label="Categoría" choices={opcionesCategoria(equipo,categorias)} value={equipo.categoriaValor||categorias[0]?.value||''} onChange={(value)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,categoriaValor:value}:fila))} disabled={!equipo.incluir||equipo.decision==='vincular'}/>
            <FormField label={`Unidades a crear (1–${IA_REGISTROS_MAX})`} htmlFor={`${equipo.clave}-cantidad`} error={intentado&&equipo.incluir&&equipo.decision==='crear'&&!cantidadValida(equipo.cantidad)?`Indicá una cantidad entre 1 y ${IA_REGISTROS_MAX}.`:undefined}>
              <Input id={`${equipo.clave}-cantidad`} value={equipo.cantidad} inputMode="numeric" maxLength={2} disabled={!equipo.incluir||equipo.decision==='vincular'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,cantidad:event.target.value.replace(/\D/g,'')}:fila))}/>
            </FormField>
            <FormField label={`Valor del equipo (${currency === 'PYG' ? 'Gs' : currency})`} htmlFor={`${equipo.clave}-valor`} error={intentado&&equipo.incluir&&equipo.decision==='crear'&&!valorValido(equipo.valor)?'El valor no puede ser negativo.':undefined}>
              <AmountInput id={`${equipo.clave}-valor`} value={equipo.valor} currency={currency} integerOnly disabled={!equipo.incluir||equipo.decision==='vincular'} onChange={(value)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,valor:value}:fila))}/>
            </FormField>
          </div>
        </article>)}
      </section>:null}

      {acciones.length?<section className="grid gap-3" aria-label={`Acciones propuestas (${acciones.length})`}>
        <h3 className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Acciones propuestas <span className="tabular-nums">{acciones.length}</span></h3>
        {acciones.map((fila)=><article key={fila.clave} className={CARD} data-estado={fila.estado}>
          <header className="flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className={CARD_TITLE}>Registrar cobro</h4>
              <p className="text-[11px] text-mute">{fila.accion.cliente.nombre?`En el texto: ${fila.accion.cliente.nombre}`:'Sin cliente identificado en el texto'}</p>
            </div>
            <AccionEstado estado={fila.estado}/>
          </header>
          {fila.accion.avisos.length?<Aviso tono="warn" compact>{fila.accion.avisos.join(' ')}</Aviso>:null}
          <ClienteDeAccion fila={fila} onElegir={(clienteId)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===fila.clave?{...item,clienteId,mensaje:''}:item))}/>
          <MontoInterpretado fila={fila}/>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label={`Monto (${fila.accion.moneda})`} htmlFor={`${fila.clave}-monto`}>
              <AmountInput id={`${fila.clave}-monto`} value={fila.monto} currency={fila.accion.moneda} integerOnly disabled={fila.estado==='ejecutada'} onChange={(value)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===fila.clave?{...item,monto:value,mensaje:''}:item))}/>
            </FormField>
            <FormField label="Fecha del cobro" htmlFor={`${fila.clave}-fecha`}>
              <Input id={`${fila.clave}-fecha`} type="date" max={todayAsuncion()} value={fila.fecha} disabled={fila.estado==='ejecutada'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===fila.clave?{...item,fecha:event.target.value}:item))}/>
            </FormField>
            <FormField label="Cuenta donde entró el cobro" htmlFor={`${fila.clave}-cuenta`}>
              {cuentasCobroIa(cuentas,fila.accion.moneda).length
                ? <SelectCustom label="" choices={cuentasCobroIa(cuentas,fila.accion.moneda).map((cuenta)=>({value:cuenta.id,label:`${cuenta.name} · ${cuenta.currency}`}))} value={fila.cuentaId} onChange={(value)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===fila.clave?{...item,cuentaId:value,mensaje:''}:item))} disabled={fila.estado==='ejecutada'}/>
                : <Aviso tono="warn" compact>No hay una cuenta de ingreso en {fila.accion.moneda} activa. Creala o activala en Finanzas para confirmar el cobro.</Aviso>}
            </FormField>
            <FormField label="Detalle" htmlFor={`${fila.clave}-detalle`}>
              <Input id={`${fila.clave}-detalle`} value={fila.detalle} maxLength={120} disabled={fila.estado==='ejecutada'} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setAcciones((actuales)=>actuales.map((item)=>item.clave===fila.clave?{...item,detalle:event.target.value}:item))}/>
            </FormField>
          </div>
          {fila.mensaje?<Aviso tono={fila.estado==='ejecutada'?'ok':fila.estado==='error'?'error':'warn'} compact>{fila.mensaje}</Aviso>:null}
          <div className="flex flex-wrap items-center gap-2">
            {fila.estado==='ejecutada'?<span className="text-[11.5px] text-mute">Confirmada. No hace falta volver a ejecutarla.</span>:
              fila.estado==='duplicado'?<button type="button" className="secondary" onClick={()=>void confirmarAccion(fila.clave,true)}>Registrar igual</button>:
              fila.estado==='ejecutando'?<button type="button" className="primary" disabled>Ejecutando…</button>:
              <button type="button" className="primary" disabled={!fila.clienteId||!cuentasCobroIa(cuentas,fila.accion.moneda).length} onClick={()=>void confirmarAccion(fila.clave)}>Confirmar acción</button>}
          </div>
        </article>)}
      </section>:null}

      <FormActions>
        <button type="button" className="secondary" disabled={creando} onClick={()=>setFase('entrada')}>Volver</button>
        {totalCrear>0
          ? <button type="button" className="primary" disabled={creando} onClick={()=>void crearTodo()}>{creando?'Creando…':`Crear todo (${totalCrear})`}</button>
          : acciones.length?<button type="button" className="primary" disabled={creando} onClick={()=>void crearTodo()}>Ver resumen</button>:null}
      </FormActions>
    </div>:null}

    {fase==='listo'&&resultado?<div ref={resultadoRef} tabIndex={-1} className="grid gap-3 outline-none">
      <Aviso tono={resultado.creados.clientes+resultado.creados.equipos>0||resultado.acciones.ejecutadas>0?'ok':'warn'} como="div" className="grid gap-1">
        <strong>{resultado.creados.clientes+resultado.creados.equipos>0||resultado.acciones.ejecutadas>0?'Listo.':'No se creó ni ejecutó nada.'}</strong>
        {resultado.creados.clientes+resultado.creados.equipos>0?<span className="text-[12px] leading-5">{`Creamos ${[resultado.creados.clientes?`${resultado.creados.clientes} cliente${resultado.creados.clientes===1?'':'s'}`:null,resultado.creados.equipos?`${resultado.creados.equipos} equipo${resultado.creados.equipos===1?'':'s'}`:null].filter(Boolean).join(' y ')}.`}</span>:null}
        {resultado.vinculados.clientes+resultado.vinculados.equipos>0?<span className="text-[12px] leading-5">{`Vinculamos ${[resultado.vinculados.clientes?`${resultado.vinculados.clientes} cliente${resultado.vinculados.clientes===1?'':'s'}`:null,resultado.vinculados.equipos?`${resultado.vinculados.equipos} equipo${resultado.vinculados.equipos===1?'':'s'}`:null].filter(Boolean).join(' y ')} a fichas existentes.`}</span>:null}
        {resultado.acciones.ejecutadas>0?<span className="text-[12px] leading-5">{`Registramos ${resultado.acciones.ejecutadas} acción${resultado.acciones.ejecutadas===1?'':'es'}.`}</span>:null}
        {resultado.acciones.pendientes>0?<span className="text-[12px] leading-5">{`Quedaron ${resultado.acciones.pendientes} acción${resultado.acciones.pendientes===1?'':'es'} sin confirmar: no se ejecutó nada de eso.`}</span>:null}
      </Aviso>
      {resultado.errores.length?<Aviso tono="error" como="div" className="grid gap-1"><strong>No pudimos crear {resultado.errores.length} registro(s):</strong>{resultado.errores.map((mensaje,index)=><span key={index} className="text-[12px] leading-5">{mensaje}</span>)}</Aviso>:null}
      <p className="text-[11.5px] leading-5 text-mute">Cada alta quedó auditada como cualquier carga manual y el texto que pegaste no se guardó. Los registros creados ya aparecen en Clientes y en Inventario.</p>
      <FormActions>
        {resultado.acciones.pendientes>0?<button type="button" className="secondary" onClick={()=>setFase('revision')}>Volver a las acciones</button>:null}
        <button type="button" className="secondary" onClick={reiniciar}>Cargar otro texto</button>
        <button type="button" className="primary" onClick={close}>Listo</button>
      </FormActions>
    </div>:null}
  </Dialog>;
}

/** Encabezado de tarjeta con el estado del match y la inclusión en la carga. */
function CardHead({titulo,estado,incluir,decision,unidades,onIncluir}:{titulo:string; estado:IaCliente['estado']; incluir:boolean; decision:Decision; unidades?:number; onIncluir:(incluir:boolean)=>void}){
 const chip=estado==='nuevo'?<StateChip tone="mute">Nuevo</StateChip>:estado==='coincide'?<StateChip tone="warn">Coincide</StateChip>:<StateChip tone="warn">Ambiguo</StateChip>;
 const detalle=!incluir?'Descartado':decision==='vincular'?'Se usa la ficha existente':decision==='pendiente'?'Falta decidir':unidades?`Se crearán ${unidades} equipo(s) · un registro por unidad reservable`:'Se creará';
 return <header className="flex min-w-0 items-start justify-between gap-3">
  <div className="grid min-w-0 gap-1">
   <h4 className={CARD_TITLE} title={titulo||'Sin nombre'}>{titulo||'Sin nombre'}</h4>
   <p className="flex flex-wrap items-center gap-2 text-[11px] text-mute">{chip}<span>{detalle}</span></p>
  </div>
  <Checkbox label="Incluir" checked={incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>onIncluir(event.target.checked)}/>
 </header>;
}

/** Coincidencias: la señal visible y la decisión explícita (vincular o crear). */
function MatchBlock({estado,coincidencias,decision,elegidoId,tipo,onDecidir}:{estado:EstadoMatch|undefined; coincidencias:CoincidenciaIA[]; decision:Decision; elegidoId:string; tipo:'cliente'|'equipo'; onDecidir:(decision:Decision,elegidoId:string)=>void}){
 if(estado==='nuevo')return <p className="text-[11.5px] text-mute">No encontramos una ficha parecida: se creará una nueva.</p>;
 const candidatas=coincidencias.slice(0,5);
 return <div className="grid gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5">
  <p className="text-[11.5px] leading-5 text-mute">
   {estado==='coincide'?'Ya existe una ficha que coincide':`Hay ${candidatas.length} ficha${candidatas.length===1?'':'s'} parecida${candidatas.length===1?'':'s'}`}: elegí qué hacer. <b className="text-fore">Nada se duplica sin tu decisión.</b>
  </p>
  {candidatas.length?<div className="flex flex-wrap gap-2" role="group" aria-label="Elegir la ficha existente">
   {candidatas.map((candidata)=><button key={candidata.id} type="button" aria-pressed={decision==='vincular'&&elegidoId===candidata.id} className={OPCION} title={candidata.nombre} onClick={()=>onDecidir('vincular',candidata.id)}>
    <span className="min-w-0 max-w-[14rem] truncate">Usar «{candidata.nombre}»</span>
    {candidata.senales.length?<span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-mute">{candidata.senales.map(senalMatchLabel).join(' · ')}</span>:null}
   </button>)}
  </div>:null}
  <div className="flex flex-wrap items-center gap-2">
   <button type="button" aria-pressed={decision==='crear'} className={OPCION} onClick={()=>onDecidir('crear','')}>Crear {tipo} nuevo</button>
   {decision==='crear'?<span className="text-[11px] text-warn-text">Se creará un registro nuevo aunque exista una ficha parecida.</span>:null}
  </div>
 </div>;
}

/** Cliente de una acción: resuelto por el motor o elegido acá entre candidatos. */
function ClienteDeAccion({fila,onElegir}:{fila:AccionEdit; onElegir:(clienteId:string)=>void}){
 if(fila.clienteId)return <p className="flex flex-wrap items-center gap-2 text-[12px] text-mute"><StateChip tone="ok">Cliente vinculado</StateChip><span className="break-all">{fila.accion.cliente.nombre||'Cliente existente'}</span></p>;
 const candidatos=fila.accion.cliente.candidatos.slice(0,5);
 if(!candidatos.length)return <Aviso tono="warn" compact>No pudimos vincular el cliente: elegí uno existente desde Clientes o creá el cliente primero. Sin cliente resuelto no se puede confirmar.</Aviso>;
 return <div className="grid gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2.5">
  <p className="text-[11.5px] leading-5 text-mute">No sabemos con certeza a qué cliente se refiere. Elegí uno de los candidatos para poder confirmar:</p>
  <div className="flex flex-wrap gap-2" role="group" aria-label="Elegir el cliente del cobro">
   {candidatos.map((candidato)=><button key={candidato.id} type="button" className={OPCION} title={candidato.nombre} aria-pressed={fila.clienteId===candidato.id} onClick={()=>onElegir(candidato.id)}>
    <span className="min-w-0 max-w-[14rem] truncate">{candidato.nombre}{candidato.activo?'':' · inactivo'}</span>
    {candidato.senales.length?<span className="whitespace-nowrap text-[10px] uppercase tracking-wide text-mute">{candidato.senales.map(senalMatchLabel).join(' · ')}</span>:null}
   </button>)}
  </div>
 </div>;
}

function AccionEstado({estado}:{estado:EstadoAccion}){
 if(estado==='ejecutada')return <StateChip tone="ok">Ejecutada</StateChip>;
 if(estado==='ejecutando')return <StateChip tone="mute">Ejecutando</StateChip>;
 if(estado==='duplicado')return <StateChip tone="warn">Duplicado probable</StateChip>;
 if(estado==='error')return <StateChip tone="bad">Con error</StateChip>;
 return <StateChip tone="info">Sin confirmar</StateChip>;
}

/** Resumen humano de lo detectado (sólo tipos que el rol puede crear). */
function resumenDetectado(clientes:number,equipos:number,acciones:number,puedeClientes:boolean,puedeInventario:boolean){
 const partes=[
  puedeClientes&&clientes?`${clientes} cliente${clientes===1?'':'s'}`:null,
  puedeInventario&&equipos?`${equipos} equipo${equipos===1?'':'s'} de inventario`:null,
  acciones?`${acciones} acción${acciones===1?'':'es'} propuesta${acciones===1?'':'s'}`:null,
 ].filter(Boolean);
 return partes.length?partes.join(', '):'registros para revisar';
}

/** Opciones de categoría: las existentes por id y la detectada por nombre si es nueva. */
function opcionesCategoria(equipo:EquipoEdit,categorias:CategoriaOpcion[]):CategoriaOpcion[]{
 const opciones=[...categorias];
 const detectada=equipo.categoria?.trim();
 if(detectada&&!opciones.some((opcion)=>opcion.label.trim().toLowerCase()===detectada.toLowerCase()))opciones.unshift({value:`nombre:${detectada}`,label:`${detectada} · nueva categoría`});
 if(!opciones.length)opciones.push({value:'nombre:Otro',label:'Otro'});
 return opciones;
}

/**
 * Monto interpretado en grande antes de confirmar (auditoría #128): el punto
 * delicado de `registrar_cobro` es «500 mil» vs «500.000». Muestra el importe
 * formateado, el cliente y la fecha, y advierte (sin corregir) si el monto
 * parece de otra escala para guaraníes.
 */
function MontoInterpretado({fila}:{fila:AccionEdit}){
 const monto=Math.floor(Number(fila.monto));
 const valido=Number.isFinite(monto)&&monto>0;
 const moneda=fila.accion.moneda;
 const dudoso=valido&&montoDudosoIa(monto,moneda);
 return <div className="grid gap-1.5 rounded-lg border border-ink-600 bg-ink-900/40 px-3 py-2.5" data-monto={valido?monto:undefined}>
  <span className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Monto interpretado</span>
  <MoneyText valor={valido?monto:null} currency={moneda} className="text-xl leading-tight text-fore"/>
  <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-mute">
   <span className="break-all">{fila.accion.cliente.nombre||'Sin cliente identificado'}</span>
   <span aria-hidden="true">·</span>
   <span className="whitespace-nowrap">{fila.fecha?listDateShort(fila.fecha)||fila.fecha:'sin fecha'}</span>
  </p>
  {dudoso?<Aviso tono="warn" compact>El monto parece bajo para guaraníes: revisá que no falten ceros (¿{money(monto,moneda)} o {money(monto*1000,moneda)}?).</Aviso>:null}
 </div>;
}

/** Fallo del análisis con tratamiento propio por estado (#127 y #128). */
function FalloIa({fallo}:{fallo:IaFallo}){
 const tono=fallo.tipo==='proveedor'||fallo.tipo==='desconocido'?'error':'warn';
 const acciones:Record<IaFallo['tipo'],string>={
  'no-configurada':'El servidor no tiene la clave del proveedor: pedile a un administrador que la cargue. Mientras tanto, podés cargar a mano.',
  'texto-largo':'Probá en dos partes: analizá la primera mitad y creá esos registros; después pegá la segunda.',
  'limite':`${fallo.esperaMinutos?`Esperá ${fallo.esperaMinutos} minuto${fallo.esperaMinutos===1?'':'s'}`:'Esperá unos minutos'} y volvé a analizar el mismo texto: queda acá, no se pierde.`,
  'proveedor':'Reintentá en unos segundos con el mismo texto: queda acá y no se pierde.',
  'sesion':'Volvé a ingresar y pegá el texto de nuevo.',
  'permiso':'Pedile a un administrador que revise tu rol para cargar estos registros.',
  'texto':'Corregí el texto y volvé a probar.',
  'desconocido':'Reintentá; si sigue igual, avisá al equipo.',
 };
 return <Aviso tono={tono} como="div" className="grid gap-1" data-fallo={fallo.tipo}>
  <strong>{fallo.mensaje}</strong>
  <span className="text-[12px] leading-5">{acciones[fallo.tipo]}</span>
 </Aviso>;
}
