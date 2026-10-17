'use client';
import {forwardRef,useId,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {CalendarDays,Clock3} from 'lucide-react';
import {InputBase,type InputBaseProps} from './input';
import {Button,IconButton} from './button';
import {Dialog,FormActions} from '../dialog';
import {validateCivilDate,validateTime,validateLocalDateTime,validateMonth} from './temporal-value';
import './temporal.css';
export {validateCivilDate,validateTime,validateLocalDateTime,validateMonth} from './temporal-value';

export type TemporalInputProps=Omit<InputBaseProps,'type'> & {pickerLabel?:string};
type TemporalKind='date'|'time'|'datetime-local'|'month';
const formats:Record<TemporalKind,string>={date:'AAAA-MM-DD',time:'HH:mm','datetime-local':'AAAA-MM-DDTHH:mm',month:'AAAA-MM'};
const checks={date:validateCivilDate,time:validateTime,'datetime-local':validateLocalDateTime,month:validateMonth};

/** Values and ranges are civil strings; no timezone or locale conversion is involved. */
function temporalProblem(kind:TemporalKind,value:string,min:TemporalInputProps['min'],max:TemporalInputProps['max']):string{
 if(!value)return '';
 if(!checks[kind](value))return `Completá un valor válido con formato ${formats[kind]}.`;
 const lower=typeof min==='string'&&checks[kind](min)?min:undefined;
 const upper=typeof max==='string'&&checks[kind](max)?max:undefined;
 // Native time ranges may cross midnight (e.g. 22:00–06:00).
 if(kind==='time'&&lower&&upper&&lower>upper){
  return value>=lower||value<=upper?'':`Elegí una hora entre ${lower} y ${upper}.`;
 }
 if(lower&&value<lower)return `El valor mínimo es ${lower}.`;
 if(upper&&value>upper)return `El valor máximo es ${upper}.`;
 return '';
}

function ClockPart({label,value,onChange,max,disabled}:{label:'horas'|'minutos';value:string;onChange:(value:string)=>void;max:number;disabled:boolean}){
 const valid=/^\d{1,2}$/.test(value)&&Number(value)<=max;
 const step=(direction:number)=>{
  const next=valid?(Number(value)+direction+max+1)%(max+1):direction>0?0:max;
  onChange(String(next).padStart(2,'0'));
 };
 const title=label==='horas'?'Horas (00–23)':'Minutos (00–59)';
 return <div className="ui-temporal-clock-part">
  <label>{title}<InputBase type="text" role="spinbutton" inputMode="numeric" autoComplete="off" value={value}
   aria-label={title} aria-valuemin={0} aria-valuemax={max} aria-valuenow={valid?Number(value):undefined}
   invalid={Boolean(value)&&!valid} placeholder="—" disabled={disabled} onChange={event=>onChange(event.target.value)}
   onKeyDown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();if(!disabled)step(event.key==='ArrowUp'?1:-1);}}}/></label>
  <div className="ui-temporal-clock-actions"><Button type="button" variant="secondary" disabled={disabled} aria-label={`Disminuir ${label}`} onClick={()=>step(-1)}>−</Button><Button type="button" variant="secondary" disabled={disabled} aria-label={`Aumentar ${label}`} onClick={()=>step(1)}>+</Button></div>
 </div>;
}

