"use client";
import {OptionalMark} from '../field-label';
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {DndContext,pointerWithin,rectIntersection,useDraggable,useDroppable,useSensor,useSensors,PointerSensor,KeyboardSensor,type CollisionDetection,type DragEndEvent} from '@dnd-kit/core';
import {ArrowUpRight,GripVertical,Move,Phone,Plus,Settings2,Trash2,TrendingUp,ChevronLeft,ChevronRight,UserCheck} from 'lucide-react';
import {Aviso,AvisoPrivacidad,Button,Input,Label,SearchField,Select} from 'owncoding-ui';
import {api,Dialog,Editor,type Field} from '../operations';
import {ARCHIVE_KIND_CAPABILITIES,BATCH_LIMITS,limitSelection,roleCan} from '../capabilities';
import {RemoveRecord} from '../archive-controls';
import {notify} from '../feedback';
import {clientWhatsappUrl} from '../client-links';
import {WhatsAppIcon} from '../whatsapp-button';
import {listDateFull,listDateShort} from '../list-format';
import {filterLeads,leadCurrencies,leadFiltersActive,NO_LEAD_FILTERS,type LeadFilters} from '../pipeline-filters';
import {completeSave} from '../save-completion';
import {pipelineSummary,stageTotals,weightedAmounts,type LeadOpportunity} from '../pipeline-summary';
import {boardColumnWindow,type BoardColumnWindow} from '../pipeline-board-window';
import {ActionMenu,BulkBar,ListPage,CompactCard,CompactQuickAction,EmptyBlock,EmptyCta,ErrorBlock,FilterToolbar,Kpi,KpiStrip,ListActions,ListGrid,ListRow,LoadingBlock,MoneyText,SectionLoading,StateChip,ViewSwitch,type CollectionView,type Column,type RecordMenuItem} from '../ui-v2';
import {SelectCustom} from '../profile-controls';
import {currencyChoices} from '../currencies';
import {useCompanyCurrency} from '../currency-provider';
import {SaveActions} from '../save-actions';
import {PHONE_HELP} from '../field-rules';
import {PRIVACY_POLICY_URL,PRIVACY_RIGHTS_URL,PRIVACY_LEAD_FINALITY,PRIVACY_LEAD_DETAIL} from '../privacy-links';
import {projectedList,LEAD_LIST_FIELDS} from '../shell-data';
import {EMPTY_WINDOW,LIST_WINDOW,appendPage,readPage,windowLabel,windowSlice,windowStateOf,type ListWindowState} from '../list-window';
import {ConfirmDialog,useDialogPending} from '../dialog';
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
  /** Abre la ficha del cliente vinculado (la misma del directorio de Clientes). */
  openClient?: (id: string) => void;
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

type LeadActions={moveTo:(row:Row)=>void;convert:(row:Row)=>void;openClient?:(row:Row)=>void};
// Dato ausente = vacío explícito: no se inventa un monto 0 ni una probabilidad 0.
// Una sola lectura del dato para la tarjeta y la fila de la lista.
function leadFacts(row:Row){
  const amount=str(row,'amount').trim(),probabilityRaw=str(row,'probability').trim();
  const probability=Number(probabilityRaw);
  const phone=str(row,'phone').trim();
  // Oposición al contacto (#114): sin WhatsApp ni llamada si el titular la pidió.
  const reachable=Boolean(phone)&&row.do_not_contact!==true;
  const updatedAt=str(row,'updated_at');
  return{
    name:str(row,'name'),
    amount:amount===''?null:amount,
    currency:str(row,'currency')||'PYG',
    probability,
    hasProbability:probabilityRaw!==''&&Number.isFinite(probability),
    noContact:row.do_not_contact===true,
    linked:Boolean(row.client_id),
    updated:listDateShort(updatedAt),
    updatedFull:listDateFull(updatedAt),
    whatsapp:reachable?clientWhatsappUrl(phone):'',
    tel:reachable?`tel:${phone.replace(/[^\d+]/g,'')}`:'',
  };
}
// Misma capacidad que la papelera del API (`ARCHIVE_KIND_CAPABILITIES`): fuente única con el NAV.
const canRemoveLead=(role:string)=>roleCan(role,ARCHIVE_KIND_CAPABILITIES.leads);
const probabilityTone=(probability:number)=>probability>=75?'ok':probability>=40?'warn':'mute';

/** Menú ⋯ compartido por la tarjeta y la fila: mover/convertir/editar/papelera con las mismas capacidades. */
function useLeadMenu({row,role,canMove,actions,edit,refresh}:{row:Row;role:string;canMove:boolean;actions?:LeadActions;edit:()=>void;refresh:()=>Promise<void>}){
  const [removing,setRemoving]=useState(false);
  const mayEdit=roleCan(role,'commercial.manage');
  // Mover y convertir comparten la capacidad del arrastre (`canMove`): el viewer
  // no ve ni el menu ni la accion rapida. Convertir solo si aun no es cliente.
  const convertible=canMove&&Boolean(actions)&&!row.client_id;
  const items:RecordMenuItem[]=[
    ...(canMove&&actions?[{id:'move',label:'Mover a etapa…',onClick:()=>actions.moveTo(row)}]:[]),
    ...(convertible?[{id:'convert',label:'Convertir a cliente',onClick:()=>actions!.convert(row)}]:[]),
    ...(row.client_id&&actions?.openClient?[{id:'client',label:'Ver cliente',onClick:()=>actions.openClient!(row)}]:[]),
    ...(mayEdit?[{id:'edit',label:'Editar oportunidad',onClick:edit}]:[]),
    ...(canRemoveLead(role)?[{id:'delete',label:'Mover a la papelera',peligro:true,onClick:()=>setRemoving(true)}]:[]),
  ];
  const removal=<RemoveRecord hideTrigger kind="leads" id={String(row.id)} name={str(row,'name')} role={role} done={refresh} open={removing} onClose={()=>setRemoving(false)}/>;
  return{items,removal,convertible,mayEdit};
}

