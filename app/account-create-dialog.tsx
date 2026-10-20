'use client';
import {useEffect,useState} from 'react';
import {Dialog} from './dialog';
import {AccountForm} from './workspace-forms';
import {request as defaultRequest} from './workspace-request';
import {ErrorBlock,LoadingBlock} from './ui-v2';
import type {Account,Member} from './workspace-types';
/** The account popup is shared by Accounts and inline receipt entry. */
export function AccountCreateDialog({close,done,custodians,request=defaultRequest,initialCurrency,account}:{close:()=>void;done:(account:Account)=>void;custodians?:Member[];request?:typeof defaultRequest;initialCurrency?:Account['currency'];account?:Account}){
 const [people,setPeople]=useState<Member[]|null>(custodians??null),[error,setError]=useState(''),[version,setVersion]=useState(0);
 useEffect(()=>{if(custodians){setPeople(custodians);return;}let active=true;setError('');void request<{members:Member[]}>('/api/agency/custodians').then(data=>{if(active)setPeople(data.members);}).catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'No se pudieron cargar las personas custodias.');});return()=>{active=false;};},[custodians,request,version]);
 return <Dialog title={account?'Editar cuenta':'Nueva cuenta'} close={close}>{error?<ErrorBlock title="No se pudo preparar la cuenta" description={error} onRetry={()=>setVersion(value=>value+1)}/>:people===null?<LoadingBlock label="Cargando personas custodias…" lines={2}/>:<AccountForm account={account} custodians={people} request={request} initialCurrency={initialCurrency} done={done}/>}</Dialog>;
}
