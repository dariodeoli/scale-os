'use client';
import {forwardRef,useImperativeHandle,useRef} from 'react';
import {CalendarDays,Clock3} from 'lucide-react';
import {InputBase,type InputBaseProps} from './input';
import {IconButton} from './button';
export {validateCivilDate,validateTime,validateLocalDateTime,validateMonth} from './temporal-value';

export type TemporalInputProps=Omit<InputBaseProps,'type'> & {
 /** Native picker is progressive enhancement; manual entry always remains. */
 pickerLabel?:string;
};
type TemporalKind='date'|'time'|'datetime-local'|'month';
function temporalControl(kind:TemporalKind,defaultLabel:string){
 const Control=forwardRef<HTMLInputElement,TemporalInputProps>(function TemporalControl({pickerLabel=defaultLabel,disabled,pending,readOnly,className,...props},forwardedRef){
  const input=useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef,()=>input.current!);
  const openPicker=()=>{
   const control=input.current;
   if(!control||disabled||pending||readOnly)return;
   control.focus();
   // Unsupported browsers keep their native keyboard/manual control. Never
   // replace a partial value or synthesize a timezone conversion to open it.
   try{control.showPicker?.();}catch{/* Browser may restrict native popups. */}
  };
  return <span className="ui-temporal" data-ui-temporal={kind}>
   <InputBase {...props} ref={input} type={kind} disabled={disabled} pending={pending} readOnly={readOnly} className={className}/>
   <IconButton type="button" label={pickerLabel} icon={kind==='time'?<Clock3 size={16}/>:<CalendarDays size={16}/>} disabled={disabled||pending||readOnly} onClick={openPicker}/>
  </span>;
 });
 Control.displayName=`TemporalInput(${kind})`;
 return Control;
}
export const DateInput=temporalControl('date','Abrir calendario');
export const TimeInput=temporalControl('time','Elegir hora');
export const DateTimeInput=temporalControl('datetime-local','Elegir fecha y hora');
export const MonthInput=temporalControl('month','Elegir mes');
