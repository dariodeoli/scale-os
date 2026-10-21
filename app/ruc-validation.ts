import {normalizeTaxId} from 'owncoding-ui/core';

/** Validate the supplied DV; a missing DV remains missing until the provider returns it. */
export function rucLookupInput(raw:string){
 const ruc=normalizeTaxId(raw)||'';
 if(!/^[1-9][0-9]{0,8}(?:-[0-9])?$/.test(ruc))throw new Error('Ingresá un RUC numérico de hasta 9 dígitos, sin cero inicial.');
 const [base,dv]=ruc.split('-');let sum=0,weight=2;
 for(const digit of [...base].reverse()){sum+=Number(digit)*weight;weight=weight===11?2:weight+1;}
 const remainder=sum%11,expected=String(remainder>1?11-remainder:0);
 if(dv!==undefined&&dv!==expected)throw new Error('El dígito verificador del RUC no coincide. Corregilo antes de consultar.');
 return ruc;
}
