"use client";
import {useEffect,useMemo,useRef,useState} from 'react';
import {Aviso,AvisoPrivacidad,Checkbox,FormField,Input} from 'owncoding-ui';
import {Dialog,FormActions} from './dialog';
import {AmountInput,SelectCustom} from './profile-controls';
import {EmailField} from './email-field';
import {PhoneField} from './phone-field';
import {EmptyBlock,LoadingBlock,StateChip} from './ui-v2';
import {useCompanyCurrency} from './currency-provider';
import {roleCan} from './capabilities';
import {api} from './operations';
import {PRIVACY_IA_DETAIL,PRIVACY_IA_FINALITY,PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL} from './privacy-links';
import {IA_REGISTROS_MAX,IA_TEXTO_MAX,IA_TIPO_LABEL,analizarIa,cargarConfigIa,crearClienteDesdeIa,crearEquipoDesdeIa,mensajeIaError,type IaAnalisis,type IaCliente,type IaConfig,type IaEquipo,type IaTipo} from './ia-carga-data';

/**
 * «Carga con IA» (Refs #118, réplica de LedBox #120): el diálogo de pegado,
 * revisión y creación.
 *
 * El asistente **no escribe nada** al analizar: el texto viaja sólo al endpoint
 * de #117 y vuelve como registros con avisos; la persona edita, incluye o
 * descarta y recién ahí «Crear todo» usa los endpoints existentes de clientes y
 * equipos de inventario (mismos permisos, aislamiento y auditoría que la carga
 * manual). Sin IA configurada el diálogo lo avisa y no rompe; el texto pegado no
 * se persiste en ningún lado, ni en la UI ni en logs locales.
 */

type Fase = 'entrada' | 'revision' | 'listo';

type ClienteEdit = IaCliente & {clave: string; incluir: boolean};
type EquipoEdit = {clave: string; incluir: boolean; nombre: string; categoria: string | null; categoriaValor: string; cantidad: string; valor: string; avisos: string[]};

type Resultado = {
  creados: {clientes: number; equipos: number};
  errores: string[];
};

type CategoriaOpcion = {value: string; label: string};

const CARD = 'grid gap-2.5 rounded-xl border border-ink-600 bg-ink-800 p-3.5 transition [&[data-off="true"]]:opacity-70';
const CARD_TITLE = 'min-w-0 truncate text-[13.5px] font-semibold text-fore';
const CONTADOR = 'text-[11px] tabular-nums text-mute';

