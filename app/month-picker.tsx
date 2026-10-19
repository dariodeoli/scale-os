'use client';
import {useMemo,useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {SelectCustom} from './profile-controls';
import {InputControl} from './ui/input-control';
import {IconButton} from './ui/button';
import {validateMonth} from './ui/temporal-value';
import './month-picker.css';
export const MIN_BALANCE_MONTH='1900-01',MAX_BALANCE_MONTH='9998-12';
export const balanceMonthValid=(value:string)=>validateMonth(value)&&value>=MIN_BALANCE_MONTH&&value<=MAX_BALANCE_MONTH;
export function adjacentMonth(value:string,direction:-1|1):string|null{
 if(!balanceMonthValid(value))return null;
 const index=Number(value.slice(0,4))*12+Number(value.slice(5))-1+direction;
 const result=`${String(Math.floor(index/12)).padStart(4,'0')}-${String(index%12+1).padStart(2,'0')}`;
 return balanceMonthValid(result)?result:null;
}
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
/** Search can target any supported year without rendering a 97,188-option menu. */
export function MonthPicker({value,onChange,label='Mes del balance'}:{value:string;onChange:(value:string)=>void;label?:string}){
 const [query,setQuery]=useState('');
 const choices=useMemo(()=>{const searchedYear=query.match(/(?:^|[^0-9])(\d{4})(?:[^0-9]|$)/)?.[1];const candidate=searchedYear?Number(searchedYear):Number(value.slice(0,4));const year=candidate>=1900&&candidate<=9998?candidate:Number(value.slice(0,4));const result=[];for(let y=Math.max(1900,year-5);y<=Math.min(9998,year+5);y++)for(let m=0;m<12;m++)result.push({value:`${y}-${String(m+1).padStart(2,'0')}`,label:`${months[m]} ${y}`,searchText:`${y}-${String(m+1).padStart(2,'0')}`});if(!result.some(choice=>choice.value===value))result.push({value,label:`${months[Number(value.slice(5))-1]} ${value.slice(0,4)}`,searchText:value});return result;},[value,query]);
 const previous=adjacentMonth(value,-1),next=adjacentMonth(value,1);
 return <div className="scale-month-picker" role="group" aria-label={label}>
  <IconButton type="button" label="Mes anterior" icon={<ChevronLeft size={16}/>} disabled={!previous} onClick={()=>{if(previous)onChange(previous);}}/>
  <SelectCustom label={label} value={value} choices={choices} onSearchChange={setQuery} onChange={month=>{if(balanceMonthValid(month))onChange(month);}}/>
  <IconButton type="button" label="Mes siguiente" icon={<ChevronRight size={16}/>} disabled={!next} onClick={()=>{if(next)onChange(next);}}/>
  <span className="scale-month-picker-calendar"><InputControl type="month" className="sr-only" tabIndex={-1} aria-label="Mes del balance en calendario" required min={MIN_BALANCE_MONTH} max={MAX_BALANCE_MONTH} value={value} onChange={event=>{if(balanceMonthValid(event.target.value))onChange(event.target.value);}}/></span>
 </div>;
}
