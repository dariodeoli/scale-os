"use client";
import {Notice as Aviso} from './ui/notice';

// «Asignar plan» del lote de clientes (#184 C5): elige un plan de servicio y lo
// asigna a cada cliente seleccionado (un PATCH por cliente; sin endpoint de lote).
import {useEffect,useState} from 'react';

import {api} from './operations';
import {Dialog,FormActions} from './dialog';
import {SelectCustom} from './profile-controls';
import {notify} from './feedback';
import {assignServicePlan,loadServicePlans} from './client-bulk';

export function AssignPlanDialog({ids,close,onDone}:{ids:string[];close:() => void;onDone:() => Promise<void>|void}){
  const [plans,setPlans]=useState<{id:string;name:string}[]|null>(null),[planId,setPlanId]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let alive=true;loadServicePlans(api,ids[0]).then(list=>{if(alive)setPlans(list);}).catch(cause=>{if(alive){setPlans([]);setError(cause instanceof Error?cause.message:'No se pudieron cargar los planes.');}});return()=>{alive=false;};},[ids]);
  async function run(){
    if(busy||!planId)return;
    setBusy(true);setError('');
    const result=await assignServicePlan(api,ids,planId);
    setBusy(false);
    if(result.updated)notify({tone:'success',message:`Plan asignado a ${result.updated} ${result.updated===1?'cliente':'clientes'}.`});
    if(result.failed.length){setError(`No se pudo asignar a ${result.failed.length} ${result.failed.length===1?'cliente':'clientes'}: ${result.failed[0].message}`);}
    try{await onDone();}catch{/* el aviso de error ya cubre el fallo; la lista se actualiza al recargar */}
    if(!result.failed.length)close();
  }
  return <Dialog title="Asignar plan de servicio" close={close}>
    <p className="form-note">Se asigna a {ids.length} {ids.length===1?'cliente seleccionado':'clientes seleccionados'}. Cambia solo el plan de servicio; el precio y el pago se editan desde cada cliente.</p>
    {plans===null?<p role="status">Cargando planes…</p>:plans.length?<SelectCustom label="Plan de servicio" value={planId} choices={[{value:'',label:'Elegí un plan'},...plans.map(plan=>({value:String(plan.id),label:plan.name}))]} onChange={setPlanId} disabled={busy}/>:<p className="form-note">No hay planes activos. Creá uno en Planes.</p>}
    {error&&<Aviso tono="error" compact role="alert">{error}</Aviso>}
    <FormActions><button type="button" className="secondary" disabled={busy} onClick={close}>Cancelar</button><button type="button" className="primary" disabled={busy||!planId} onClick={()=>void run()}>{busy?'Asignando…':'Asignar plan'}</button></FormActions>
  </Dialog>;
}
