"use client";
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {DndContext,pointerWithin,rectIntersection,useDraggable,useDroppable,useSensor,useSensors,PointerSensor,KeyboardSensor,type CollisionDetection,type DragEndEvent} from '@dnd-kit/core';
import {ArrowUpRight,GripVertical,Move,Plus,Settings2,TrendingUp,ChevronLeft,ChevronRight} from 'lucide-react';
import {Aviso,AvisoPrivacidad,Button,IconAction,Input,Label,Select} from 'owncoding-ui';
import {api,Dialog,Editor,type Field} from '../operations';
import {roleCan} from '../capabilities';
import {RemoveRecord} from '../archive-controls';
import {completeSave} from '../save-completion';
import {pipelineSummary,stageTotals,weightedAmounts,type LeadOpportunity} from '../pipeline-summary';
import {boardColumnWindow,type BoardColumnWindow} from '../pipeline-board-window';
import {EmptyBlock,EmptyCta,ErrorBlock,Kpi,KpiStrip,LoadingBlock,MoneyText,SectionLoading,StateChip} from '../ui-v2';
import {PHONE_HELP} from '../field-rules';
import {PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL,PRIVACY_LEAD_FINALITY,PRIVACY_LEAD_DETAIL} from '../privacy-links';
import {projectedList,LEAD_LIST_FIELDS} from '../shell-data';
import {EMPTY_WINDOW,LIST_WINDOW,appendPage,readPage,windowLabel,windowSlice,windowStateOf,type ListWindowState} from '../list-window';
import {useDialogPending} from '../dialog';
import type {User} from '../workspace-types';

const LiveVisitors=dynamic(()=>import('../live-visitors').then(m=>m.LiveVisitors),{loading:()=> <SectionLoading label="Cargando pipeline…"/>});

// Pipeline (SOS-COM, campaña #41 / spec #43 §2). Nombre único del módulo (#77):
// el riel, el tab de apartados y el header dicen «Pipeline».
// Rediseño v2: KPIs y totales por etapa con pipeline-summary (ponderado y
// abierto por moneda), tablero por estado con tarjetas propias (excepción
// kanban del contrato), alta/edición y administración de etapas, con estados
// de carga/vacío/error. Los datos salen de las mismas rutas del API.
type PipelineSectionProps = {
  user: User | null;
  /** Estado real de la lectura de métricas del shell (chip de captación). */
  metricsState?: 'idle' | 'loading' | 'ready' | 'error';
  onRetryMetrics?: () => void;
  /** Navegación del shell (misma vía que los tabs). */
  navigate?: (label: string) => void;
};
type Row=LeadOpportunity;
type RawRow=Record<string,unknown>;
type Stage={value:string;label:string;position:number;active:boolean;kind:'open'|'won'|'lost';id:string};
type LeadsState='loading'|'ready'|'error';

const str=(row:Row,key:string)=>String((row as RawRow)[key]??'');
const err=(error:unknown)=>error instanceof Error?error.message:'No se pudo completar';
// Fallback igual al tablero histórico: el pipeline nunca desaparece si la
// lectura de etapas falla.
const fallbackStages:Stage[]=[['lead','Nuevo lead'],['contacted','Contactado'],['proposal','Propuesta'],['negotiation','Negociación'],['won','Ganado'],['lost','Perdido']].map(([value,label],position)=>({value,label,position,active:true,kind:value==='won'?'won':value==='lost'?'lost':'open',id:''}));
const normalizeStage=(row:RawRow):Stage=>({id:String(row.id??''),value:String(row.slug??''),label:String(row.label??''),position:Number(row.position)||0,active:row.active!==false,kind:row.kind==='won'||row.kind==='lost'?row.kind:'open'});
const stageKindLabels:Record<Stage['kind'],string>={open:'Abierta',won:'Ganada',lost:'Perdida'};
const stageKindChoices=[{value:'open',label:'Abierta (oportunidad en curso)'},{value:'won',label:'Ganada'},{value:'lost',label:'Perdida'}];
// La columna bajo el puntero gana la colisión (con `rectIntersection`, una
// tarjeta alta que toca dos columnas podía caer en la vecina); el teclado, que
// no tiene puntero, cae al rectángulo que se cruza.
const detectCollision:CollisionDetection=(args)=>{const within=pointerWithin(args);return within.length?within:rectIntersection(args);};