/** Acciones rápidas de contacto y conversión (tarjeta y lista): solo con dato real y capacidad. */
function LeadQuickActions({row,contact,convert}:{row:Row;contact:boolean;convert?:()=>void}){
  const facts=leadFacts(row);
  return <>
    {contact&&facts.whatsapp?<CompactQuickAction label={`WhatsApp: ${facts.name}`} icon={<WhatsAppIcon size={16}/>} onClick={()=>{window.open(facts.whatsapp,'_blank','noopener,noreferrer');}}/>:null}
    {contact&&facts.tel?<CompactQuickAction label={`Llamar: ${facts.name}`} icon={<Phone size={16} aria-hidden="true"/>} onClick={()=>{window.location.href=facts.tel;}}/>:null}
    {convert?<CompactQuickAction label={`Convertir a cliente: ${facts.name}`} icon={<UserCheck size={16} aria-hidden="true"/>} onClick={convert}/>:null}
  </>;
}

function LeadCard({row,edit,role,canMove,refresh,won=false,actions}:{row:Row;edit:()=>void;role:string;canMove:boolean;refresh:()=>Promise<void>;won?:boolean;actions?:LeadActions}){
  const drag=useDraggable({id:String(row.id),disabled:!canMove});
  const facts=leadFacts(row);
  const menu=useLeadMenu({row,role,canMove,actions,edit,refresh});
  const convert=won&&menu.convertible?()=>actions!.convert(row):undefined;
  const hasQuick=menu.mayEdit&&Boolean(facts.whatsapp||facts.tel||convert);
  return <div ref={drag.setNodeRef} style={{opacity:drag.isDragging?.4:1}}>
    <CompactCard
      title={facts.name}
      onOpen={menu.mayEdit?edit:undefined}
      openLabel={`Ver oportunidad: ${facts.name}`}
      menuLabel={`Acciones de la oportunidad: ${facts.name}`}
      actions={menu.items}
      quickAction={canMove?<button type="button" className="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute transition motion-reduce:transition-none hover:bg-ink-700 hover:text-fore active:cursor-grabbing md:h-7 md:w-7" style={{touchAction:'none'}} title={`Mover ${str(row,'name')}`} aria-label={`Mover ${str(row,'name')}`} {...drag.attributes} {...drag.listeners}><GripVertical size={14}/></button>:undefined}
      context={<>
        <MoneyText valor={facts.amount} currency={facts.currency} className="text-sm text-fore"/>
        {facts.updated?<span className="whitespace-nowrap tabular-nums" title={`Última actualización ${facts.updatedFull||facts.updated}`}>· Actualizado {facts.updated}</span>:null}
      </>}
      chips={<>
        {facts.noContact?<StateChip tone="warn" title="El titular pidió no ser contactado: el equipo conserva el registro y no inicia contacto.">No contactar</StateChip>:null}
        {facts.hasProbability?<StateChip tone={probabilityTone(facts.probability)} title={`Probabilidad ${facts.probability}%`}>{facts.probability}%</StateChip>:<span className="text-[11px] text-mute">Sin probabilidad cargada</span>}
        {facts.linked?<StateChip tone="info" title="Ya está vinculada a un cliente">Cliente vinculado</StateChip>:null}
      </>}
    >
      {hasQuick?<div className="flex flex-wrap items-center justify-end gap-1 border-t border-ink-600 pt-2"><LeadQuickActions row={row} contact={menu.mayEdit} convert={convert}/></div>:null}
      {menu.removal}
    </CompactCard>
  </div>;
}

