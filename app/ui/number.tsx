"use client";

import {forwardRef,useImperativeHandle,useLayoutEffect,useRef,useState} from 'react';
import {InputBase, type InputBaseProps} from './input';

export type NumberPolicy = 'integer' | 'decimal';
export type PercentagePolicy = 'integer-percent' | 'decimal-percent' | 'ratio';
export type NumberNotation='plain'|'native';
export type NumberRules = {notation?:NumberNotation;min?: string | number; max?: string | number; precision?: number; required?: boolean;step?:string|number;stepBase?:string|number};
export type NumericControlProps=Omit<InputBaseProps,'type'> & {policy:NumberPolicy;precision?:number;notation?:NumberNotation};
export type NumberInputProps = Omit<NumericControlProps, 'value' | 'onChange'> & {
  value: string; onChange: (value: string) => void;
};
export type PercentageInputProps = Omit<NumberInputProps, 'policy'> & {policy: PercentagePolicy};

function decimalParts(value:string,notation:NumberNotation='plain'){
 const match=(notation==='native'?/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/:/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/).exec(value);
 if(!match)return null;
 const negative=match[1]==='-',whole=match[2]||'0',fraction=match[3]??match[4]??'';
 if(notation==='plain')return {negative,whole,fraction};
 // HTML number rejects overflow and represents underflow as zero. Validation only;
 // the input event and submitted text are never converted.
 const numeric=Number(value);if(!Number.isFinite(numeric))return null;
 if(numeric===0)return {negative,whole:'0',fraction:''};
 const exponent=Number(match[5]||0),digits=whole+fraction,point=whole.length+exponent;
 return point<=0?{negative,whole:'0',fraction:'0'.repeat(-point)+digits}:point>=digits.length?{negative,whole:digits+'0'.repeat(point-digits.length),fraction:''}:{negative,whole:digits.slice(0,point),fraction:digits.slice(point)};
}
type Decimal=NonNullable<ReturnType<typeof decimalParts>>;
const scaled=(value:Decimal,scale:number)=>BigInt(`${value.negative?'-':''}${value.whole}${value.fraction.padEnd(scale,'0')}`);
function compareDecimal(left:Decimal,right:Decimal) {
 const scale=Math.max(left.fraction.length,right.fraction.length),a=scaled(left,scale),b=scaled(right,scale);
 return a<b?-1:a>b?1:0;
}

/** Exact validation only: callers own units, signs, ranges, precision and step. */
export function numberInputProblem(value:string,policy:NumberPolicy,{min,max,precision,required=false,step,stepBase,notation='plain'}:NumberRules={}):string{
 if(value==='')return required?'Completá este campo.':'';
 const parsed=decimalParts(value,notation);
 if(!parsed||policy==='integer'&&(notation==='plain'?!/^[+-]?\d+$/.test(value):Boolean(parsed&&/[1-9]/.test(parsed.fraction))))return policy==='integer'?'Ingresá un número entero.':'Ingresá un número válido.';
 if(precision!==undefined&&(!Number.isInteger(precision)||precision<0||parsed.fraction.length>precision))return `Usá hasta ${precision} decimales.`;
 const minimum=min===undefined?null:decimalParts(String(min),notation),maximum=max===undefined?null:decimalParts(String(max),notation);
 if(notation==='plain'&&(min!==undefined&&!minimum||max!==undefined&&!maximum))return 'Revisá los límites del campo.';
 if(minimum&&compareDecimal(parsed,minimum)<0)return `El valor mínimo es ${min}.`;
 if(maximum&&compareDecimal(parsed,maximum)>0)return `El valor máximo es ${max}.`;
 if(step!==undefined&&step!=='any'){
  const increment=decimalParts(String(step),notation);
  if(!increment||compareDecimal(increment,decimalParts('0')!)<=0)return 'Revisá el incremento del campo.';
  const base=minimum??(stepBase===undefined?null:decimalParts(String(stepBase),notation))??decimalParts('0')!;
  const scale=Math.max(parsed.fraction.length,increment.fraction.length,base.fraction.length);
  if((scaled(parsed,scale)-scaled(base,scale))%scaled(increment,scale)!==0n)return `Usá incrementos de ${step}.`;
 }
 return '';
}
export function numberInputValid(value:string,policy:NumberPolicy,rules:NumberRules={}):boolean{return !numberInputProblem(value,policy,rules);}

/** Native event/ref adapter. Text preserves raw drafts and caret, including '-', '.', paste and trailing separators. */
export const NumericControl=forwardRef<HTMLInputElement,NumericControlProps>(function NumericControl(
 {policy,precision,notation='plain',invalid,pending,disabled,inputMode,min,max,step,required,onChange,...props},forwardedRef,
){
 const input=useRef<HTMLInputElement>(null),[raw,setRaw]=useState(String(props.value??props.defaultValue??''));
 useImperativeHandle(forwardedRef,()=>input.current!);
 const rules={notation,precision,min,max,step,required,stepBase:typeof props.defaultValue==='string'||typeof props.defaultValue==='number'?props.defaultValue:undefined};
 const value=props.value===undefined?raw:String(props.value??'');
 const problem=numberInputProblem(value,policy,rules);
 useLayoutEffect(()=>{
  const control=input.current;if(!control)return;
  // RHF initializes uncontrolled values through the real ref; validate that actual value.
  control.setCustomValidity?.(numberInputProblem(control.value,policy,rules));
  if(props.value===undefined&&raw!==control.value)setRaw(control.value);
 });
 return <InputBase {...props} ref={input} type="text" inputMode={inputMode??(policy==='integer'?'numeric':'decimal')}
  min={min} max={max} step={step} required={required} disabled={disabled} pending={pending} invalid={invalid||Boolean(problem)||undefined}
  onChange={event=>{if(disabled||pending)return;const next=event.target.value;setRaw(next);event.target.setCustomValidity?.(numberInputProblem(next,policy,rules));onChange?.(event);}}/>;
});

/** String facade over the same event/ref engine; no fabricated events or numeric coercion. */
export const NumberInput=forwardRef<HTMLInputElement,NumberInputProps>(function NumberInput({onChange,...props},ref){
 return <NumericControl {...props} ref={ref} onChange={event=>onChange(event.target.value)}/>;
});

/** Percent and ratio are distinct caller-selected units; no implicit conversion or bounds. */
export const PercentageInput=forwardRef<HTMLInputElement,PercentageInputProps>(function PercentageInput({policy,...props},ref){
 return <NumberInput {...props} ref={ref} policy={policy==='integer-percent'?'integer':'decimal'}/>;
});

/** Preserve native number's default step=1 and offset (min, then defaultValue, then zero). */
export function nativeNumberSettings({step,min,defaultValue}:{step?:string|number;min?:string|number;defaultValue?:unknown}):{policy:NumberPolicy;step:string|number}{
 const parsed=step===undefined?null:decimalParts(String(step),'native');
 const increment=step==='any'?'any':parsed&&compareDecimal(parsed,decimalParts('0')!)>0?step!:1;
 const base=(min===undefined?null:decimalParts(String(min),'native'))??decimalParts(String(defaultValue??'0'),'native');
 const fractionalBase=base&&/[1-9]/.test(base.fraction);
 return {policy:increment==='any'||Boolean(parsed&&/[1-9]/.test(parsed.fraction))||fractionalBase?'decimal':'integer',step:increment};
}
