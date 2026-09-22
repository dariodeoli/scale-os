"use client";
import {currencyCodes,currencyChoices,validCurrency} from "./currencies";
import {useCompanyCurrency} from './currency-provider';
import {SaveActions} from './save-actions';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {useEffect,useState} from 'react';
import {useForm,useFieldArray} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {DndContext,useDraggable,useDroppable,DragEndEvent,PointerSensor,KeyboardSensor,useSensor,useSensors} from '@dnd-kit/core';
import {ArrowDown,ArrowUp,GripVertical,Plus,X} from 'lucide-react';
import {api,money} from './operations';
import {SelectCustom,AmountInput} from './profile-controls';
import {SECTION_TYPE_LABELS,TAX_RATE_CHOICES,initialQuoteSections,normalizeQuoteItems,quoteRequest,quoteSchema,quoteTotals,type QuoteClientOption,type QuoteMode,type QuotePlanRecord,type QuoteSection,type QuoteValues} from './quote-composer-data';
// Los esquemas, totales y requests viven en ./quote-composer-data (puros); se
// reexporta lo que otros módulos/tests ya importaban de acá.
export {quoteSchema,sectionSchema,normalizeQuoteItems,quoteTotals,quoteRequest} from './quote-composer-data';
export type {QuoteItemDraft,QuoteSection,QuoteValues,QuoteMode} from './quote-composer-data';
type Row={id:string;[key:string]:unknown};
function ItemShell({id,children,canReorder=true}:{id:string;children:React.ReactNode;canReorder?:boolean}){const drag=useDraggable({id,disabled:!canReorder}),drop=useDroppable({id});return <div className={`quote-item ${drop.isOver?'suite-over':''}`} ref={node=>{drag.setNodeRef(node);drop.setNodeRef(node);}} style={{opacity:drag.isDragging?.5:1}}>{canReorder&&<button type="button" className="icon-button" title="Reordenar ítem" aria-label="Reordenar ítem" {...drag.attributes} {...drag.listeners}><GripVertical size={16}/></button>}<div>{children}</div></div>;}
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
 return <form className="quote-composer" noValidate onSubmit={submission.onSubmit}>
 <div className="quote-layout"><section className="form-stack">
 <label>{mode==='plan'?'Nombre del plan':'Título del presupuesto'}<input maxLength={120} {...form.register('title')}/></label>
 {mode==='create'&&<SelectCustom label="Cliente" value={v.clientId} choices={clients.map(c=>({value:String(c.id),label:String(c.name)}))} onChange={value=>form.setValue('clientId',value)}/>}
 {mode!=='plan'&&plans.length>0&&<SelectCustom label="Usar un plan como base (reemplaza los ítems actuales)" value="" choices={plans.map(p=>({value:String(p.id),label:String(p.name)}))} onChange={value=>{const p=plans.find(p=>String(p.id)===value);if(p){array.replace(normalizeQuoteItems(p.items));form.setValue('currency',validCurrency(p.currency));form.setValue('title',String(p.name));form.setValue('notes',String(p.notes||''));}}}/>}
 <div className="ops-form-grid"><SelectCustom label="Moneda" value={v.currency} choices={currencyChoices} onChange={value=>form.setValue('currency',validCurrency(value))}/><SelectCustom label="IVA" value={String(Number(v.tax_rate))} choices={TAX_RATE_CHOICES} onChange={value=>form.setValue('tax_rate',value)}/></div>
 <DndContext sensors={sensors} onDragEnd={move}>{array.fields.map((field,index)=><ItemShell key={field.id} id={field.id} canReorder={canReorder}><label>Descripción<input {...form.register(`items.${index}.description`)}/></label><div className="ops-form-grid"><label>Cantidad<input inputMode="decimal" autoComplete="off" {...form.register(`items.${index}.quantity`)}/></label><label>Precio sin IVA<AmountInput value={v.items[index]?.unitPrice||''} currency={v.currency} onChange={value=>form.setValue(`items.${index}.unitPrice`,value)}/></label></div><div className="inline-actions"><button type="button" className="text-button" disabled={index===0} onClick={()=>array.move(index,index-1)}><ArrowUp size={14}/>Subir</button><button type="button" className="text-button" disabled={index===array.fields.length-1} onClick={()=>array.move(index,index+1)}><ArrowDown size={14}/>Bajar</button><button type="button" className="text-button danger" disabled={array.fields.length===1} onClick={()=>array.remove(index)}><X size={12}/>Quitar</button></div></ItemShell>)}</DndContext>
 <button type="button" className="secondary" onClick={()=>array.append({description:'',quantity:'1',unitPrice:'0'})}><Plus size={14}/>Agregar ítem</button>
 {mode!=='plan'&&<label>Válido hasta<input type="date" {...form.register('valid_until')}/></label>}<label>Condiciones (opcional)<textarea maxLength={2000} {...form.register('notes')}/></label>
 {mode!=='plan'&&<><h3>Secciones del documento</h3><p className="form-note">Arrastrá o usá Subir/Bajar. Detalle y totales son obligatorios; podés ocultar las otras secciones.</p><DndContext sensors={sensors} onDragEnd={e=>{const from=sections.fields.findIndex(f=>f.id===e.active.id),to=sections.fields.findIndex(f=>f.id===e.over?.id);if(from>=0&&to>=0)sections.move(from,to);}}>{sections.fields.map((field,index)=><ItemShell key={field.id} id={field.id} canReorder={canReorder}><b>{SECTION_TYPE_LABELS[field.type]}</b>{field.type==='text'&&<><label>Título<input {...form.register(`sections.${index}.title`)}/></label><label>Contenido<textarea rows={4} {...form.register(`sections.${index}.body`)}/></label></>}{['items','totals'].includes(field.type)?<small>Siempre visible</small>:<label><input type="checkbox" {...form.register(`sections.${index}.enabled`)}/>Mostrar sección</label>}<div className="inline-actions"><button type="button" className="text-button" disabled={index===0} onClick={()=>sections.move(index,index-1)}><ArrowUp size={14}/>Subir</button><button type="button" className="text-button" disabled={index===sections.fields.length-1} onClick={()=>sections.move(index,index+1)}><ArrowDown size={14}/>Bajar</button>{field.type==='text'&&<button type="button" className="text-button danger" onClick={()=>sections.remove(index)}><X size={14}/>Quitar</button>}</div></ItemShell>)}</DndContext><button type="button" className="secondary" disabled={sections.fields.length>=24} onClick={()=>sections.append({type:'text',title:'Nueva sección',body:'',enabled:true})}>Agregar sección de texto</button></>}
 </section><aside className="quote-preview"><p className="eyebrow">VISTA PREVIA</p><h2>{v.title||'Tu propuesta'}</h2>{v.sections.filter(s=>s.enabled).map((section,index)=><section key={index}>{section.type==='items'?v.items.map((item,i)=><div className="payment-row" key={i}><span>{item.description||'Descripción'}<small>{item.quantity||0} unidades</small></span><b>{money((Number(item.quantity)||0)*(Number(item.unitPrice)||0),v.currency)}</b></div>):section.type==='totals'?<><p>Subtotal: {money(subtotal,v.currency)}</p><p>IVA: {money(total-subtotal,v.currency)}</p><h3>Total: {money(total,v.currency)}</h3></>:section.type==='notes'?<p className="quote-notes">{v.notes}</p>:section.type==='meta'?<p>{clients.find(c=>String(c.id)===v.clientId)?.name as string||record?.client_name as string||''}{v.valid_until?` · Válido hasta ${v.valid_until}`:''}</p>:<><h3>{section.title}</h3><p className="quote-notes">{section.body}</p></>}</section>)}</aside></div>
 {Object.keys(form.formState.errors).length>0&&<p role="alert" className="error">Revisá el título y los ítems: descripción, cantidad positiva e importe válido.</p>}{error&&<p role="alert" className="error">{error}</p>}<SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>{submission.pending?'Guardando…':'Guardar'}</button></SaveActions>
 </form>;
}