function LeadColumn({stage,rows,edit,role,canMove,refresh,readOnly=false,totals,actions,create}:{stage:{value:string;label:string;kind?:Stage['kind']};rows:Row[];edit:(row:Row)=>void;role:string;canMove:boolean;refresh:()=>Promise<void>;readOnly?:boolean;totals?:{weighted:Record<string,number>;open:Record<string,number>};actions?:LeadActions;create?:(stage:string)=>void}){
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
  return <section ref={drop.setNodeRef} aria-label={`${stage.label} · ${rows.length} oportunidades`} className={`grid min-w-[15rem] flex-1 content-start gap-2 rounded-xl border p-3 transition-colors ${drop.isOver?'border-fono/60 bg-fono/10':'border-ink-600 bg-ink-700/40'}`}>
    <header className="flex items-center justify-between gap-2">
      <h3 className="m-0 flex min-w-0 items-center gap-2 text-sm font-bold text-fore"><span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${stage.kind==='won'?'bg-ok':stage.kind==='lost'?'bg-bad':'bg-fono'}`}/><span className="min-w-0 truncate" title={stage.label}>{stage.label}{readOnly?' · desactivada':''}</span></h3>
      <span className="min-w-6 shrink-0 rounded-full bg-ink-600 px-2 py-0.5 text-center text-xs font-semibold tabular-nums text-fore">{rows.length}</span>
    </header>
    {/* Totales sin recorte (#182): cada monto va nowrap + tabular-nums y es la
        etiqueta la que baja de linea cuando el ancho no alcanza. */}
    {currencies.length?<div className="grid gap-0.5 text-[10.5px] tabular-nums text-mute">{currencies.map(currency=><span key={currency} className="flex flex-wrap items-baseline gap-x-1" title={`${currency}: ponderado y abierto`}><span className="whitespace-nowrap tabular-nums"><MoneyText valor={weighted[currency]??0} currency={currency}/> ponderado</span>{open[currency]!==undefined&&open[currency]!==weighted[currency]?<span className="whitespace-nowrap tabular-nums">· <MoneyText valor={open[currency]} currency={currency}/> abierto</span>:null}</span>)}</div>:null}
    {mounted.map(row=><LeadCard key={row.id} row={row} edit={()=>edit(row)} role={role} canMove={canMove&&!readOnly} refresh={refresh} won={stage.kind==='won'} actions={readOnly?undefined:actions}/>)}
    {hidden>0?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setVisible(count=>count+LIST_WINDOW.leadsColumns)}>Ver más ({hidden})</button>:null}
    {!rows.length?<div className="grid gap-2">
      <p className="m-0 text-xs text-mute">Sin oportunidades.</p>
      {canMove&&!readOnly&&create?<button type="button" className="text-button min-h-11 justify-self-start md:min-h-8" aria-label={`Nueva oportunidad en ${stage.label}`} onClick={()=>create(stage.value)}><Plus aria-hidden="true" size={14}/> Nueva</button>:null}
    </div>:null}
  </section>;
}

// Lista (#182): MISMA información que la tarjeta, en filas finas. Encabezado y
// filas comparten una sola plantilla; sin acciones no hay columna de acciones
// ni de selección (viewer). El monto va a la derecha, las fechas por list-format.
const LEAD_LIST_EDIT_TEMPLATE='grid-cols-[2.75rem_minmax(11rem,1.6fr)_7rem_8rem_4.5rem_6.5rem_5.5rem_11rem]';
const LEAD_LIST_VIEW_TEMPLATE='grid-cols-[minmax(11rem,1.6fr)_7rem_8rem_4.5rem_6.5rem_5.5rem]';
const LEAD_LIST_COLUMNS:Column[]=[{key:'name',label:'Oportunidad'},{key:'stage',label:'Etapa'},{key:'amount',label:'Valor',align:'end'},{key:'probability',label:'Prob.'},{key:'client',label:'Cliente'},{key:'updated',label:'Actualizado'}];
const leadListColumns=(editable:boolean):Column[]=>editable?[{key:'select',label:''},...LEAD_LIST_COLUMNS,{key:'actions',label:'Acciones'}]:LEAD_LIST_COLUMNS;

function LeadListRow({row,stageLabel,editable,selected,onSelect,edit,role,canMove,refresh,won=false,actions}:{row:Row;stageLabel:string;editable:boolean;selected:boolean;onSelect:()=>void;edit:()=>void;role:string;canMove:boolean;refresh:()=>Promise<void>;won?:boolean;actions?:LeadActions}){
  const facts=leadFacts(row);
  const menu=useLeadMenu({row,role,canMove,actions,edit,refresh});
  const convert=won&&menu.convertible?()=>actions!.convert(row):undefined;
  return <ListRow template={editable?LEAD_LIST_EDIT_TEMPLATE:LEAD_LIST_VIEW_TEMPLATE} data-lead-row={String(row.id)}>
    {editable?<span role="cell" className="flex justify-center"><label className="select-check flex h-11 w-11 shrink-0 items-center justify-center md:h-8 md:w-8" title="Seleccionar oportunidad"><input type="checkbox" aria-label={`Seleccionar ${facts.name}`} checked={selected} onChange={onSelect}/></label></span>:null}
    <span role="cell" className="flex min-w-0 items-center gap-2">
      {menu.mayEdit?<button type="button" className="min-h-11 min-w-0 truncate text-left text-[13.5px] font-semibold text-fore outline-none transition-colors hover:text-fono-light focus-visible:ring-2 focus-visible:ring-fono md:min-h-0" title={facts.name} aria-label={`Ver oportunidad: ${facts.name}`} onClick={edit}>{facts.name}</button>:<span className="min-w-0 truncate text-[13.5px] font-semibold text-fore" title={facts.name}>{facts.name}</span>}
      {facts.noContact?<StateChip tone="warn" title="El titular pidió no ser contactado: el equipo conserva el registro y no inicia contacto.">No contactar</StateChip>:null}
    </span>
    <span role="cell" className="min-w-0"><StateChip tone="info" title={stageLabel}>{stageLabel}</StateChip></span>
    <span role="cell" className="text-right"><MoneyText valor={facts.amount} currency={facts.currency} className="text-[13.5px] text-fore"/></span>
    <span role="cell" className="min-w-0">{facts.hasProbability?<StateChip tone={probabilityTone(facts.probability)} title={`Probabilidad ${facts.probability}%`}>{facts.probability}%</StateChip>:<span className="text-[11px] text-mute" title="Sin probabilidad cargada">—</span>}</span>
    <span role="cell" className="min-w-0 text-[12px] text-mute">{facts.linked?<StateChip tone="info" title="Ya está vinculada a un cliente">Vinculado</StateChip>:'—'}</span>
    <span role="cell" className="list-date whitespace-nowrap text-[11px] tabular-nums text-mute" title={facts.updatedFull?`Última actualización ${facts.updatedFull}`:'Sin fecha de actualización'}>{facts.updated||'—'}</span>
    {editable?<ListActions className="silent-scroll">
      <LeadQuickActions row={row} contact={menu.mayEdit} convert={convert}/>
      {menu.items.length?<ActionMenu label={`Acciones de la oportunidad: ${facts.name}`} items={menu.items}/>:null}
      {menu.removal}
    </ListActions>:null}
  </ListRow>;
}

export function PipelineSection({user, metricsState='ready', onRetryMetrics, navigate, openClient}: PipelineSectionProps){
  const companyCurrency=useCompanyCurrency().currency;
  const [rows,setRows]=useState<Row[]>([]);
  const [stages,setStages]=useState<Stage[]>(fallbackStages);
  const [state,setState]=useState<LeadsState>('loading');
  const [edit,setEdit]=useState<Row|'new'|null>(null);
  const [stagePanel,setStagePanel]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  // Etapa preseleccionada del alta desde una columna vacia («+ Nueva», #182).
  const [newStage,setNewStage]=useState('');
  // «Mover a etapa…» (#182): oportunidad en movimiento y oferta de conversion.
  const [moveTarget,setMoveTarget]=useState<Row|null>(null);
  const [convertOffer,setConvertOffer]=useState<Row|null>(null);
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
  // Filtros y vista (#182): los filtros valen para el tablero y la lista; la
  // vista se recuerda por navegador como la de Clientes (`scale:client-view`).
  const [filters,setFilters]=useState<LeadFilters>(NO_LEAD_FILTERS);
  const [view,setView]=useState<CollectionView>('grid');
  useEffect(()=>{try{setView(localStorage.getItem('scale:pipeline-view')==='list'?'list':'grid');}catch{/* Preferencia opcional de interfaz. */}},[]);
  // Lote (#182): selección solo en la lista, mismo patrón que Presupuestos.
  const [selected,setSelected]=useState<string[]>([]);
  const [bulkBusy,setBulkBusy]=useState(false);
  const [bulkMove,setBulkMove]=useState(false);
  const [bulkDelete,setBulkDelete]=useState(false);
  const [bulkError,setBulkError]=useState('');
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

  const filtered=filterLeads(rows,filters);
  const filtering=leadFiltersActive(filters);
  const overview=pipelineSummary(filtered);
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
  const totals=stageTotals(filtered,activeStages.map(stage=>({slug:stage.value,label:stage.label,position:stage.position,active:stage.active,kind:stage.kind})));
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
    {key:'currency',label:'Moneda',choices:currencyChoices},
    {key:'probability',label:'Probabilidad (%)',type:'number',integer:true},
    {key:'notes',label:'Próximo paso y notas',type:'textarea',optional:true},
    // Oposicion al contacto (#114): campo del Editor (Si/No), viaja en el mismo guardado.
    {key:'do_not_contact',label:'No contactar',choices:[{value:'no',label:'No'},{value:'yes',label:'Sí · el titular pidió no ser contactado'}],help:'Si es Sí, conservamos el registro de la oportunidad y no iniciamos contacto.'},
  ];
  const newDefaultStage=activeStages.find(stage=>stage.value===newStage);
  const newProbability=newDefaultStage?.kind==='won'?'100':newDefaultStage?.kind==='lost'?'0':'10';
  const defaults:Record<string,string>=row?{...Object.fromEntries(fields.map(field=>[field.key,str(row,field.key)])),do_not_contact:row.do_not_contact===true?'yes':'no'}:{currency:companyCurrency,stage:newDefaultStage?newDefaultStage.value:defaultStage,amount:'0',probability:newProbability,name:'',email:'',phone:'',notes:'',do_not_contact:'no'};

  // Solo las etapas activas aceptan drops: ganar fija 100% y perder 0%; el resto
  // conserva la probabilidad cargada. El movimiento es optimista: la tarjeta
  // cambia de columna al soltar, no vuelve si la recarga falla y se revierte
  // solo si el PATCH falla.
  async function move(event:DragEndEvent){
    await moveLead(String(event.active.id||''),String(event.over?.id||'').replace('stage-',''));
  }
  // Una sola via de movimiento: el arrastre y «Mover a etapa…» (mobile/teclado)
  // pasan por aca, con la misma capacidad y el mismo comportamiento optimista.
  async function moveLead(id:string,value:string){
    const stage=activeStages.find(candidate=>candidate.value===value);
    if(!canEdit||busy||!stage||!id)return;
    const previous=rows;
    const moved=rows.find(item=>String(item.id)===id);
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
    // Entrar a una etapa ganada ofrece convertir a cliente (sin bloquear: se descarta).
    if(stage.kind==='won'&&moved&&!moved.client_id)setConvertOffer(moved);
    await load();
    setBusy(false);
  }
  async function convertLead(target:Row){
    if(busy)return;
    setBusy(true);setError('');
    try{await api(`/api/agency/leads/${target.id}/convert`,{});setEdit(null);setConvertOffer(null);await load();}
    catch(reason){setError(err(reason));setConvertOffer(null);}
    finally{setBusy(false);}
  }
  const leadActions:LeadActions={moveTo:setMoveTarget,convert:setConvertOffer,...(openClient?{openClient:(target:Row)=>openClient(String(target.client_id))}:{})};
  const openCreate=(stage:string)=>{setNewStage(stage);setEdit('new');};

  // Filtros, vista y lote (#182). La etapa elegida deja solo su columna en el
  // tablero; la lista sigue el orden de las etapas. La selección nunca conserva
  // una oportunidad que ya no se ve (borrada o fuera del filtro).
  const changeView=(next:CollectionView)=>{setView(next);setSelected([]);try{localStorage.setItem('scale:pipeline-view',next);}catch{/* Preferencia opcional de interfaz. */}};
  const setFilter=(patch:Partial<LeadFilters>)=>setFilters(current=>({...current,...patch}));
  const stageFilterChoices=[...activeStages.map(stage=>({value:stage.value,label:stage.label})),...looseSlugs.map(value=>({value,label:`${stageLabel(value)} · desactivada`}))];
  const currencies=leadCurrencies(rows);
  const stageOrder=(value:string)=>{const index=activeStages.findIndex(stage=>stage.value===value);return index<0?activeStages.length:index;};
  const listRows=[...filtered].sort((a,b)=>stageOrder(str(a,'stage'))-stageOrder(str(b,'stage')));
  const stageKind=(value:string)=>activeStages.find(stage=>stage.value===value)?.kind;
  const visibleIds=listRows.map(item=>String(item.id));
  const visibleKey=visibleIds.join(',');
  useEffect(()=>{setSelected(current=>{const live=new Set(visibleKey?visibleKey.split(','):[]);const next=current.filter(id=>live.has(id));return next.length===current.length?current:next;});},[visibleKey]);
  const canBulkDelete=canEdit&&canRemoveLead(role);
  const toggleSelected=(id:string)=>{
    if(selected.includes(id)){setSelected(selected.filter(value=>value!==id));return;}
    if(selected.length>=BATCH_LIMITS.leads){notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.leads} oportunidades. Quitá alguna para sumar otra.`});return;}
    setSelected([...selected,id]);
  };
  const selectVisible=()=>{
    const {selection,capped}=limitSelection(visibleIds,BATCH_LIMITS.leads);
    setSelected(selection);
    if(capped)notify({tone:'warning',message:`El lote admite hasta ${BATCH_LIMITS.leads} oportunidades: se seleccionaron las primeras ${BATCH_LIMITS.leads}.`});
  };
  const selectedNames=selected.map(id=>rows.find(item=>String(item.id)===id)).filter((item):item is Row=>Boolean(item)).map(item=>str(item,'name'));
  // No hay endpoint de lote para oportunidades: una llamada por oportunidad,
  // con el mismo PATCH/DELETE que la acción individual. Lo que falla vuelve a
  // su etapa y queda seleccionado para reintentar.
  async function moveMany(value:string){
    const stage=activeStages.find(candidate=>candidate.value===value);
    if(!canEdit||bulkBusy||!stage||!selected.length)return;
    const ids=[...selected];
    const previous=rows;
    const probability=stage.kind==='won'?100:stage.kind==='lost'?0:null;
    setRows(current=>current.map(item=>ids.includes(String(item.id))?{...item,stage:value,...(probability===null?{}:{probability})}:item));
    setBulkBusy(true);setBulkError('');setBulkMove(false);
    const results=await Promise.allSettled(ids.map(id=>api(`/api/agency/leads/${id}`,probability===null?{stage:value}:{stage:value,probability},'PATCH')));
    const failed=ids.filter((_,index)=>results[index].status==='rejected');
    if(failed.length)setRows(current=>current.map(item=>failed.includes(String(item.id))?previous.find(candidate=>String(candidate.id)===String(item.id))||item:item));
    setSelected(failed);
    const moved=ids.length-failed.length;
    notify(!failed.length?{tone:'success',message:`${moved} oportunidad${moved===1?'':'es'} ${moved===1?'movida':'movidas'} a ${stage.label}.`}:moved?{tone:'warning',message:`${moved} de ${ids.length} oportunidades movidas a ${stage.label}. Reintentá con las ${failed.length} restantes.`}:{tone:'error',message:'No se pudo mover ninguna de las oportunidades seleccionadas.'});
    await load();
    setBulkBusy(false);
  }
  async function deleteMany(){
    if(!canBulkDelete||bulkBusy||!selected.length)return;
    const ids=[...selected];
    setBulkBusy(true);setBulkError('');
    const results=await Promise.allSettled(ids.map(id=>api(`/api/agency/leads/${id}`,{},'DELETE')));
    const failed=ids.filter((_,index)=>results[index].status==='rejected');
    const done=ids.filter(id=>!failed.includes(id));
    if(done.length)setRows(current=>current.filter(item=>!done.includes(String(item.id))));
    setSelected(failed);
    if(failed.length){
      const first=results.find(result=>result.status==='rejected') as PromiseRejectedResult|undefined;
      setBulkError(`${done.length} de ${ids.length} oportunidades a la papelera. ${err(first?.reason)}`);
    }else{
      setBulkDelete(false);
      notify({tone:'success',message:`${done.length} oportunidad${done.length===1?'':'es'} movida${done.length===1?'':'s'} a la papelera.`});
    }
    await load();
    setBulkBusy(false);
  }

  return (
    // Encabezado propio (ownsHeader): título del shell + acciones primarias en
    // la misma fila; la toolbar queda para filtros, vista y contador.
    <ListPage aria-label="Pipeline" primaryAction={canEdit?<>
      <Button type="button" variant="ghost" className="max-md:min-h-11" onClick={()=>setStagePanel(true)}><Settings2 aria-hidden="true" size={16}/> Etapas</Button>
      <Button type="button" className="max-md:min-h-11" onClick={()=>openCreate('')}><Plus aria-hidden="true" size={16}/> Nueva oportunidad</Button>
    </>:undefined}>
      {/* Filtros (#182): buscador + etapa + moneda, válidos para el tablero y la
          lista. No hay «responsable» en las oportunidades del API: no se ofrece. */}
      {/* Reorganización IA: el título y las acciones primarias comparten la fila
          del encabezado (ListPage); acá quedan filtros, vista y contador. */}
      <FilterToolbar>
        <SearchField className="w-full sm:w-72 [&>input]:!pl-9 [&>input]:!pr-9 [&>button]:h-11 [&>button]:w-11 md:[&>button]:h-7 md:[&>button]:w-7" type="search" ariaLabel="Buscar oportunidades" value={filters.query} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setFilter({query:event.target.value})} placeholder="Buscar por nombre, contacto o notas…"/>
        <div className="min-w-0">
          <Label htmlFor="pipeline-etapa" className="sr-only">Etapa</Label>
          <Select id="pipeline-etapa" aria-label="Etapa" value={filters.stage} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setFilter({stage:event.target.value})} className="min-w-[10rem]">
            <option value="">Todas las etapas</option>
            {stageFilterChoices.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </Select>
        </div>
        {currencies.length>1||filters.currency?<div className="min-w-0">
          <Label htmlFor="pipeline-moneda" className="sr-only">Moneda</Label>
          <Select id="pipeline-moneda" aria-label="Moneda" value={filters.currency} onChange={(event: React.ChangeEvent<HTMLSelectElement>)=>setFilter({currency:event.target.value})} className="min-w-[8rem]">
            <option value="">Todas las monedas</option>
            {[...new Set([...currencies,...(filters.currency?[filters.currency]:[])])].map(currency=><option key={currency} value={currency}>{currency}</option>)}
          </Select>
        </div>:null}
        <div role="group" aria-label="Vista del pipeline"><ViewSwitch value={view} onChange={changeView}/></div>
        {filtering?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setFilters(NO_LEAD_FILTERS)}>Limpiar filtros</button>:null}
        {view==='list'&&canEdit&&listRows.length?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={selectVisible}>Seleccionar visibles</button>:null}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {state==='ready'||rows.length?<p className="m-0 whitespace-nowrap text-xs tabular-nums text-mute">{filtering?`${filtered.length} de ${rows.length} oportunidades · indicadores y totales del filtro`:`${rows.length} oportunidad${rows.length===1?'':'es'}`}</p>:null}
        </div>
      </FilterToolbar>
      {view==='list'&&canEdit&&selected.length?<BulkBar count={selected.length} busy={bulkBusy} onClear={()=>setSelected([])}>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>setBulkMove(true)}><Move size={14} aria-hidden="true"/>Mover a etapa</button>
        {canBulkDelete?<button type="button" className="secondary danger min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>{setBulkError('');setBulkDelete(true);}}><Trash2 size={14} aria-hidden="true"/>Eliminar</button>:null}
      </BulkBar>:null}
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
      {state==='ready' && !rows.length && !activeStages.length ? <EmptyBlock icon="target" title="Todavía no hay oportunidades." description={canEdit?'Cargá el primer lead con su etapa, valor y probabilidad para verlo en el tablero.':'Cuando el equipo cargue una oportunidad, vas a verla acá con su etapa y valor.'} action={canEdit?<EmptyCta label="Nueva oportunidad" onClick={()=>openCreate('')} icon={<Plus aria-hidden="true" size={16}/>}/>:undefined}/> : null}

      {/* Ventana (#105): el tablero pide una página explícita; cuando el API
          promete más, el contador lo dice y aclara qué cuentan los indicadores. */}
      {windowState.hasMore?<div className="bulk-bar" role="status" aria-live="polite">
        <span className="bulk-count">{windowLabel(windowState.loaded, windowState.total, 'oportunidad', 'oportunidades')} · los indicadores cuentan lo cargado</span>
        <div className="inline-actions bulk-actions">
          <button type="button" className="secondary min-h-11 md:min-h-10" disabled={moreBusy} onClick={()=>void cargarMas()}>{moreBusy?'Cargando…':'Ver más'}</button>
        </div>
      </div>:null}

      {rows.length||(state==='ready'&&activeStages.length)?(view==='list'?<div className="grid min-w-0 gap-2">
        {listRows.length?<ListGrid label="Oportunidades" template={canEdit?LEAD_LIST_EDIT_TEMPLATE:LEAD_LIST_VIEW_TEMPLATE} columns={leadListColumns(canEdit)} minWidthClass={canEdit?'min-w-[64rem]':'min-w-[44rem]'} pinnedActions={canEdit}>
          {listRows.map(item=><LeadListRow key={item.id} row={item} stageLabel={stageLabel(str(item,'stage'))} editable={canEdit} selected={selected.includes(String(item.id))} onSelect={()=>toggleSelected(String(item.id))} edit={()=>setEdit(item)} role={role} canMove={canMove&&stageKind(str(item,'stage'))!==undefined} refresh={load} won={stageKind(str(item,'stage'))==='won'} actions={stageKind(str(item,'stage'))===undefined?undefined:leadActions}/>)}
        </ListGrid>:<EmptyBlock compact icon="target" title={filtering?'Ninguna oportunidad coincide con el filtro.':'Sin oportunidades.'} description={filtering?'Probá con otra búsqueda, etapa o moneda.':undefined} action={filtering?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>setFilters(NO_LEAD_FILTERS)}>Limpiar filtros</button>:undefined}/>}
      </div>:<div className="grid min-w-0 gap-2">
        {/* Indicador fuerte de columnas ocultas (#140): conteo + posición y
            flechas para recorrer el tablero sin adivinar que hay más etapas. */}
        {/* Una sola fila: la ayuda de arrastre y el recorrido de etapas. */}
        {canMove||boardWindow.hiddenTotal>0?<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {canMove?<span className="flex min-w-0 items-center gap-1.5 text-[11px] text-mute" title="Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%."><Move size={13} aria-hidden="true" className="shrink-0"/><span className="truncate">Mover: arrastrá una tarjeta a otra etapa</span></span>:null}
        {boardWindow.hiddenTotal>0?<div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-mute" role="status" aria-live="polite">
          <StateChip tone="info" title={`Hay ${boardWindow.hiddenTotal} ${boardWindow.hiddenTotal===1?'etapa':'etapas'} fuera de vista: usá las flechas o desplazá el tablero.`}>{boardWindow.hiddenTotal} {boardWindow.hiddenTotal===1?'etapa':'etapas'} fuera de vista</StateChip>
          <span className="tabular-nums">Mostrando etapas {boardWindow.from+1}–{boardWindow.to+1} de {boardWindow.total}</span>
          <div className="inline-actions gap-1">
            <button type="button" className="icon-button" disabled={boardWindow.hiddenBefore===0} title="Ver etapa anterior" aria-label="Ver etapa anterior" onClick={()=>scrollBoard(-1)}><ChevronLeft size={16} aria-hidden="true"/></button>
            <button type="button" className="icon-button" disabled={boardWindow.hiddenAfter===0} title="Ver etapa siguiente" aria-label="Ver etapa siguiente" onClick={()=>scrollBoard(1)}><ChevronRight size={16} aria-hidden="true"/></button>
          </div>
        </div>:null}
        </div>:null}
        <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={move} accessibility={accessibility}>
          <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-2">
            {activeStages.filter(stage=>!filters.stage||stage.value===filters.stage).map(stage=><LeadColumn key={stage.value} stage={{value:stage.value,label:stage.label,kind:stage.kind}} actions={leadActions} create={openCreate} rows={filtered.filter(candidate=>str(candidate,'stage')===stage.value)} edit={setEdit} role={role} canMove={canMove} refresh={load} totals={totalsByStage.get(stage.value)}/>)}
            {looseSlugs.filter(value=>!filters.stage||value===filters.stage).map(value=><LeadColumn key={value} stage={{value,label:stageLabel(value)}} actions={leadActions} rows={filtered.filter(candidate=>str(candidate,'stage')===value)} edit={setEdit} role={role} canMove={canMove} refresh={load} totals={totalsByStage.get(value)} readOnly/>)}
          </div>
        </DndContext>
      </div>):null}

      {/* Captación: el tablero completo vive en Métricas; acá un chip con enlace
          (no se embebe la pantalla, #100) y el aviso honesto si falló. */}
      {canSeeGrowth?<p className="flex flex-wrap items-center gap-2 text-[11px] text-mute" role="status">
        <TrendingUp size={14} aria-hidden="true" className="shrink-0"/>
        {metricsState==='error'?'No se pudieron cargar las métricas de captación.':'Captación digital y visitas'}
        {navigate?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={()=>navigate('Métricas')}>Ver Métricas<ArrowUpRight size={12} aria-hidden="true"/></button>:null}
        {metricsState==='error'&&onRetryMetrics?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={onRetryMetrics}>Reintentar</button>:null}
      </p>:null}
      {user?<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>:null}

      {edit&&canEdit?<Dialog title={row?'Editar oportunidad':'Nueva oportunidad'} busy={busy} close={()=>{if(!busy){setEdit(null);setNewStage('');}}}>
        {/* #150: los campos van primero; el aviso legal se resume en una línea
            con enlace y el detalle queda en la ayuda desplegable. */}
        <Editor columns fields={fields} defaults={defaults} save={async values=>{await api(`/api/agency/leads${row?`/${row.id}`:''}`,{...values,do_not_contact:values.do_not_contact==='yes'},row?'PATCH':'POST');await completeSave(()=>setEdit(null),load);}}/>
        <div className="mt-3 grid gap-2">
          <p className="form-note m-0">Datos para gestionar la oportunidad y responderte; no los usamos para otro fin. <a className="text-button" href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">Privacidad</a></p>
          <details className="ops-profile-section">
            <summary>Finalidad y tus derechos</summary>
            <div className="pt-1"><AvisoPrivacidad finalidad={PRIVACY_LEAD_FINALITY} detalle={PRIVACY_LEAD_DETAIL} politicaUrl={PRIVACY_POLICY_URL} derechosUrl={PRIVACY_RIGHTS_URL} compact/></div>
          </details>
        </div>
        {row&&!row.client_id?<div className="mt-3"><Button type="button" variant="outline" disabled={busy} onClick={()=>void convertLead(row)}>Ganado: convertir a cliente</Button></div>:null}
        {row&&row.client_id&&openClient?<div className="mt-3"><Button type="button" variant="outline" disabled={busy} onClick={()=>{const id=String(row.client_id);setEdit(null);openClient(id);}}>Ver cliente vinculado</Button></div>:null}
      </Dialog>:null}

      {bulkMove&&canEdit?<Dialog title={`Mover ${selected.length} oportunidad${selected.length===1?'':'es'} a etapa`} busy={bulkBusy} close={()=>{if(!bulkBusy)setBulkMove(false);}}>
        <MoveStageForm current="" choices={activeStages.map(stage=>({value:stage.value,label:stage.label}))} busy={bulkBusy} onMove={value=>{void moveMany(value);}}/>
      </Dialog>:null}

      {bulkDelete&&canBulkDelete?<ConfirmDialog title="Mover a la papelera" variant="danger" confirmLabel="Confirmar: mover a papelera" busy={bulkBusy} error={bulkError||undefined} onCancel={()=>{if(!bulkBusy){setBulkDelete(false);setBulkError('');}}} onConfirm={()=>void deleteMany()}>
        <p><strong>{selected.length===1?selectedNames[0]:`${selected.length} oportunidades`}</strong></p>
        {selected.length>1?<p>{selectedNames.slice(0,3).join(' · ')}{selected.length>3?` y ${selected.length-3} más`:''}</p>:null}
        <p>Se quitarán de las listas activas y quedarán en la Papelera. Podés restaurarlas después.</p>
      </ConfirmDialog>:null}

      {moveTarget&&canEdit?<Dialog title={`Mover a etapa: ${str(moveTarget,'name')}`} busy={busy} close={()=>{if(!busy)setMoveTarget(null);}}>
        <MoveStageForm current={str(moveTarget,'stage')} choices={activeStages.map(stage=>({value:stage.value,label:stage.label}))} busy={busy} onMove={value=>{const id=String(moveTarget.id);setMoveTarget(null);void moveLead(id,value);}}/>
      </Dialog>:null}

      {convertOffer&&canEdit?<Dialog title="Convertir a cliente" busy={busy} close={()=>{if(!busy)setConvertOffer(null);}}>
        <form className="grid gap-3" onSubmit={event=>{event.preventDefault();void convertLead(convertOffer);}}>
          <p className="m-0 text-sm leading-6 text-mute">{`¿Convertir a ${str(convertOffer,'name')} en cliente? La oportunidad queda vinculada al nuevo cliente.`}</p>
          <SaveActions pending={busy} cancelLabel="Ahora no"><button type="submit" className="primary" disabled={busy}>Convertir a cliente</button></SaveActions>
        </form>
      </Dialog>:null}

      {stagePanel&&canEdit?<Dialog title="Etapas del pipeline" close={()=>setStagePanel(false)}>
        <StageManager stages={stages} reload={async()=>{await Promise.all([loadStages(),load()]);}}/>
      </Dialog>:null}
    </ListPage>
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
      <div className="grid gap-1"><Label htmlFor="stage-position">Orden<OptionalMark/></Label><Input id="stage-position" type="number" min={0} max={9999} value={position} disabled={busy} placeholder="Al final" onChange={(event: React.ChangeEvent<HTMLInputElement>)=>setPosition(event.target.value)}/></div>
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

/** Selector de etapa del «Mover a etapa…» (#182): mismo PATCH que el arrastre. */
function MoveStageForm({current,choices,busy,onMove}:{current:string;choices:{value:string;label:string}[];busy:boolean;onMove:(stage:string)=>void}){
  const [value,setValue]=useState(choices.some(choice=>choice.value===current)?current:'');
  const changed=value!==''&&value!==current;
  return <form className="grid gap-3" onSubmit={event=>{event.preventDefault();if(changed&&!busy)onMove(value);}}>
    <SelectCustom label="Etapa de destino" value={value} choices={choices} disabled={busy} onChange={setValue}/>
    <p className="m-0 text-xs leading-5 text-mute">Ganar fija la probabilidad en 100% y perder en 0%.</p>
    <SaveActions pending={busy}><button type="submit" className="primary" disabled={busy||!changed}>Mover</button></SaveActions>
  </form>;
}
