"use client";
import {MoneyInput} from 'owncoding-ui';
import {Selector,type SelectKind,type SelectOption} from './ui/select';

const currencyMarks: Record<string, string> = { PYG: 'Gs', USD: 'US$', EUR: '€', BRL: 'R$', ARS: '$', MXN: 'MX$' };
const currencyMark = (currency: string) => currencyMarks[currency] || currency;
/**
 * Campo de monto de la app: puente sobre `MoneyInput` de owncoding-ui v0.39
 * (#75), que conserva el caret al tipear/pegar, acepta pegado es-PY/en-US y
 * `integerOnly`. La API local (`onChange(value:string)`, `invalid`,
 * `describedBy`, `required`) se mantiene para los consumidores existentes.
 */
export function AmountInput({ value, currency, onChange,disabled=false,id,invalid,describedBy,integerOnly=false,required=false,placeholder='0' }: { value: string|number; currency: string; onChange: (value: string) => void;disabled?:boolean;id?:string;invalid?:boolean;describedBy?:string;integerOnly?:boolean;required?:boolean;placeholder?:string }) {
  return <MoneyInput
    id={id}
    placeholder={placeholder}
    disabled={disabled}
    required={required}
    aria-invalid={invalid||undefined}
    aria-describedby={describedBy}
    currency={currency}
    symbol={currencyMark(currency)}
    integerOnly={integerOnly}
    value={value === '' || value === null || value === undefined ? '' : String(value)}
    onValueChange={(next: unknown)=>onChange(next === '' || next === null || next === undefined ? '' : String(next))}
  />;
}

export type SelectChoice={value:string;label:string;photoUrl?:string|null;secondary?:string;searchText?:string;kind?:'person'|'entity';disabled?:boolean};
export type SelectCustomProps={label:string;value:string;choices:SelectChoice[];onChange:(value:string)=>void;variant?:SelectKind;disabled?:boolean;invalid?:boolean;describedBy?:string;loading?:boolean;error?:string};
const optionsOf=(choices:SelectChoice[]):SelectOption[]=>choices.map(choice=>({value:String(choice.value),primary:String(choice.label??''),avatarUrl:choice.photoUrl,secondary:choice.secondary,searchText:choice.searchText,kind:choice.kind??(choice.value===''?'plain':undefined),disabled:choice.disabled}));
/** Compatibility facade. Use explicit variant/kind; display labels never determine behavior. */
export function SelectCustom(props:SelectCustomProps){
 const variant=props.variant??(props.choices.some(choice=>choice.kind==='person')?'person':props.choices.some(choice=>choice.kind==='entity')?'entity':'plain');
 return variant==='person'?<PersonSelect {...props}/>:<PlainSelect {...props} variant={variant}/>;
}
export function PersonSelect(props:SelectCustomProps){
 return <Selector label={props.label} value={props.value} options={optionsOf(props.choices)} onChange={props.onChange} variant="person" searchable disabled={props.disabled} invalid={props.invalid} describedBy={props.describedBy} loading={props.loading} error={props.error} placeholder={props.choices.find(choice=>choice.value==='')?.label||'Buscar persona…'} className="ops-select ops-person-select"/>;
}
export function PlainSelect(props:SelectCustomProps){
 return <Selector label={props.label} value={props.value} options={optionsOf(props.choices)} onChange={props.onChange} variant={props.variant??'plain'} disabled={props.disabled} invalid={props.invalid} describedBy={props.describedBy} loading={props.loading} error={props.error}/>;
}
