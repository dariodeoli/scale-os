'use client';
import {forwardRef} from 'react';
import {InputBase,type InputBaseProps} from './input';
import {DateInput,TimeInput,DateTimeInput,MonthInput} from './temporal';

/** Native-compatible entry for generic/dynamic form fields; policies stay outside. */
export const InputControl=forwardRef<HTMLInputElement,InputBaseProps>(function InputControl({type,...props},ref){
 switch(type){
  case 'date':return <DateInput {...props} ref={ref}/>;
  case 'time':return <TimeInput {...props} ref={ref}/>;
  case 'datetime-local':return <DateTimeInput {...props} ref={ref}/>;
  case 'month':return <MonthInput {...props} ref={ref}/>;
  default:return <InputBase {...props} ref={ref} type={type}/>;
 }
});