type Draft={snapshot:string;date:string;hour:string;minute:string};
function initialDraft(kind:TemporalKind,value:string):Draft{
 const date=kind==='datetime-local'?value.split('T')[0]:value;
 const clock=kind==='datetime-local'?value.split('T')[1]??'':kind==='time'?value:'';
 const [hour='',minute='']=clock.split(':');
 return {snapshot:value,date:kind==='time'?'':date,hour,minute};
}
function temporalControl(kind:TemporalKind,defaultLabel:string){
 const Control=forwardRef<HTMLInputElement,TemporalInputProps>(function TemporalControl({pickerLabel=defaultLabel,disabled,pending,readOnly,className,onChange,invalid,describedBy,placeholder,min,max,required,...props},forwardedRef){
  const input=useRef<HTMLInputElement>(null),formatId=useId();
  const [raw,setRaw]=useState(String(props.value??props.defaultValue??''));
  const [draft,setDraft]=useState<Draft|null>(null),[conflict,setConflict]=useState(false);
  useImperativeHandle(forwardedRef,()=>input.current!);
  const locked=Boolean(disabled||pending||readOnly);
  const current=props.value===undefined?raw:String(props.value??'');
  const problem=temporalProblem(kind,current,min,max);
  useLayoutEffect(()=>{
   const control=input.current;if(!control)return;
   // RHF may populate an uncontrolled input through its ref after mounting.
   control.setCustomValidity(temporalProblem(kind,control.value,min,max));
   if(props.value===undefined&&raw!==control.value)setRaw(control.value);
   if(draft&&control.value!==draft.snapshot)setConflict(true);
  });
  const close=()=>{setDraft(null);setConflict(false);};
  const commit=(value:string)=>{
   const control=input.current;
   if(!control||locked||!draft)return;
   if(control.value!==draft.snapshot){setConflict(true);return;}
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')?.set;
   if(!setter)return;
   // Bypass React's value tracker, then let the actual DOM event drive React/RHF.
   setter.call(control,value);
   control.dispatchEvent(new Event('input',{bubbles:true}));
   close();
  };
  const clock=draft&&/^\d{1,2}$/.test(draft.hour)&&Number(draft.hour)<24&&/^\d{1,2}$/.test(draft.minute)&&Number(draft.minute)<60
   ?`${draft.hour.padStart(2,'0')}:${draft.minute.padStart(2,'0')}`:'';
  const staged=draft?(kind==='time'?clock:kind==='datetime-local'?clock?`${draft.date}T${clock}`:'':draft.date):'';
  const stagedProblem=temporalProblem(kind,staged,min,max);
  const canApply=Boolean(staged)&&!stagedProblem&&!conflict&&!locked;
  const calendarKind=kind==='month'?'month':'date';
  const calendarValue=draft&&(calendarKind==='month'?validateMonth(draft.date):validateCivilDate(draft.date))?draft.date:'';
  const calendarBound=(bound:TemporalInputProps['min'])=>typeof bound==='string'&&checks[kind](bound)?kind==='datetime-local'?bound.slice(0,10):bound:undefined;
  return <span className="ui-temporal" data-ui-temporal={kind}>
   <InputBase {...props} ref={input} type="text" disabled={disabled} pending={pending} readOnly={readOnly} required={required}
    className={className} placeholder={placeholder??formats[kind]} min={min} max={max}
    invalid={problem?true:invalid} describedBy={[describedBy,`${formatId}-format`].filter(Boolean).join(' ')}
    onChange={event=>{setRaw(event.target.value);event.target.setCustomValidity(temporalProblem(kind,event.target.value,min,max));onChange?.(event);}}/>
   <span id={`${formatId}-format`} className="sr-only">Formato {formats[kind]}{kind==='time'||kind==='datetime-local'?', hora de 00 a 23 y minutos de 00 a 59. Sin zona horaria.':''}</span>
   <IconButton type="button" label={pickerLabel} icon={kind==='time'?<Clock3 size={16}/>:<CalendarDays size={16}/>} disabled={locked} aria-haspopup="dialog" aria-expanded={Boolean(draft)}
    onClick={()=>{if(!locked&&input.current){setConflict(false);setDraft(initialDraft(kind,input.current.value));}}}/>
   {draft&&<Dialog title={pickerLabel} close={close} size="corto"><form className="ui-temporal-dialog" noValidate onSubmit={event=>{event.preventDefault();event.stopPropagation();if(canApply)commit(staged);}}>
    {kind!=='time'&&<label>{calendarKind==='month'?'Mes':'Fecha'}<InputBase type={calendarKind} aria-label={calendarKind==='month'?'Mes':'Fecha'} value={calendarValue}
     min={calendarBound(min)} max={calendarBound(max)} disabled={locked} onChange={event=>setDraft({...draft,date:event.target.value})}/></label>}
    {kind==='time'||kind==='datetime-local'?<div className="ui-temporal-clock" aria-label="Hora en formato de 24 horas">
     <ClockPart label="horas" max={23} value={draft.hour} disabled={locked} onChange={hour=>setDraft({...draft,hour})}/>
     <span aria-hidden="true">:</span><ClockPart label="minutos" max={59} value={draft.minute} disabled={locked} onChange={minute=>setDraft({...draft,minute})}/>
    </div>:null}
    <p>Formato {formats[kind]}. El valor cambia al aplicar.</p>
    {conflict?<p role="alert">El campo cambió mientras el selector estaba abierto. Cancelá y volvé a abrirlo para revisar el valor actual.</p>:stagedProblem?<p role="alert">{stagedProblem}</p>:null}
    <FormActions><Button type="button" variant="secondary" onClick={close}>Cancelar</Button>{!required?<Button type="button" variant="ghost" disabled={locked||conflict} onClick={()=>commit('')}>Borrar valor</Button>:null}<Button type="submit" disabled={!canApply}>Aplicar</Button></FormActions>
   </form></Dialog>}
  </span>;
 });
 Control.displayName=`TemporalInput(${kind})`;
 return Control;
}
export const DateInput=temporalControl('date','Abrir calendario');
export const TimeInput=temporalControl('time','Elegir hora');
export const DateTimeInput=temporalControl('datetime-local','Elegir fecha y hora');
export const MonthInput=temporalControl('month','Elegir mes');
