'use client';
import {useEffect,useState} from 'react';
import {api} from './operations';
import {balanceDetails,type BalanceDetails} from './finance-detail-data';
export function useBalanceDetails(month:string,version:number){
 const [data,setData]=useState<BalanceDetails|null>(null),[error,setError]=useState('');
 useEffect(()=>{let active=true;setData(current=>current?.month===month?current:null);setError('');void api<unknown>(`/api/agency/finance/balance-details?month=${month}`).then(response=>{const parsed=balanceDetails(response);if(!parsed||parsed.month!==month)throw Error('El detalle del balance recibió datos inválidos.');if(active)setData(parsed);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No se pudo cargar el detalle del balance.');});return()=>{active=false;};},[month,version]);
 return {data:data?.month===month?data:null,error};
}
