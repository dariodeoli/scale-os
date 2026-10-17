'use client';
import {Children,Fragment,isValidElement,type ReactNode,type AriaAttributes} from 'react';
import {Selector,type SelectKind,type SelectOption} from './select';

type OptionNodeProps={value?:string|number;children?:ReactNode;disabled?:boolean;label?:string;'data-photo-url'?:string|null;'data-secondary'?:string;'data-kind'?:SelectKind;'data-search-text'?:string};
const textOf=(children:ReactNode):string=>Children.toArray(children).map(child=>typeof child==='string'||typeof child==='number'?String(child):isValidElement<{children?:ReactNode}>(child)?textOf(child.props.children):'').join('');
/** Declarative option data only: no rendered native select, event proxies or hidden fields. */
export function optionsFromChildren(children:ReactNode):SelectOption[]{
 const options:SelectOption[]=[];
 function walk(nodes:ReactNode,disabled=false,group?:string){Children.forEach(nodes,node=>{
  if(!isValidElement<OptionNodeProps>(node))return;
  if(node.type===Fragment){walk(node.props.children,disabled,group);return;}
  if(node.type==='optgroup'){walk(node.props.children,disabled||Boolean(node.props.disabled),node.props.label);return;}
  if(node.type!=='option')return;
  const primary=node.props.label??textOf(node.props.children);
  options.push({value:String(node.props.value??primary),primary,disabled:disabled||Boolean(node.props.disabled),group,
   avatarUrl:node.props['data-photo-url'],secondary:node.props['data-secondary'],kind:node.props['data-kind'],searchText:node.props['data-search-text']});
 });}
 walk(children);return options;
}
export type OptionsSelectProps={label:string;value:string;onChange:(value:string)=>void;children:ReactNode;disabled?:boolean;loading?:boolean;error?:string;id?:string;className?:string;invalid?:boolean;describedBy?:string;required?:boolean;hideLabel?:boolean;onBlur?:()=>void;variant?:SelectKind;title?:string;'aria-invalid'?:AriaAttributes['aria-invalid'];'aria-describedby'?:string};
/** Controlled facade for existing declarative options; validation and authorization remain with callers. */
export function OptionsSelect({children,invalid,describedBy,'aria-invalid':ariaInvalid,'aria-describedby':ariaDescription,...props}:OptionsSelectProps){
 return <Selector {...props} options={optionsFromChildren(children)} invalid={invalid??(ariaInvalid!==undefined&&ariaInvalid!==false&&ariaInvalid!=='false')} describedBy={describedBy??ariaDescription}/>;
}
