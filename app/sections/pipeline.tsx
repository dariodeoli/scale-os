"use client";
import dynamic from 'next/dynamic';
import {useEffect,useRef,useState} from 'react';
import {DndContext,pointerWithin,rectIntersection,useDraggable,useDroppable,useSensor,useSensors,PointerSensor,KeyboardSensor,type CollisionDetection,type DragEndEvent} from '@dnd-kit/core';
import {Eye,GripVertical,Plus,Settings2,Target} from 'lucide-react';
import {Button,Input,Label,Select} from 'owncoding-ui';
import {api,Dialog,Editor,type Field} from '../operations';
import {roleCan} from '../capabilities';
import {RemoveRecord} from '../archive-controls';
import {completeSave} from '../save-completion';
import {pipelineSummary,stageTotals,type LeadOpportunity} from '../pipeline-summary';
import {EmptyBlock,ErrorBlock,Kpi,KpiStrip,LoadingBlock,MoneyText,StateChip} from '../ui-v2';
import {useDialogPending} from '../dialog';
import type {MetricEvent,User} from '../workspace-types';

const LiveVisitors=dynamic(()=>import('../live-visitors').then(m=>m.LiveVisitors));
const GrowthDashboard=dynamic(()=>import('../growth-dashboard').then(m=>m.GrowthDashboard));

// Pipeline comercial (SOS-COM, campaña #41 / spec #43 §2).
// Rediseño v2: KPIs y totales por etapa con pipeline-summary (ponderado y
// abierto por moneda), tablero por estado con tarjetas propias (excepción
// kanban del contrato), alta/edición y administración de etapas, con estados
// de carga/vacío/error. Los datos salen de las mismas rutas del API.
type PipelineSectionProps = {
  user: User | null;
  metrics: MetricEvent[];
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
  const probability=Number(row.probability)||0;
  return <article ref={drag.setNodeRef} style={{opacity:drag.isDragging?.4:1}} className="grid gap-2 rounded-lg border border-ink-600 bg-ink-900 p-3">
    <header className="flex items-start justify-between gap-2">
      <b className="min-w-0 text-[13px] font-semibold text-fore [overflow-wrap:anywhere]" title={str(row,'name')}>{str(row,'name')}</b>
      {canMove?<button type="button" className="grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore active:cursor-grabbing md:h-7 md:w-7" style={{touchAction:'none'}} title={`Mover ${str(row,'name')}`} aria-label={`Mover ${str(row,'name')}`} {...drag.attributes} {...drag.listeners}><GripVertical size={14}/></button>:null}
    </header>
    <MoneyText valor={str(row,'amount')||'0'} currency={str(row,'currency')||'PYG'} className="text-sm text-fore"/>
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <StateChip tone={probability>=75?'ok':probability>=40?'warn':'mute'} title={`Probabilidad ${probability}%`}>{probability}%</StateChip>
      {str(row,'email')?<span className="min-w-0 text-mute [overflow-wrap:anywhere]" title={str(row,'email')}>{str(row,'email')}</span>:null}
    </div>
    {str(row,'notes')?<p className="text-[11px] leading-4 text-mute [overflow-wrap:anywhere]">{str(row,'notes')}</p>:null}
    <footer className="flex flex-wrap items-center justify-end gap-1 border-t border-ink-600 pt-2">
      <Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-8" onClick={edit}><Eye aria-hidden="true" size={14}/> Ver oportunidad</Button>
      <RemoveRecord kind="leads" id={String(row.id)} name={str(row,'name')} role={role} done={refresh}/>
    </footer>
  </article>;
}

