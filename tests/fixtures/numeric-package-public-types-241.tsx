// Compile-only consumer contract. No runtime or account/provider requests.
import React from 'react';
import {InputBase,TextareaBase,type InputBaseProps,type TextareaBaseProps} from '../../app/ui/input';
import {NumericControl,NumberInput,PercentageInput,numberInputProblem,numberInputValid,nativeNumberSettings,type NumericControlProps} from '../../app/ui/number';
const inputRef=React.createRef<HTMLInputElement>(),textRef=React.createRef<HTMLTextAreaElement>();
const input:InputBaseProps={name:'sample',pending:true,invalid:true,describedBy:'help',onChange:event=>{const raw:string=event.currentTarget.value;void raw;}};
const textarea:TextareaBaseProps={rows:3,pending:true,invalid:true,describedBy:'help'};
const numeric:NumericControlProps={policy:'decimal',notation:'native',step:'.01',defaultValue:'-',onChange:event=>{const node:HTMLInputElement=event.target;void node;}};
export const fixture=<><InputBase {...input} ref={inputRef}/><TextareaBase {...textarea} ref={textRef}/><NumericControl {...numeric} ref={inputRef}/><NumberInput policy="decimal" value="-" onChange={value=>{const raw:string=value;void raw;}}/><PercentageInput policy="ratio" value="0.125" precision={3} onChange={()=>{}}/></>;
const optionalRules:string=numberInputProblem('0','decimal');
const valid:boolean=numberInputValid('0','integer');
const settings:{policy:'integer'|'decimal';step:string|number}=nativeNumberSettings({min:'.5',step:'any'});
void optionalRules;void valid;void settings;
// @ts-expect-error NumberInput has a string payload contract, never numeric coercion.
export const wrongValue=<NumberInput policy="decimal" value={12} onChange={()=>{}}/>;
// @ts-expect-error NumericControl's policy is integer/decimal, not a percentage unit.
export const wrongPolicy=<NumericControl policy="ratio"/>;
// @ts-expect-error InputBase exposes the input ref, not a wrapper/textarea ref.
export const wrongRef=<InputBase ref={textRef}/>;