function LeadCard({row,edit,role,canMove,refresh}:{row:Row;edit:()=>void;role:string;canMove:boolean;refresh:()=>Promise<void>}){
  const drag=useDraggable({id:String(row.id),disabled:!canMove});
  // Dato ausente = vacío explícito: no se inventa un monto 0 ni una probabilidad 0.
  const amount=str(row,'amount').trim(),probabilityRaw=str(row,'probability').trim();
  const probability=Number(probabilityRaw);
  const hasProbability=probabilityRaw!==''&&Number.isFinite(probability);
  return <article ref={drag.setNodeRef} style={{opacity:drag.isDragging?.4:1}} className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3">
    <header className="flex items-start justify-between gap-2">
      <b className="min-w-0 text-[13px] font-semibold text-fore [overflow-wrap:anywhere]" title={str(row,'name')}>{str(row,'name')}</b>
      {canMove?<button type="button" className="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute transition motion-reduce:transition-none hover:bg-ink-700 hover:text-fore active:cursor-grabbing md:h-7 md:w-7" style={{touchAction:'none'}} title={`Mover ${str(row,'name')}`} aria-label={`Mover ${str(row,'name')}`} {...drag.attributes} {...drag.listeners}><GripVertical size={14}/></button>:null}
    </header>
    <MoneyText valor={amount===''?null:amount} currency={str(row,'currency')||'PYG'} className="text-sm text-fore"/>
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      {row.do_not_contact===true?<StateChip tone="warn" title="El titular pidió no ser contactado: el equipo conserva el registro y no inicia contacto.">No contactar</StateChip>:null}
      {hasProbability?<StateChip tone={probability>=75?'ok':probability>=40?'warn':'mute'} title={`Probabilidad ${probability}%`}>{probability}%</StateChip>:<span className="text-mute">Sin probabilidad cargada</span>}
    </div>
    <footer className="flex flex-wrap items-center justify-end gap-1 border-t border-ink-600 pt-2">
      <IconAction icon="eye" label={`Ver oportunidad: ${str(row,'name')}`} onClick={edit}/>
      <RemoveRecord kind="leads" id={String(row.id)} name={str(row,'name')} role={role} done={refresh}/>
    </footer>
  </article>;
}

function LeadColumn({stage,rows,edit,role,canMove,refresh,readOnly=false,totals}:{stage:{value:string;label:string};rows:Row[];edit:(row:Row)=>void;role:string;canMove:boolean;refresh:()=>Promise<void>;readOnly?:boolean;totals?:{weighted:Record<string,number>;open:Record<string,number>}}){
  const drop=useDroppable({id:`stage-${stage.value}`,disabled:readOnly});
  // Ventana de montaje (#105): la columna monta de a páginas; el conteo y los
  // montos siguen siendo los de la etapa completa.
  const [visible,setVisible]=useState<number>(LIST_WINDOW.leadsColumns);
  const mounted=windowSlice(rows,visible);
  const hidden=rows.length-mounted.length;
  // El ponderado y el abierto por moneda salen de `stageTotals` (una sola
  // derivación, la misma del resumen del pipeline) y viven en la columna: no se
  // repite el encabezado en un bloque aparte (#100).
  const weighted=totals?.weighted||weightedAmounts(rows);
  const open=totals?.open||{};
  const currencies=[...new Set([...Object.keys(weighted),...Object.keys(open)])];
  return <section ref={drop.setNodeRef} aria-label={`${stage.label} · ${rows.length} oportunidades`} className={`grid min-w-[15rem] flex-1 content-start gap-2 rounded-xl border p-3 ${drop.isOver?'border-fono/60 bg-fono/10':'border-ink-600 bg-ink-800'}`}>
    <header className="flex items-baseline justify-between gap-2">
      <h3 className="m-0 text-sm font-bold text-fore">{stage.label}{readOnly?' · desactivada':''}</h3>
      <span className="text-xs tabular-nums text-mute">{rows.length}</span>
    </header>
    {currencies.length?<div className="grid gap-0.5 text-[10.5px] tabular-nums text-mute">{currencies.map(currency=><span key={currency} className="truncate" title={`${currency}: ponderado y abierto`}><MoneyText valor={weighted[currency]??0} currency={currency}/> ponderado{open[currency]!==undefined&&open[currency]!==weighted[currency]?<> · <MoneyText valor={open[currency]} currency={currency}/> abierto</>:null}</span>)}</div>:null}
    {mounted.map(row=><LeadCard key={row.id} row={row} edit={()=>edit(row)} role={role} canMove={canMove&&!readOnly} refresh={refresh}/>)}
    {hidden>0?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setVisible(count=>count+LIST_WINDOW.leadsColumns)}>Ver más ({hidden})</button>:null}
    {!rows.length?<p className="text-xs text-mute">Sin oportunidades.</p>:null}
  </section>;
}

