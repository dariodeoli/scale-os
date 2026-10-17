import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {DateInput,TimeInput,DateTimeInput,MonthInput,validateCivilDate,validateTime,validateLocalDateTime,validateMonth} from '../../../app/ui/temporal';
import {Editor} from '../../../app/operations';
import {Dialog} from '../../../app/dialog';
const w=window as any;
const root=createRoot(document.getElementById('root')!);
const controls={date:DateInput,time:TimeInput,datetime:DateTimeInput,month:MonthInput};
const validators={date:validateCivilDate,time:validateTime,datetime:validateLocalDateTime,month:validateMonth};
let sequence=0;
function Fixture({kind,initial,options}:{kind:keyof typeof controls;initial:string;options:any}){
 const[value,setValue]=useState(initial),[other,setOther]=useState('');
 const ref=useRef<HTMLInputElement>(null),Control=controls[kind];
 w.state=()=>value;w.ref=()=>ref.current;
 return <main className="control-shell"><h1>Prueba local de {kind}</h1><form noValidate onSubmit={event=>{
  event.preventDefault();w.attempts.push({value,accepted:(value===''||validators[kind](value))&&Boolean(ref.current?.checkValidity())});
 }}><label htmlFor="subject">Fecha u hora opcional</label><Control {...options} id="subject" ref={ref} value={value} onChange={event=>{
  w.events.push({value:event.target.value,targetIsInput:event.target===ref.current,nativeEvent:event.nativeEvent instanceof Event,isTrusted:event.nativeEvent.isTrusted});
  setValue(event.target.value);
 }}/><label htmlFor="other">Otro campo</label><input id="other" value={other} onChange={event=>setOther(event.target.value)}/><button id="submit">Guardar local</button></form></main>;
}
w.mount=(kind:keyof typeof controls,initial:string,options={})=>{
 w.attempts=[];w.events=[];w.writes=[];
 root.render(<Fixture key={++sequence} kind={kind} initial={initial} options={options}/>);
};
w.mountEditor=(type:'date'|'time',initial:string)=>{
 w.writes=[];
 root.render(<Dialog key={++sequence} title="Editor temporal QA" close={()=>{}}><Editor fields={[{key:'subject',label:'Valor opcional',type,optional:true},{key:'other',label:'Otro',optional:true}]} defaults={{subject:initial,other:''}} save={async values=>{w.writes.push(values)}}/></Dialog>);
};
