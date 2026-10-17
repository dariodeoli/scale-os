'use client';
import {forwardRef} from 'react';
import {InputBase,type InputBaseProps} from './input';
import {NumericControl,nativeNumberSettings,type NumberPolicy} from './number';
import {DateInput,TimeInput,DateTimeInput,MonthInput} from './temporal';
export type InputControlProps=InputBaseProps & {numberPolicy?:NumberPolicy;precision?:number};

/** Native-compatible entry for generic/dynamic form fields; policies stay outside. */
export const InputControl=forwardRef<HTMLInputElement,InputControlProps>(function InputControl({type,numberPolicy,precision,...props},ref){
 switch(type){
  case 'number':{const settings=nativeNumberSettings(props);return <NumericControl {...props} ref={ref} policy={numberPolicy??settings.policy} notation="native" precision={precision} step={settings.step}/>;}
  case 'date':return <DateInput {...props} ref={ref}/>;
  case 'time':return <TimeInput {...props} ref={ref}/>;
  case 'datetime-local':return <DateTimeInput {...props} ref={ref}/>;
  case 'month':return <MonthInput {...props} ref={ref}/>;
  default:return <InputBase {...props} ref={ref} type={type}/>;
 }
});