/** Reparte los registros del análisis en las tarjetas editables. */
function aTarjetas(analisis: IaAnalisis, siguienteClave: (prefijo: string) => string, tipos: IaTipo[]) {
  const clientes: ClienteEdit[] = tipos.includes('clientes')
    ? analisis.clientes.map((cliente) => ({...cliente, clave: siguienteClave('cliente'), incluir: true}))
    : [];
  const equipos: EquipoEdit[] = tipos.includes('inventario')
    ? analisis.inventario.map((equipo) => ({
        clave: siguienteClave('equipo'),
        incluir: true,
        nombre: equipo.nombre,
        categoria: equipo.categoria,
        categoriaValor: equipo.categoria ? `nombre:${equipo.categoria}` : '',
        cantidad: String(equipo.cantidad ?? 1),
        valor: equipo.valor === null ? '' : String(equipo.valor),
        avisos: equipo.avisos,
      }))
    : [];
  return {clientes, equipos};
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
  const [avisos,setAvisos]=useState<string[]>([]);
  const [clientes,setClientes]=useState<ClienteEdit[]>([]);
  const [equipos,setEquipos]=useState<EquipoEdit[]>([]);
  const [resultado,setResultado]=useState<Resultado|null>(null);
  const [categorias,setCategorias]=useState<CategoriaOpcion[]>([]);
  const [intentado,setIntentado]=useState(false);
  const contador=useRef(0);
  const siguienteClave=(prefijo:string)=>`${prefijo}-${contador.current+=1}`;
  const puedeClientes=roleCan(role,'clients.manage');
  const puedeInventario=roleCan(role,'inventory.manage');
  const puedeCategorias=roleCan(role,'inventory.view');

  // Config del asistente (Refs #117): `pendiente` es el puente honesto mientras
  // el motor no esté publicado; nunca se simula una configuración.
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

  // Categorías de inventario para editar los equipos con los objetos del sistema.
  useEffect(()=>{
    if(!puedeInventario||!puedeCategorias)return;
    let activo=true;
    void api<{categories?:Array<{id?:unknown;name?:unknown;active?:unknown}>}>('/api/agency/inventory-categories').then((data)=>{
      if(!activo)return;
      setCategorias((Array.isArray(data?.categories)?data.categories:[]).filter((categoria)=>categoria.active!==false&&categoria.name).map((categoria)=>({value:`id:${String(categoria.id)}`,label:String(categoria.name)})));
    }).catch(()=>{/* Sin categorías el equipo viaja por nombre y el servidor la resuelve. */});
    return()=>{activo=false;};
  },[puedeInventario,puedeCategorias]);

  const incluidos=useMemo(()=>({clientes:clientes.filter((fila)=>fila.incluir).length,equipos:equipos.filter((fila)=>fila.incluir).length}),[clientes,equipos]);
  const totalIncluidos=incluidos.clientes+incluidos.equipos;
  const unidades=equipos.filter((fila)=>fila.incluir).reduce((suma,fila)=>suma+Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(fila.cantidad)||1))),0);
  const tipos=config?.tipos.filter((tipo)=>tipo==='clientes'?puedeClientes:puedeInventario)||[];

  function nombreValido(valor:string,min=2){return valor.trim().length>=min;}
  function cantidadValida(valor:string){const numero=Math.floor(Number(valor));return Number.isFinite(numero)&&numero>=1&&numero<=IA_REGISTROS_MAX;}
  function valorValido(valor:string){if(valor==='')return true;const numero=Number(valor);return Number.isFinite(numero)&&numero>=0;}

  async function analizar(){
    if(!texto.trim()||analizando)return;
    setAnalizando(true);setError('');
    try{
      const analisis=await analizarIa(texto.trim());
      const tarjetas=aTarjetas(analisis,siguienteClave,tipos);
      setAvisos(analisis.avisos);
      setClientes(tarjetas.clientes);setEquipos(tarjetas.equipos);
      const ignorados=(puedeClientes?0:analisis.clientes.length)+(puedeInventario?0:analisis.inventario.length);
      if(ignorados)setAvisos((actuales)=>[...actuales,`Se ignoraron ${ignorados} registro(s) detectados porque tu rol no puede crearlos.`]);
      setResultado(null);setIntentado(false);setFase('revision');
    }catch(cause){
      setError(mensajeIaError(cause));
    }finally{setAnalizando(false);}
  }

  async function crearTodo(){
    if(creando||totalIncluidos===0)return;
    setIntentado(true);setError('');
    const invalidos=clientes.some((fila)=>fila.incluir&&!nombreValido(fila.nombre))||equipos.some((fila)=>fila.incluir&&(!nombreValido(fila.nombre)||!cantidadValida(fila.cantidad)||!valorValido(fila.valor)));
    if(invalidos){setError('Revisá los campos marcados: falta el nombre, la cantidad o el valor.');return;}
    setCreando(true);
    const creados={clientes:0,equipos:0};
    const errores:string[]=[];
    for(const cliente of clientes.filter((fila)=>fila.incluir)){
      try{await crearClienteDesdeIa(cliente);creados.clientes+=1;}
      catch(cause){errores.push(`Cliente «${cliente.nombre.trim()||'sin nombre'}»: ${cause instanceof Error?cause.message:'no se pudo crear'}`);}
    }
    for(const equipo of equipos.filter((fila)=>fila.incluir)){
      const unidadesEquipo=Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(equipo.cantidad)||1)));
      const categoria=equipo.categoriaValor||categorias[0]?.value||'nombre:Otro';
      const [categoriaId,categoriaNombre]=categoria.startsWith('nombre:')?['',categoria.slice(7)]:[categoria.slice(3),''];
      for(let unidad=1;unidad<=unidadesEquipo;unidad+=1){
        try{await crearEquipoDesdeIa({nombre:equipo.nombre.trim(),categoriaId,categoriaNombre:categoriaNombre||null,valor:Number(equipo.valor)||0,moneda:currency});creados.equipos+=1;}
        catch(cause){errores.push(`Equipo «${equipo.nombre.trim()||'sin nombre'}»${unidadesEquipo>1?` (unidad ${unidad})`:''}: ${cause instanceof Error?cause.message:'no se pudo crear'}`);break;}
      }
    }
    setResultado({creados,errores});
    setCreando(false);setFase('listo');
    try{await onCreated();}catch{/* El resumen ya está: la recarga no puede taparlo. */}
  }

  function reiniciar(){
    setTexto('');setError('');setAvisos([]);setClientes([]);setEquipos([]);setResultado(null);setIntentado(false);setFase('entrada');
  }

  const titulo='Carga con IA';
  return <Dialog title={titulo} close={close} busy={analizando||creando} size={fase==='revision'?'wide':'default'}>
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
        <p className="text-sm text-mute">Pegá mensajes, listas o catálogos. La IA detecta <b className="text-fore">{tipos.map((tipo)=>IA_TIPO_LABEL[tipo].toLowerCase()).join(' y ')}</b> y arma la vista previa.</p>
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
          placeholder={'Ejemplo:\nJuan Pérez (Constructora Sur) — RUC 80012345-6, 0981 123 456, juan@sur.com.py\nPantalla LED 3x2, iluminación, cantidad 4, valor 1.500.000'}
        />
      </FormField>
      <p className={`${CONTADOR} self-end`} aria-live="polite">{texto.length.toLocaleString('es-PY')} / {IA_TEXTO_MAX.toLocaleString('es-PY')}</p>
      <AvisoPrivacidad finalidad={PRIVACY_IA_FINALITY} detalle={PRIVACY_IA_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact/>
      {error?<Aviso tono="error">{error}</Aviso>:null}
      <FormActions>
        <button type="button" className="secondary" disabled={analizando} onClick={close}>Cancelar</button>
        <button type="submit" className="primary" disabled={analizando||!texto.trim()}>{analizando?'Analizando…':'Analizar con IA'}</button>
      </FormActions>
    </form>:null}

    {estadoConfig==='lista'&&fase==='revision'?<div className="grid gap-4">
      <p className="text-sm text-mute">Detectamos <b className="text-fore">{resumenDetectado(clientes.length,equipos.length,puedeClientes,puedeInventario)}</b>. Revisá, corregí o descartá: <b className="text-fore">nada se crea sin tu confirmación</b>.</p>
      {unidades>incluidos.equipos?<p className="text-[11.5px] text-mute">Se crearán <b className="tabular-nums text-fore">{unidades}</b> equipos en total: un registro por unidad reservable.</p>:null}
      {avisos.length?<Aviso tono="warn" como="div" className="grid gap-1">{avisos.map((aviso,index)=><span key={index} className="text-[12px] leading-5">{aviso}</span>)}</Aviso>:null}
      {error?<Aviso tono="error">{error}</Aviso>:null}
      {!clientes.length&&!equipos.length?<EmptyBlock icon="sparkles" title="No detectamos registros" description="Probá con un texto más completo (nombres, RUC, correo, categorías o montos) o volvé a pegar."/>:null}

      {clientes.length?<section className="grid gap-3" aria-label={`Clientes detectados (${clientes.length})`}>
        <h3 className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Clientes <span className="tabular-nums">{clientes.length}</span></h3>
        {clientes.map((cliente)=><article key={cliente.clave} className={CARD} data-off={!cliente.incluir}>
          <header className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><h4 className={CARD_TITLE} title={cliente.nombre||'Sin nombre'}>{cliente.nombre||'Sin nombre'}</h4><p className="text-[11px] text-mute">{cliente.incluir?'Se creará':'Descartado'}</p></div>
            <Checkbox label="Crear" checked={cliente.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,incluir:event.target.checked}:fila))}/>
          </header>
          {cliente.avisos.length?<Aviso tono="warn" compact>{cliente.avisos.join(' ')}</Aviso>:null}
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor={`${cliente.clave}-nombre`} error={intentado&&!nombreValido(cliente.nombre)?'Obligatorio: 2 caracteres o más.':undefined}>
              <Input id={`${cliente.clave}-nombre`} value={cliente.nombre} maxLength={120} disabled={!cliente.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,nombre:event.target.value}:fila))}/>
            </FormField>
            <FormField label="Empresa / razón social" htmlFor={`${cliente.clave}-empresa`}>
              <Input id={`${cliente.clave}-empresa`} value={cliente.empresa||''} maxLength={160} disabled={!cliente.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,empresa:event.target.value||null}:fila))}/>
            </FormField>
            <FormField label="RUC / C.I." htmlFor={`${cliente.clave}-ruc`}>
              <Input id={`${cliente.clave}-ruc`} value={cliente.ruc||''} maxLength={60} autoCapitalize="characters" disabled={!cliente.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,ruc:event.target.value||null}:fila))}/>
            </FormField>
            <FormField label="Teléfono" htmlFor={`${cliente.clave}-telefono`}>
              <PhoneField id={`${cliente.clave}-telefono`} value={cliente.telefono||''} disabled={!cliente.incluir} onChange={(value)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,telefono:value||null}:fila))}/>
            </FormField>
            <FormField label="Correo" htmlFor={`${cliente.clave}-correo`}>
              <EmailField id={`${cliente.clave}-correo`} value={cliente.correo||''} disabled={!cliente.incluir} onChange={(value)=>setClientes((actuales)=>actuales.map((fila)=>fila.clave===cliente.clave?{...fila,correo:value||null}:fila))}/>
            </FormField>
          </div>
        </article>)}
      </section>:null}

      {equipos.length?<section className="grid gap-3" aria-label={`Equipos detectados (${equipos.length})`}>
        <h3 className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Equipos de inventario <span className="tabular-nums">{equipos.length}</span></h3>
        {equipos.map((equipo)=><article key={equipo.clave} className={CARD} data-off={!equipo.incluir}>
          <header className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0"><h4 className={CARD_TITLE} title={equipo.nombre||'Sin nombre'}>{equipo.nombre||'Sin nombre'}</h4><p className="text-[11px] text-mute">{equipo.incluir?`Se crearán ${Math.min(IA_REGISTROS_MAX,Math.max(1,Math.floor(Number(equipo.cantidad)||1)))} equipo(s) · un registro por unidad reservable`:'Descartado'}</p></div>
            <Checkbox label="Crear" checked={equipo.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,incluir:event.target.checked}:fila))}/>
          </header>
          {equipo.avisos.length?<Aviso tono="warn" compact>{equipo.avisos.join(' ')}</Aviso>:null}
          <div className="grid gap-2 sm:grid-cols-2">
            <FormField label="Nombre" htmlFor={`${equipo.clave}-nombre`} error={intentado&&!nombreValido(equipo.nombre)?'Obligatorio: 2 caracteres o más.':undefined}>
              <Input id={`${equipo.clave}-nombre`} value={equipo.nombre} maxLength={160} disabled={!equipo.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,nombre:event.target.value}:fila))}/>
            </FormField>
            <SelectCustom label="Categoría" choices={opcionesCategoria(equipo,categorias)} value={equipo.categoriaValor||categorias[0]?.value||''} onChange={(value)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,categoriaValor:value}:fila))} disabled={!equipo.incluir}/>
            <FormField label={`Unidades a crear (1–${IA_REGISTROS_MAX})`} htmlFor={`${equipo.clave}-cantidad`} error={intentado&&!cantidadValida(equipo.cantidad)?`Indicá una cantidad entre 1 y ${IA_REGISTROS_MAX}.`:undefined}>
              <Input id={`${equipo.clave}-cantidad`} value={equipo.cantidad} inputMode="numeric" maxLength={2} disabled={!equipo.incluir} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,cantidad:event.target.value.replace(/\D/g,'')}:fila))}/>
            </FormField>
            <FormField label={`Valor del equipo (${currency === 'PYG' ? 'Gs' : currency})`} htmlFor={`${equipo.clave}-valor`} error={intentado&&!valorValido(equipo.valor)?'El valor no puede ser negativo.':undefined}>
              <AmountInput id={`${equipo.clave}-valor`} value={equipo.valor} currency={currency} integerOnly disabled={!equipo.incluir} onChange={(value)=>setEquipos((actuales)=>actuales.map((fila)=>fila.clave===equipo.clave?{...fila,valor:value}:fila))}/>
            </FormField>
          </div>
        </article>)}
      </section>:null}

      <FormActions>
        <button type="button" className="secondary" disabled={creando} onClick={()=>setFase('entrada')}>Volver</button>
        <button type="button" className="primary" disabled={creando||totalIncluidos===0} onClick={()=>void crearTodo()}>{creando?'Creando…':`Crear todo (${totalIncluidos})`}</button>
      </FormActions>
    </div>:null}

    {fase==='listo'&&resultado?<div className="grid gap-3">
      <Aviso tono={resultado.creados.clientes+resultado.creados.equipos>0?'ok':'warn'}>
        {resultado.creados.clientes+resultado.creados.equipos>0
          ? `Creamos ${[resultado.creados.clientes?`${resultado.creados.clientes} cliente${resultado.creados.clientes===1?'':'s'}`:null,resultado.creados.equipos?`${resultado.creados.equipos} equipo${resultado.creados.equipos===1?'':'s'}`:null].filter(Boolean).join(' y ')}.`
          : 'No se creó ningún registro.'}
      </Aviso>
      {resultado.errores.length?<Aviso tono="error" como="div" className="grid gap-1"><strong>No pudimos crear {resultado.errores.length} registro(s):</strong>{resultado.errores.map((mensaje,index)=><span key={index} className="text-[12px] leading-5">{mensaje}</span>)}</Aviso>:null}
      <p className="text-[11.5px] leading-5 text-mute">Cada alta quedó auditada como cualquier carga manual y el texto que pegaste no se guardó. Los registros creados ya aparecen en Clientes y en Inventario.</p>
      <FormActions>
        <button type="button" className="secondary" onClick={reiniciar}>Cargar otro texto</button>
        <button type="button" className="primary" onClick={close}>Listo</button>
      </FormActions>
    </div>:null}
  </Dialog>;
}

/** Resumen humano de lo detectado (sólo tipos que el rol puede crear). */
function resumenDetectado(clientes:number,equipos:number,puedeClientes:boolean,puedeInventario:boolean){
 const partes=[puedeClientes&&clientes?`${clientes} cliente${clientes===1?'':'s'}`:null,puedeInventario&&equipos?`${equipos} equipo${equipos===1?'':'s'} de inventario`:null].filter(Boolean);
 return partes.length?partes.join(' y '):'registros para revisar';
}

/** Opciones de categoría: las existentes por id y la detectada por nombre si es nueva. */
function opcionesCategoria(equipo:EquipoEdit,categorias:CategoriaOpcion[]):CategoriaOpcion[]{
 const opciones=[...categorias];
 const detectada=equipo.categoria?.trim();
 if(detectada&&!opciones.some((opcion)=>opcion.label.trim().toLowerCase()===detectada.toLowerCase()))opciones.unshift({value:`nombre:${detectada}`,label:`${detectada} · nueva categoría`});
 if(!opciones.length)opciones.push({value:'nombre:Otro',label:'Otro'});
 return opciones;
}