export function PipelineSection({user, metricsState='ready', onRetryMetrics, navigate}: PipelineSectionProps){
  const [rows,setRows]=useState<Row[]>([]);
  const [stages,setStages]=useState<Stage[]>(fallbackStages);
  const [state,setState]=useState<LeadsState>('loading');
  const [edit,setEdit]=useState<Row|'new'|null>(null);
  const [stagePanel,setStagePanel]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  // Oposición al contacto (#114): estado del diálogo; el alta arranca destildada.
  const [doNotContact,setDoNotContact]=useState(false);
  // Estado honesto de las dos lecturas: el error real de la lista y el aviso de
  // las etapas (el tablero nunca se cae, pero el fallo no se silencia).
  const [loadError,setLoadError]=useState('');
  const [windowState,setWindowState]=useState<ListWindowState>(EMPTY_WINDOW);
  const [moreBusy,setMoreBusy]=useState(false);
  const [stagesWarning,setStagesWarning]=useState('');
  const [stagesKnown,setStagesKnown]=useState(false);
  // Indicador de columnas ocultas (#140): el tablero conserva su scroll
  // horizontal, pero dice cuántas etapas quedan fuera y da acceso con flechas.
  const boardRef=useRef<HTMLDivElement|null>(null);
  const [boardWindow,setBoardWindow]=useState<BoardColumnWindow>({from:0,to:0,total:0,hiddenBefore:0,hiddenAfter:0,hiddenTotal:0});
  const stagesLoaded=useRef(false);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
  const role=user?.role||'viewer';
  const canEdit=roleCan(role,'commercial.manage');
  // El asa de arrastre comparte la capacidad del PATCH: nadie ve un asa que no
  // pueda soltar (antes `finance`/`sales`/`collaborator` divergían de la matriz).
  const canMove=canEdit;
  const canSeeGrowth=['owner','admin'].includes(role);

  async function load(offset=0, append=false){
    if(!append)setState('loading');
    try{
      const path=`/api/agency/leads?limit=${LIST_WINDOW.leads}${offset>0?`&offset=${offset}`:''}`;
      const data=await projectedList('leads',path,LEAD_LIST_FIELDS,path=>api<{records:Row[];page?:unknown}>(path));
      const page=readPage(data?.page);
      const incoming=Array.isArray(data.records)?data.records:[];
      if(append)setRows(current=>{const next=appendPage(current,incoming);setWindowState(windowStateOf(page,next.length));return next;});
      else{setRows(incoming);setWindowState(windowStateOf(page,incoming.length));}
      setLoadError('');
      setState('ready');
    }catch(cause){if(!append){setLoadError(err(cause));setState('error');}}
  }
  const cargarMas=async()=>{
    if(moreBusy)return;
    setMoreBusy(true);
    try{await load(rows.length,true);}finally{setMoreBusy(false);}
  };
  // Una lectura de etapas fallida conserva el fallback; una recarga fallida
  // preserva las etapas ya conocidas. En ambos casos se avisa con reintento.
  async function loadStages(){
    try{
      const data=await api<{stages:RawRow[]}>('/api/agency/pipeline-stages');
      setStages(data.stages.map(normalizeStage));
      setStagesWarning('');
      setStagesKnown(true);
      stagesLoaded.current=true;
    }catch(cause){
      if(!stagesLoaded.current)setStages(fallbackStages);
      setStagesWarning(err(cause));
    }
  }
  useEffect(()=>{void load();void loadStages();},[]);
  // Mide la ventana visible del tablero (solo en el navegador; en tests sin DOM
  // las medidas no existen y el indicador no se dibuja).
  useEffect(()=>{
    const node=boardRef.current;
    if(!node||typeof node.scrollLeft!=='number')return;
    const measure=()=>{
      // `offsetLeft` es relativo al ancestro posicionado común: se normaliza al
      // borde del tablero para que la ventana compare con `scrollLeft`.
      const columns=[...node.children].map(child=>{const element=child as HTMLElement;return{start:element.offsetLeft-node.offsetLeft,size:element.offsetWidth};});
      const next=boardColumnWindow(columns,node.scrollLeft,node.clientWidth);
      setBoardWindow(current=>current.from===next.from&&current.to===next.to&&current.total===next.total?current:next);
    };
    measure();
    node.addEventListener('scroll',measure,{passive:true});
    window.addEventListener('resize',measure);
    return()=>{node.removeEventListener('scroll',measure);window.removeEventListener('resize',measure);};
  },[rows,stages]);
  const scrollBoard=(direction:1|-1)=>{
    const node=boardRef.current;
    if(!node||typeof node.scrollBy!=='function')return;
    const first=node.children[0] as HTMLElement|undefined;
    const step=(first?.offsetWidth||240)+12;
    node.scrollBy({left:direction*step,behavior:'smooth'});
  };
  // El diálogo refleja la oposición guardada al abrir cada oportunidad.
  useEffect(()=>{setDoNotContact(edit&&edit!=='new'?edit.do_not_contact===true:false);},[edit]);

  const overview=pipelineSummary(rows);
  // Monedas abiertas ordenadas: la base va en el valor del KPI y el resto en la
  // línea de explicación (una sola lectura del dato, #93).
  const openAmounts=Object.entries(overview.amounts).sort((a,b)=>b[1]-a[1]);
  const activeStages=[...stages].filter(stage=>stage.active).sort((a,b)=>a.position-b.position||a.value.localeCompare(b.value));
  const stageLabel=(value:string)=>stages.find(stage=>stage.value===value)?.label||value;
  // dnd-kit anuncia en inglés por defecto; el tablero habla castellano (#60).
  const leadName=(id:string|number)=>{const found=rows.find(candidate=>String(candidate.id)===String(id));return found?(str(found,'name')||'la oportunidad'):'la oportunidad';};
  const stageName=(id:string|number)=>stageLabel(String(id).replace('stage-',''));
  const accessibility={
    screenReaderInstructions:{draggable:'Para mover una oportunidad con el teclado: enfocá el asa de arrastre, presioná Espacio, elegí la etapa con las flechas y confirmá con Espacio. Escape cancela el movimiento.'},
    announcements:{
      onDragStart:({active}:{active:{id:string|number}})=>`Levantaste ${leadName(active.id)}.`,
      onDragOver:({active,over}:{active:{id:string|number};over:{id:string|number}|null})=>over?`${leadName(active.id)} está sobre ${stageName(over.id)}.`:`${leadName(active.id)} no está sobre una etapa.`,
      onDragEnd:({active,over}:{active:{id:string|number};over:{id:string|number}|null})=>over?`${leadName(active.id)} se movió a ${stageName(over.id)}.`:`${leadName(active.id)} volvió a su etapa.`,
      onDragCancel:({active}:{active:{id:string|number}})=>`Se canceló el movimiento de ${leadName(active.id)}.`,
    },
  };
  const looseSlugs=[...new Set(rows.map(row=>str(row,'stage')).filter(value=>Boolean(value)&&!activeStages.some(stage=>stage.value===value)))];
  const totals=stageTotals(rows,activeStages.map(stage=>({slug:stage.value,label:stage.label,position:stage.position,active:stage.active,kind:stage.kind})));
  const totalsByStage=new Map(totals.map(entry=>[entry.stage,{weighted:entry.weighted,open:entry.open}]));
  const row=edit&&edit!=='new'?edit:null;
  const currentStage=row?str(row,'stage'):'';
  const stageChoices=[...activeStages.map(stage=>({value:stage.value,label:stage.label})),...(currentStage&&!activeStages.some(stage=>stage.value===currentStage)?[{value:currentStage,label:`${stageLabel(currentStage)} · desactivada`}]:[])];
  const defaultStage=activeStages.find(stage=>stage.kind==='open')?.value||'lead';
  const fields:Field[]=[
    {key:'name',label:'Empresa o prospecto'},
    {key:'email',label:'Correo',type:'email',optional:true},
    {key:'phone',label:'Teléfono',type:'phone',optional:true,help:PHONE_HELP},
    {key:'stage',label:'Etapa',choices:stageChoices},
    {key:'amount',label:'Valor de la oportunidad',type:'money'},
    {key:'currency',label:'Moneda',choices:[{value:'PYG',label:'PYG · Guaraníes'},{value:'USD',label:'USD · Dólares'},{value:'EUR',label:'EUR · Euros'},{value:'BRL',label:'BRL · Reales'},{value:'ARS',label:'ARS · Pesos argentinos'},{value:'MXN',label:'MXN · Pesos mexicanos'}]},
    {key:'probability',label:'Probabilidad (%)',type:'number',integer:true},
    {key:'notes',label:'Próximo paso y notas',type:'textarea',optional:true},
  ];
  const defaults:Record<string,string>=row?Object.fromEntries(fields.map(field=>[field.key,str(row,field.key)])):{currency:'PYG',stage:defaultStage,amount:'0',probability:'10',name:'',email:'',phone:'',notes:''};

  // Solo las etapas activas aceptan drops: ganar fija 100% y perder 0%; el resto
  // conserva la probabilidad cargada. El movimiento es optimista: la tarjeta
  // cambia de columna al soltar, no vuelve si la recarga falla y se revierte
  // solo si el PATCH falla.
  async function move(event:DragEndEvent){
    const value=String(event.over?.id||'').replace('stage-','');
    const stage=activeStages.find(candidate=>candidate.value===value);
    const id=String(event.active.id||'');
    if(!canEdit||busy||!stage||!id)return;
    const previous=rows;
    const probability=stage.kind==='won'?100:stage.kind==='lost'?0:null;
    setRows(current=>current.map(item=>String(item.id)===id?{...item,stage:value,...(probability===null?{}:{probability})}:item));
    setBusy(true);setError('');
    try{
      await api(`/api/agency/leads/${id}`,probability===null?{stage:value}:{stage:value,probability},'PATCH');
    }catch(reason){
      setRows(previous);
      setError(err(reason));
      setBusy(false);
      return;
    }
    await load();
    setBusy(false);
  }

  return (
    <section className="grid gap-4" aria-label="Pipeline">
      {/* Toolbar en una fila (#93): la ayuda del tablero es secundaria (recorta
          con title) y las acciones viven arriba, no entre los totales y el tablero. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* El texto va en una línea con recorte (min-content = palabra más larga, no
            la frase entera): la fila no empuja el ancho de la sección en mobile. */}
        <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-mute" title="Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%."><Move size={13} aria-hidden="true" className="shrink-0"/><span className="truncate">Mover: arrastrá una tarjeta a otra etapa</span></span>
        {canEdit?<div className="flex flex-wrap items-center gap-2 max-md:ml-auto">
          <Button type="button" variant="ghost" className="max-md:min-h-11" onClick={()=>setStagePanel(true)}><Settings2 aria-hidden="true" size={16}/> Etapas</Button>
          <Button type="button" className="max-md:min-h-11" onClick={()=>setEdit('new')}><Plus aria-hidden="true" size={16}/> Nueva oportunidad</Button>
        </div>:null}
      </div>
      {/* KPIs compactos (#145, coordinación #138): en móvil los tres conteos
          van en una fila y el valor abierto ocupa el ancho completo para que
          el monto nunca se corte. Se reemplaza por el patrón de #138 cuando
          DSN lo publique. */}
      <KpiStrip aria-label="Resumen del pipeline" className="max-sm:grid-cols-3">
        <Kpi label="Oportunidades abiertas" valor={overview.open} destacado hint="Sin ganar ni perder"/>
        <Kpi label="Ganadas" valor={overview.won} hint="Conversiones cerradas"/>
        <Kpi label="Consultas web" valor={overview.web} hint="Origen: landing Scale OS"/>
        <Kpi
          className="max-sm:col-span-3"
          label="Valor abierto"
          valor={openAmounts.length?<MoneyText valor={openAmounts[0][1]} currency={openAmounts[0][0]}/>:'Sin oportunidades abiertas'}
          hint={openAmounts.length>1?<>{openAmounts.slice(1).map(([currency,value])=><span key={currency}><MoneyText valor={value} currency={currency}/> · </span>)}Sin convertir monedas</>:'Sin convertir monedas'}
        />
      </KpiStrip>

      {stagesWarning?<Aviso tono="warn" como="div" role="status">No se pudieron leer las etapas de esta empresa. {stagesWarning} {stagesKnown?'Se conservan las últimas etapas conocidas.':'Se muestra el tablero estándar mientras tanto.'}{' '}
        <button type="button" className="underline" onClick={()=>void loadStages()}>Reintentar</button>
      </Aviso>:null}

      {error?<ErrorBlock title="No se pudo completar la operación." description={error} onRetry={()=>void load()}/>:null}


      {state==='loading' && !rows.length ? <LoadingBlock label="Cargando oportunidades…" lines={4}/> : null}
      {state==='error' && !rows.length ? <ErrorBlock title="No se pudieron cargar las oportunidades." description={loadError||'Revisá la conexión y volvé a intentar; el tablero conserva las etapas conocidas.'} onRetry={()=>void load()}/> : null}
      {state==='ready' && !rows.length ? <EmptyBlock icon="target" title="Todavía no hay oportunidades." description={canEdit?'Cargá el primer lead con su etapa, valor y probabilidad para verlo en el tablero.':'Cuando el equipo cargue una oportunidad, vas a verla acá con su etapa y valor.'} action={canEdit?<EmptyCta label="Nueva oportunidad" onClick={()=>setEdit('new')} icon={<Plus aria-hidden="true" size={16}/>}/>:undefined}/> : null}

      {/* Ventana (#105): el tablero pide una página explícita; cuando el API
          promete más, el contador lo dice y aclara qué cuentan los indicadores. */}
      {windowState.hasMore?<div className="bulk-bar" role="status" aria-live="polite">
        <span className="bulk-count">{windowLabel(windowState.loaded, windowState.total, 'oportunidad', 'oportunidades')} · los indicadores cuentan lo cargado</span>
        <div className="inline-actions bulk-actions">
          <button type="button" className="secondary min-h-11 md:min-h-10" disabled={moreBusy} onClick={()=>void cargarMas()}>{moreBusy?'Cargando…':'Ver más'}</button>
        </div>
      </div>:null}

      {rows.length?<div className="grid gap-2">
        {/* Indicador fuerte de columnas ocultas (#140): conteo + posición y
            flechas para recorrer el tablero sin adivinar que hay más etapas. */}
        {boardWindow.hiddenTotal>0?<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-mute" role="status" aria-live="polite">
          <StateChip tone="info" title={`Hay ${boardWindow.hiddenTotal} ${boardWindow.hiddenTotal===1?'etapa':'etapas'} fuera de vista: usá las flechas o desplazá el tablero.`}>{boardWindow.hiddenTotal} {boardWindow.hiddenTotal===1?'etapa':'etapas'} fuera de vista</StateChip>
          <span className="tabular-nums">Mostrando etapas {boardWindow.from+1}–{boardWindow.to+1} de {boardWindow.total}</span>
          <div className="inline-actions gap-1">
            <button type="button" className="icon-button" disabled={boardWindow.hiddenBefore===0} title="Ver etapa anterior" aria-label="Ver etapa anterior" onClick={()=>scrollBoard(-1)}><ChevronLeft size={16} aria-hidden="true"/></button>
            <button type="button" className="icon-button" disabled={boardWindow.hiddenAfter===0} title="Ver etapa siguiente" aria-label="Ver etapa siguiente" onClick={()=>scrollBoard(1)}><ChevronRight size={16} aria-hidden="true"/></button>
          </div>
        </div>:null}
        <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={move} accessibility={accessibility}>
          <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-2">
            {activeStages.map(stage=><LeadColumn key={stage.value} stage={{value:stage.value,label:stage.label}} rows={rows.filter(candidate=>str(candidate,'stage')===stage.value)} edit={setEdit} role={role} canMove={canMove} refresh={load} totals={totalsByStage.get(stage.value)}/>)}
            {looseSlugs.map(value=><LeadColumn key={value} stage={{value,label:stageLabel(value)}} rows={rows.filter(candidate=>str(candidate,'stage')===value)} edit={setEdit} role={role} canMove={canMove} refresh={load} totals={totalsByStage.get(value)} readOnly/>)}
          </div>
        </DndContext>
      </div>:null}

      {/* Captación: el tablero completo vive en Métricas; acá un chip con enlace
          (no se embebe la pantalla, #100) y el aviso honesto si falló. */}
      {canSeeGrowth?<p className="flex flex-wrap items-center gap-2 text-[11px] text-mute" role="status">
        <TrendingUp size={14} aria-hidden="true" className="shrink-0"/>
        {metricsState==='error'?'No se pudieron cargar las métricas de captación.':'Captación digital y visitas'}
        {navigate?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>navigate('Métricas')}>Ver Métricas<ArrowUpRight size={12} aria-hidden="true"/></button>:null}
        {metricsState==='error'&&onRetryMetrics?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={onRetryMetrics}>Reintentar</button>:null}
      </p>:null}
      {user?<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>:null}

      {edit&&canEdit?<Dialog title={row?'Editar oportunidad':'Nueva oportunidad'} busy={busy} close={()=>{if(!busy)setEdit(null);}}>
        {/* #150: los campos van primero; el aviso legal se resume en una línea
            con enlace y el detalle queda en la ayuda desplegable. */}
        <Editor columns fields={fields} defaults={defaults} save={async values=>{await api(`/api/agency/leads${row?`/${row.id}`:''}`,{...values,do_not_contact:doNotContact},row?'PATCH':'POST');await completeSave(()=>setEdit(null),load);}}/>
        <div className="mt-3 grid gap-2">
          {/* Oposición (#114): se declara junto a los datos y viaja en el mismo
              guardado; el titular puede revertirla cuando quiera. */}
          <label className="flex items-start gap-2.5 text-[12.5px] leading-5 text-mute">
            <input type="checkbox" className="mt-0.5 h-5 w-5 flex-none accent-fono" checked={doNotContact} disabled={busy} onChange={event=>setDoNotContact(event.target.checked)}/>
            <span><b className="text-fore">No contactar.</b> El titular pidió no ser contactado: conservamos el registro de la oportunidad y no iniciamos contacto.</span>
          </label>
          <p className="form-note m-0">Datos para gestionar la oportunidad y responderte; no los usamos para otro fin. <a className="text-button" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">Privacidad</a></p>
          <details className="ops-profile-section">
            <summary>Finalidad y tus derechos</summary>
            <div className="pt-1"><AvisoPrivacidad finalidad={PRIVACY_LEAD_FINALITY} detalle={PRIVACY_LEAD_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact/></div>
          </details>
        </div>
        {row&&!row.client_id?<div className="mt-3"><Button type="button" variant="outline" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{await api(`/api/agency/leads/${row.id}/convert`,{});setEdit(null);await load();}catch(reason){setError(err(reason));}finally{setBusy(false);}}}>Ganado: convertir a cliente</Button></div>:null}
      </Dialog>:null}

      {stagePanel&&canEdit?<Dialog title="Etapas del pipeline" close={()=>setStagePanel(false)}>
        <StageManager stages={stages} reload={async()=>{await Promise.all([loadStages(),load()]);}}/>
      </Dialog>:null}
    </section>
  );
}

