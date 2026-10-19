"use client";
export {AmountInput} from './ui/amount';
import {Selector,type SelectKind,type SelectOption} from './ui/select';

export type SelectChoice={value:string;label:string;photoUrl?:string|null;secondary?:string;searchText?:string;kind?:'person'|'entity';disabled?:boolean};
export type SelectCustomProps={label:string;value:string;choices:SelectChoice[];onChange:(value:string)=>void;onSearchChange?:(query:string)=>void;variant?:SelectKind;disabled?:boolean;invalid?:boolean;describedBy?:string;loading?:boolean;error?:string};
const optionsOf=(choices:SelectChoice[]):SelectOption[]=>choices.map(choice=>({value:String(choice.value),primary:String(choice.label??''),avatarUrl:choice.photoUrl,secondary:choice.secondary,searchText:choice.searchText,kind:choice.kind??(choice.value===''?'plain':undefined),disabled:choice.disabled}));
/** Compatibility facade. Use explicit variant/kind; display labels never determine behavior. */
export function SelectCustom(props:SelectCustomProps){
 const variant=props.variant??(props.choices.some(choice=>choice.kind==='person')?'person':props.choices.some(choice=>choice.kind==='entity')?'entity':'plain');
 return variant==='person'?<PersonSelect {...props}/>:<PlainSelect {...props} variant={variant}/>;
}
export function PersonSelect(props:SelectCustomProps){
 return <Selector label={props.label} value={props.value} options={optionsOf(props.choices)} onChange={props.onChange} onSearchChange={props.onSearchChange} variant="person" searchable disabled={props.disabled} invalid={props.invalid} describedBy={props.describedBy} loading={props.loading} error={props.error} placeholder={props.choices.find(choice=>choice.value==='')?.label||'Buscar persona…'} className="ops-select ops-person-select"/>;
}
export function PlainSelect(props:SelectCustomProps){
 return <Selector label={props.label} value={props.value} options={optionsOf(props.choices)} onChange={props.onChange} onSearchChange={props.onSearchChange} variant={props.variant??'plain'} disabled={props.disabled} invalid={props.invalid} describedBy={props.describedBy} loading={props.loading} error={props.error}/>;
}