function LeadColumn({stage,rows,edit,role,canMove,refresh,readOnly=false}:{stage:{value:string;label:string};rows:Row[];edit:(row:Row)=>void;role:string;canMove:boolean;refresh:()=>Promise<void>;readOnly?:boolean}){
  const drop=useDroppable({id:`stage-${stage.value}`,disabled:readOnly});
  const currencies=[...new Set(rows.map(row=>str(row,'currency')||'PYG'))];
  return <section ref={drop.setNodeRef} aria-label={`${stage.label} · ${rows.length} oportunidades`} className={`grid min-w-[15rem] flex-1 content-start gap-2 rounded-xl border p-3 ${drop.isOver?'border-fono/60 bg-fono/10':'border-ink-600 bg-ink-800'}`}>
    <header className="flex items-baseline justify-between gap-2">
      <h3 className="text-sm font-bold text-fore">{stage.label}{readOnly?' · desactivada':''}</h3>
      <span className="text-xs tabular-nums text-mute">{rows.length}</span>
    </header>
    {currencies.length?<div className="grid gap-0.5 text-[11px] tabular-nums text-mute">{currencies.map(currency=><span key={currency} className="whitespace-nowrap"><MoneyText valor={rows.filter(row=>(str(row,'currency')||'PYG')===currency).reduce((sum,row)=>sum+Number(row.amount)*Number(row.probability)/100,0)} currency={currency}/> ponderado</span>)}</div>:null}
    {rows.map(row=><LeadCard key={row.id} row={row} edit={()=>edit(row)} role={role} canMove={canMove&&!readOnly} refresh={refresh}/>)}
    {!rows.length?<p className="text-xs text-mute">Sin oportunidades.</p>:null}
  </section>;
}