function StageManager({stages,reload}:{stages:Stage[];reload:()=>Promise<void>}){
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [busy,setBusy]=useState(false);
  const [confirmId,setConfirmId]=useState('');
  const [label,setLabel]=useState('');
  const [kind,setKind]=useState<Stage['kind']>('open');
  const [position,setPosition]=useState('');
  const [draft,setDraft]=useState<Record<string,{label:string;position:string;active:boolean}>>({});
  useDialogPending(busy);
  useEffect(()=>{setDraft(Object.fromEntries(stages.map(stage=>[stage.id,{label:stage.label,position:String(stage.position),active:stage.active}])));},[stages]);
  // Orden vacío = conservar el orden del servidor; un texto inválido se rechaza
  // antes de llamar al API.
  const validOrder=(value:string)=>{if(value==='')return null;const number=Number(value);return Number.isInteger(number)&&number>=0&&number<=9999?number:NaN;};
  const update=(id:string,key:'label'|'position'|'active',value:string|boolean)=>setDraft(current=>({...current,[id]:{...(current[id]||{label:'',position:'',active:true}),[key]:value}}));
  async function run(action:()=>Promise<string|void>){
    if(busy)return;
    setBusy(true);setError('');setNotice('');
    try{const message=await action();await reload();if(message)setNotice(message);}
    catch(reason){setError(err(reason));}
    finally{setBusy(false);}
  }
  const ordered=[...stages].sort((a,b)=>a.position-b.position||a.value.localeCompare(b.value));
  return <div className="grid gap-3">
    {error?<Aviso tono="error" role="alert" compact>{error}</Aviso>:null}
    {notice?<Aviso tono="ok" role="status" compact>{notice}</Aviso>:null}
    <form className="grid gap-3 sm:grid-cols-3" onSubmit={event=>{event.preventDefault();if(busy)return;const name=label.trim();const order=validOrder(position);if(name.length<2){setError('Ingresá el nombre de la etapa.');return;}if(Number.isNaN(order)){setError('Orden de etapa inválido.');return;}void run(async()=>{await api('/api/agency/pipeline-stages',{label:name,kind,...(order===null?{}:{position:order})},'POST');setLabel('');setPosition('');setKind('open');return 'Etapa creada.';});}}>
      <div className="grid gap-1"><Label htmlFor="stage-name">Nombre de la etapa</Label><Input id="stage-name" value={label} disabled={busy} maxLength={60} placeholder="Ej.: Visita técnica" onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setLabel(event.target.value)}/></div>
      <div className="grid gap-1"><Label htmlFor="stage-kind">Tipo</Label><Select id="stage-kind" value={kind} disabled={busy} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setKind(event.target.value as Stage['kind'])}>{stageKindChoices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</Select></div>
      <div className="grid gap-1"><Label htmlFor="stage-position">Orden · Opcional</Label><Input id="stage-position" type="number" min={0} max={9999} value={position} disabled={busy} placeholder="Al final" onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setPosition(event.target.value)}/></div>
      <div className="sm:col-span-3"><Button type="submit" disabled={busy||label.trim().length<2}>{busy?'Guardando…':'Crear etapa'}</Button></div>
    </form>
    <ul className="grid gap-2">
      {ordered.map(stage=>{
        const current=draft[stage.id]||{label:stage.label,position:String(stage.position),active:stage.active};
        const order=validOrder(current.position);
        const dirty=current.label!==stage.label||current.position!==String(stage.position)||current.active!==stage.active;
        return <li key={stage.id||stage.value} className="grid gap-2 rounded-xl border border-ink-600 bg-ink-800 p-3 sm:grid-cols-2" data-active={stage.active}>
          <div className="grid gap-1"><Label htmlFor={`stage-label-${stage.value}`}>Nombre</Label><Input id={`stage-label-${stage.value}`} value={current.label} disabled={busy} maxLength={60} aria-label={`Nombre de etapa ${stage.value}`} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>update(stage.id,'label',event.target.value)}/></div>
          <div className="grid gap-1"><Label htmlFor={`stage-position-${stage.value}`}>Orden</Label><Input id={`stage-position-${stage.value}`} type="number" min={0} max={9999} value={current.position} disabled={busy} aria-label={`Orden de etapa ${stage.value}`} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>update(stage.id,'position',event.target.value)}/></div>
          <label className="flex items-center gap-2 text-xs font-semibold text-mute"><input type="checkbox" className="accent-fono" checked={current.active} disabled={busy} aria-label={`Etapa activa ${stage.value}`} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>update(stage.id,'active',event.target.checked)}/>Activa</label>
          <span className="text-xs text-mute">Tipo: {stageKindLabels[stage.kind]} · <code className="font-mono">{stage.value}</code></span>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button type="button" variant="outline" disabled={busy||!dirty} onClick={()=>{if(Number.isNaN(order)){setError('Orden de etapa inválido.');return;}if(current.label.trim().length<2){setError('Ingresá el nombre de la etapa.');return;}void run(async()=>{await api(`/api/agency/pipeline-stages/${stage.id}`,{label:current.label.trim(),active:current.active,...(order===null?{}:{position:order})},'PATCH');return 'Etapa actualizada.';});}}>Guardar</Button>
            {confirmId===stage.id?<><span role="alert" className="text-xs text-warn">¿Eliminar {stage.label}? Si tiene oportunidades se desactiva.</span><Button type="button" variant="danger" disabled={busy} onClick={()=>void run(async()=>{const result=await api<{deactivated?:boolean}>(`/api/agency/pipeline-stages/${stage.id}`,{},'DELETE');setConfirmId('');return result.deactivated?'Etapa desactivada: tiene oportunidades asociadas.':'Etapa eliminada.';})}>Confirmar</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>setConfirmId('')}>Cancelar</Button></>:<Button type="button" variant="ghost" className="text-bad hover:bg-bad/10" disabled={busy} onClick={()=>setConfirmId(stage.id)}>Eliminar</Button>}
          </div>
        </li>;
      })}
    </ul>
    <p className="text-xs leading-5 text-mute">Renombrar no cambia el código de la etapa. Una etapa con oportunidades se desactiva en lugar de eliminarse, y debe quedar siempre una etapa abierta activa.</p>
  </div>;
}
