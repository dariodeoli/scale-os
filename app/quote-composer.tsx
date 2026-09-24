"use client";
// Rediseño v2 (campaña #41 / spec #43 §4-5): compositor de presupuestos y
// planes con objetos de la librería (Input/Select/MoneyInput/Switch/Button),
// campos por tipo y vista previa. Esquemas, totales y requests viven en
// ./quote-composer-data (puros); el guardado sigue con SaveActions legado.
import {validCurrency} from "./currencies";
import {useCompanyCurrency} from './currency-provider';
import {Button,FormField,Input,MoneyInput,Select,Switch,Textarea,Aviso} from 'owncoding-ui';
import {CurrencyField,MoneyText} from './ui-v2';
import {SaveActions} from './save-actions';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {useEffect,useState} from 'react';
import {useForm,useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {DndContext,pointerWithin,rectIntersection,useDraggable,useDroppable,DragEndEvent,PointerSensor,KeyboardSensor,useSensor,useSensors,type CollisionDetection} from '@dnd-kit/core';
import {ArrowDown,ArrowUp,GripVertical,Plus,X} from 'lucide-react';
import {api} from './operations';
import {SECTION_TYPE_LABELS,TAX_RATE_CHOICES,initialQuoteSections,normalizeQuoteItems,quoteRequest,quoteSchema,quoteTotals,type QuoteClientOption,type QuoteMode,type QuotePlanRecord,type QuoteSection,type QuoteValues} from './quote-composer-data';
// Los esquemas, totales y requests viven en ./quote-composer-data (puros); se
// reexporta lo que otros módulos/tests ya importaban de acá.
export {quoteSchema,sectionSchema,normalizeQuoteItems,quoteTotals,quoteRequest} from './quote-composer-data';
export type {QuoteItemDraft,QuoteSection,QuoteValues,QuoteMode} from './quote-composer-data';

type Row={id:string;[key:string]:unknown};

// Ítem/columna bajo el puntero (predecible al arrastrar); el teclado, sin
// puntero, cae al rectángulo que se cruza.
const detectCollision:CollisionDetection=(args)=>{const within=pointerWithin(args);return within.length?within:rectIntersection(args);};

function ItemShell({id,title,canReorder=true,children}:{id:string;title?:string;canReorder?:boolean;children:React.ReactNode}){
 const drag=useDraggable({id,disabled:!canReorder}),drop=useDroppable({id});
 return <div ref={node=>{drag.setNodeRef(node);drop.setNodeRef(node);}} className={`grid gap-3 rounded-xl border bg-ink-800 p-3 ${drop.isOver?'border-fono/60':'border-ink-600'}`} style={{opacity:drag.isDragging?.5:1}}>
  <div className="flex items-start gap-2">
   {canReorder&&<button type="button" className="mt-0.5 grid h-11 w-11 shrink-0 cursor-grab place-items-center rounded-lg text-mute transition hover:bg-ink-700 hover:text-fore active:cursor-grabbing md:h-9 md:w-9" title="Reordenar ítem" aria-label="Reordenar ítem" style={{touchAction:'none'}} {...drag.attributes} {...drag.listeners}><GripVertical size={16}/></button>}
   <div className="grid min-w-0 flex-1 gap-3">{title?<b className="text-sm font-bold text-fore">{title}</b>:null}{children}</div>
  </div>
 </div>;
}

export function QuoteComposer({mode,record,done,canReorder=true}:{mode:QuoteMode;record?:Row|null;done:()=>void|Promise<void>;canReorder?:boolean}){
 const {currency:defaultCurrency}=useCompanyCurrency();
 const [clients,setClients]=useState<QuoteClientOption[]>([]),[plans,setPlans]=useState<QuotePlanRecord[]>([]),[error,setError]=useState('');
 const form=useForm<QuoteValues>({resolver:zodResolver(quoteSchema),defaultValues:{title:String(record?.title||record?.name||''),clientId:String(record?.client_id||''),currency:validCurrency(record?.currency??defaultCurrency),tax_rate:String(record?.tax_rate??'.1'),notes:String(record?.notes||''),valid_until:String(record?.valid_until||'').slice(0,10),items:normalizeQuoteItems(record?.items),sections:Array.isArray(record?.sections)?record.sections as QuoteSection[]:initialQuoteSections()}});
 const array=useFieldArray({control:form.control,name:'items'}),v=form.watch();
 const sections=useFieldArray({control:form.control,name:'sections'});
 const sensors=useSensors(useSensor(PointerSensor,{activationConstraint:{distance:6}}),useSensor(KeyboardSensor));
 useEffect(()=>{if(mode!=='plan')void Promise.all([api<{clients:QuoteClientOption[]}>('/api/agency/clients'),api<{records:QuotePlanRecord[]}>('/api/agency/plans')]).then(([c,p])=>{setClients(c.clients);setPlans(p.records.filter(x=>x.active!==false));}).catch(e=>setError(e instanceof Error?e.message:'No se pudieron cargar los planes'));},[mode]);
 const {subtotal,total}=quoteTotals(v.items,v.tax_rate);
 function move(e:DragEndEvent){const from=array.fields.findIndex(f=>f.id===e.active.id),to=array.fields.findIndex(f=>f.id===e.over?.id);if(from>=0&&to>=0&&from!==to)array.move(from,to);}
 const submission=useSingleFlightSubmit(form.handleSubmit(async values=>{setError('');try{
   if(mode==='create'&&!values.clientId)throw new Error('Elegí un cliente');
   const request=quoteRequest(mode,record?.id,values);
   await api(request.path,request.body,request.method);
   await done();
  }catch(e){setError(e instanceof Error?e.message:'No se pudo guardar');}}));
 return <form className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]" noValidate onSubmit={submission.onSubmit}>
 <div className="grid content-start gap-4">
  <section className="grid gap-3">
   <FormField label={mode==='plan'?'Nombre del plan':'Título del presupuesto'} htmlFor="quote-title"><Input id="quote-title" maxLength={120} {...form.register('title')}/></FormField>
   <div className="flex flex-wrap items-end gap-3">
    {mode==='create'&&<div className="min-w-0 flex-1 basis-64"><FormField label="Cliente" htmlFor="quote-client"><Select id="quote-client" value={v.clientId} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>form.setValue('clientId',event.target.value)}><option value="">Elegí un cliente</option>{clients.map(client=><option key={String(client.id)} value={String(client.id)}>{String(client.name)}</option>)}</Select></FormField></div>}
    {mode!=='plan'&&plans.length>0&&<div className="min-w-0 flex-1 basis-64"><FormField label="Usar un plan como base (reemplaza los ítems actuales)" htmlFor="quote-plan-base"><Select id="quote-plan-base" value="" onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>{const plan=plans.find(item=>String(item.id)===event.target.value);if(plan){array.replace(normalizeQuoteItems(plan.items));form.setValue('currency',validCurrency(plan.currency));form.setValue('title',String(plan.name));form.setValue('notes',String(plan.notes||''));}}}><option value="">Sin plan base</option>{plans.map(plan=><option key={String(plan.id)} value={String(plan.id)}>{String(plan.name)}</option>)}</Select></FormField></div>}
    <CurrencyField id="quote-currency" label="Moneda" value={v.currency} onChange={value=>form.setValue('currency',validCurrency(value))}/>
    <div className="w-24"><FormField label="IVA" htmlFor="quote-tax"><Select id="quote-tax" value={String(Number(v.tax_rate))} onChange={(event: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>)=>form.setValue('tax_rate',event.target.value)}>{TAX_RATE_CHOICES.map(choice=><option key={choice.value} value={choice.value}>{choice.label}</option>)}</Select></FormField></div>
   </div>
  </section>
  <section className="grid gap-3" aria-label="Ítems del documento">
   <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={move}>{array.fields.map((field,index)=><ItemShell key={field.id} id={field.id} canReorder={canReorder}>
    <FormField label="Descripción" htmlFor={`quote-item-description-${index}`}><Input id={`quote-item-description-${index}`} {...form.register(`items.${index}.description`)}/></FormField>
    <div className="flex flex-wrap gap-3">
     <FormField label="Cantidad" htmlFor={`quote-item-quantity-${index}`}><Input id={`quote-item-quantity-${index}`} className="w-24" inputMode="decimal" autoComplete="off" {...form.register(`items.${index}.quantity`)}/></FormField>
     <FormField label="Precio sin IVA" htmlFor={`quote-item-price-${index}`}><MoneyInput id={`quote-item-price-${index}`} className="w-44" currency={v.currency} value={v.items[index]?.unitPrice||''} onValueChange={(value: unknown)=>form.setValue(`items.${index}.unitPrice`,String(value))}/></FormField>
    </div>
    <div className="flex flex-wrap gap-2">
     <Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-9" disabled={index===0} onClick={()=>array.move(index,index-1)}><ArrowUp size={14}/>Subir</Button>
     <Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-9" disabled={index===array.fields.length-1} onClick={()=>array.move(index,index+1)}><ArrowDown size={14}/>Bajar</Button>
     <Button type="button" variant="ghost" className="h-11 px-2 text-xs text-bad hover:bg-bad/10 hover:text-bad md:h-9" disabled={array.fields.length===1} onClick={()=>array.remove(index)}><X size={12}/>Quitar</Button>
    </div>
   </ItemShell>)}</DndContext>
   <div><Button type="button" variant="outline" onClick={()=>array.append({description:'',quantity:'1',unitPrice:'0'})}><Plus size={14}/>Agregar ítem</Button></div>
  </section>
  <section className="flex flex-wrap gap-3">
   {mode!=='plan'&&<div className="w-40"><FormField label="Válido hasta" htmlFor="quote-valid-until"><Input id="quote-valid-until" type="date" {...form.register('valid_until')}/></FormField></div>}
   <div className="min-w-0 flex-1 basis-64"><FormField label="Condiciones (opcional)" htmlFor="quote-notes"><Textarea id="quote-notes" rows={3} maxLength={2000} {...form.register('notes')}/></FormField></div>
  </section>
  {mode!=='plan'&&<section className="grid gap-3" aria-label="Secciones del documento">
   <div><h3 className="text-sm font-bold text-fore">Secciones del documento</h3><p className="mt-1 text-xs leading-5 text-mute">Arrastrá o usá Subir/Bajar. Detalle y totales son obligatorios; podés ocultar las otras secciones.</p></div>
   <DndContext sensors={sensors} collisionDetection={detectCollision} onDragEnd={e=>{const from=sections.fields.findIndex(f=>f.id===e.active.id),to=sections.fields.findIndex(f=>f.id===e.over?.id);if(from>=0&&to>=0)sections.move(from,to);}}>{sections.fields.map((field,index)=><ItemShell key={field.id} id={field.id} title={SECTION_TYPE_LABELS[field.type]} canReorder={canReorder}>
    {field.type==='text'&&<><FormField label="Título" htmlFor={`quote-section-title-${index}`}><Input id={`quote-section-title-${index}`} {...form.register(`sections.${index}.title`)}/></FormField><FormField label="Contenido" htmlFor={`quote-section-body-${index}`}><Textarea id={`quote-section-body-${index}`} rows={4} {...form.register(`sections.${index}.body`)}/></FormField></>}
    {['items','totals'].includes(field.type)
     ?<p className="text-xs font-medium text-mute">Siempre visible</p>
     :<label htmlFor={`quote-section-enabled-${index}`} className="flex min-h-11 cursor-pointer items-center gap-3 md:min-h-0"><Switch id={`quote-section-enabled-${index}`} checked={Boolean(v.sections[index]?.enabled)} onChange={(event: React.ChangeEvent<HTMLInputElement>)=>form.setValue(`sections.${index}.enabled`,event.target.checked)} ariaLabel={`Mostrar sección ${SECTION_TYPE_LABELS[field.type]}`}/><span className="text-[11px] font-medium uppercase tracking-wider text-mute">Mostrar sección</span></label>}
    <div className="flex flex-wrap gap-2">
     <Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-9" disabled={index===0} onClick={()=>sections.move(index,index-1)}><ArrowUp size={14}/>Subir</Button>
     <Button type="button" variant="ghost" className="h-11 px-2 text-xs md:h-9" disabled={index===sections.fields.length-1} onClick={()=>sections.move(index,index+1)}><ArrowDown size={14}/>Bajar</Button>
     {field.type==='text'&&<Button type="button" variant="ghost" className="h-11 px-2 text-xs text-bad hover:bg-bad/10 hover:text-bad md:h-9" onClick={()=>sections.remove(index)}><X size={14}/>Quitar</Button>}
    </div>
   </ItemShell>)}</DndContext>
   <div><Button type="button" variant="outline" disabled={sections.fields.length>=24} onClick={()=>sections.append({type:'text',title:'Nueva sección',body:'',enabled:true})}>Agregar sección de texto</Button></div>
  </section>}
 </div>
 <section className="grid content-start gap-3 rounded-xl border border-ink-600 bg-ink-900 p-4" aria-label="Vista previa del documento">
  <p className="font-mono text-[10px] uppercase tracking-[.13em] text-mute">Vista previa</p>
  <h2 className="text-lg font-bold text-fore">{v.title||'Tu propuesta'}</h2>
  {v.sections.filter(section=>section.enabled).map((section,index)=><section key={index} className="grid gap-2 text-sm text-fore">
   {section.type==='items'?v.items.map((item,i)=><div className="flex items-start justify-between gap-3 border-b border-ink-600/60 pb-2" key={i}><span className="min-w-0 [overflow-wrap:anywhere]">{item.description||'Descripción'}<small className="mt-0.5 block text-[11px] text-mute">{item.quantity||0} unidades</small></span><MoneyText valor={(Number(item.quantity)||0)*(Number(item.unitPrice)||0)} currency={v.currency}/></div>)
    :section.type==='totals'?<div className="grid gap-1"><p className="text-xs text-mute">Subtotal: <MoneyText valor={subtotal} currency={v.currency}/></p><p className="text-xs text-mute">IVA: <MoneyText valor={total-subtotal} currency={v.currency}/></p><h3 className="text-base font-bold">Total: <MoneyText valor={total} currency={v.currency}/></h3></div>
    :section.type==='notes'?<p className="whitespace-pre-wrap text-xs leading-5 text-mute">{v.notes}</p>
    :section.type==='meta'?<p className="text-xs text-mute">{clients.find(client=>String(client.id)===v.clientId)?.name as string||record?.client_name as string||''}{v.valid_until?` · Válido hasta ${v.valid_until}`:''}</p>
    :<><h3 className="text-sm font-bold">{section.title}</h3><p className="whitespace-pre-wrap text-xs leading-5 text-mute">{section.body}</p></>}
  </section>)}
 </section>
 {Object.keys(form.formState.errors).length>0&&<div className="lg:col-span-2"><Aviso tono="error" role="alert" compact>Revisá el título y los ítems: descripción, cantidad positiva e importe válido.</Aviso></div>}
 {error&&<div className="lg:col-span-2"><Aviso tono="error" role="alert" compact>{error}</Aviso></div>}
 <div className="lg:col-span-2"><SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>{submission.pending?'Guardando…':'Guardar'}</button></SaveActions></div>
 </form>;
}