export function PipelineSection({user, metrics}: PipelineSectionProps){
  const [rows,setRows]=useState<Row[]>([]);
  const [stages,setStages]=useState<Stage[]>(fallbackStages);
  const [state,setState]=useState<LeadsState>('loading');
  const [edit,setEdit]=useState<Row|'new'|null>(null);
  const [stagePanel,setStagePanel]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const stagesLoaded=useRef(false);
  const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
  const role=user?.role||'viewer';
  const canEdit=roleCan(role,'commercial.manage');
  // El asa de arrastre comparte la capacidad del PATCH: nadie ve un asa que no
  // pueda soltar (antes `finance`/`sales`/`collaborator` divergían de la matriz).
  const canMove=canEdit;
  const canSeeGrowth=['owner','admin'].includes(role);

  async function load(){
    try{
      const data=await api<{records:Row[]}>('/api/agency/leads');
      setRows(Array.isArray(data.records)?data.records:[]);
      setState('ready');
    }catch{setState('error');}
  }
  // Una lectura de etapas fallida conserva el fallback; una recarga fallida
  // preserva las etapas ya conocidas.
  async function loadStages(){
    try{
      const data=await api<{stages:RawRow[]}>('/api/agency/pipeline-stages');
      setStages(data.stages.map(normalizeStage));
      stagesLoaded.current=true;
    }catch{if(!stagesLoaded.current)setStages(fallbackStages);}
  }
  useEffect(()=>{void load();void loadStages();},[]);

  const overview=pipelineSummary(rows);
  const activeStages=[...stages].filter(stage=>stage.active).sort((a,b)=>a.position-b.position||a.value.localeCompare(b.value));
  const stageLabel=(value:string)=>stages.find(stage=>stage.value===value)?.label||value;
  const looseSlugs=[...new Set(rows.map(row=>str(row,'stage')).filter(value=>Boolean(value)&&!activeStages.some(stage=>stage.value===value)))];
  const totals=stageTotals(rows,activeStages.map(stage=>({slug:stage.value,label:stage.label,position:stage.position,active:stage.active,kind:stage.kind})));
  const row=edit&&edit!=='new'?edit:null;
  const currentStage=row?str(row,'stage'):'';
  const stageChoices=[...activeStages.map(stage=>({value:stage.value,label:stage.label})),...(currentStage&&!activeStages.some(stage=>stage.value===currentStage)?[{value:currentStage,label:`${stageLabel(currentStage)} · desactivada`}]:[])];
  const defaultStage=activeStages.find(stage=>stage.kind==='open')?.value||'lead';
  const fields:Field[]=[
    {key:'name',label:'Empresa o prospecto'},
    {key:'email',label:'Correo',type:'email',optional:true},
    {key:'phone',label:'Teléfono',type:'phone',optional:true},
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
    <section className="grid gap-4" aria-label="Pipeline comercial">
      <KpiStrip aria-label="Resumen del pipeline">
        <Kpi label="Oportunidades abiertas" valor={overview.open} destacado hint="Sin ganar ni perder"/>
        <Kpi label="Ganadas" valor={overview.won} hint="Conversiones cerradas"/>
        <Kpi label="Consultas web" valor={overview.web} hint="Origen: landing Scale OS"/>
        <Kpi
          label="Valor abierto"
          valor={Object.entries(overview.amounts).length?<span className="flex flex-wrap items-baseline gap-2">{Object.entries(overview.amounts).map(([currency,value])=><MoneyText key={currency} valor={value} currency={currency}/>)}</span>:'Sin oportunidades abiertas'}
          hint="Sin convertir monedas"
        />
      </KpiStrip>

      {error?<ErrorBlock title="No se pudo completar la operación." description={error} onRetry={()=>void load()}/>:null}

      {rows.length?<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Totales por etapa">
        {totals.map(entry=><article key={entry.stage} className="rounded-xl border border-ink-600 bg-ink-800 p-4">
          <h3 className="text-sm font-bold text-fore [overflow-wrap:anywhere]">{entry.label}</h3>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-fore">{entry.count}</p>
          <p className="text-[11px] text-mute">oportunidades</p>
          <div className="mt-2 grid gap-0.5 text-[11px] tabular-nums">
            {Object.entries(entry.weighted).map(([currency,value])=><span key={`w-${currency}`} className="whitespace-nowrap text-fore"><MoneyText valor={value} currency={currency}/> ponderado</span>)}
            {Object.entries(entry.open).map(([currency,value])=><span key={`o-${currency}`} className="whitespace-nowrap text-mute"><MoneyText valor={value} currency={currency}/> abierto</span>)}
            {!Object.keys(entry.open).length?<span className="text-mute">Sin montos cargados</span>:null}
          </div>
        </article>)}
      </div>:null}

      {canEdit?<div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={()=>setStagePanel(true)}><Settings2 aria-hidden="true" size={16}/> Etapas</Button>
        <Button type="button" onClick={()=>setEdit('new')}><Plus aria-hidden="true" size={16}/> Nueva oportunidad</Button>
      </div>:null}

      {state==='loading' && !rows.length ? <LoadingBlock label="Cargando oportunidades…" lines={4}/> : null}
      {state==='error' && !rows.length ? <ErrorBlock title="No se pudieron cargar las oportunidades." description="Revisá la conexión y volvé a intentar; el tablero conserva las etapas conocidas." onRetry={()=>void load()}/> : null}
      {state==='ready' && !rows.length ? <EmptyBlock icon="target" title="Todavía no hay oportunidades." description={canEdit?'Cargá el primer lead con su etapa, valor y probabilidad para verlo en el tablero.':'Cuando el equipo cargue una oportunidad, vas a verla acá con su etapa y valor.'}/> : null}

      {rows.length?<div className="grid gap-2">
        <div className="flex items-center gap-2 text-[11px] text-mute"><Target size={14}/>Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%.</div>
        <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={move}>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {activeStages.map(stage=><LeadColumn key={stage.value} stage={{value:stage.value,label:stage.label}} rows={rows.filter(candidate=>str(candidate,'stage')===stage.value)} edit={setEdit} role={role} canMove={canMove} refresh={load}/>)}
            {looseSlugs.map(value=><LeadColumn key={value} stage={{value,label:stageLabel(value)}} rows={rows.filter(candidate=>str(candidate,'stage')===value)} edit={setEdit} role={role} canMove={canMove} refresh={load} readOnly/>)}
          </div>
        </DndContext>
      </div>:null}

      {canSeeGrowth?<GrowthDashboard events={metrics}/>:null}
      {user?<LiveVisitors organizationId={String(user.organization_id)} role={user.role} demo={!!user.demo_owner_user_id||user.organization_slug==='scale-demo-controles-20260908'}/>:null}

      {edit&&canEdit?<Dialog title={row?'Editar oportunidad':'Nueva oportunidad'} busy={busy} close={()=>{if(!busy)setEdit(null);}}>
        <Editor columns fields={fields} defaults={defaults} save={async values=>{await api(`/api/agency/leads${row?`/${row.id}`:''}`,values,row?'PATCH':'POST');await completeSave(()=>setEdit(null),load);}}/>
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
    {error?<p role="alert" className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-xs text-bad">{error}</p>:null}
    {notice?<p role="status" className="text-xs font-semibold text-ok">{notice}</p>:null}
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
