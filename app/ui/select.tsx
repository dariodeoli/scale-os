'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';
import {FotoPerfil} from '../foto-perfil';
import {selectPosition} from '../select-position';
import './select.css';

export type SelectKind='plain'|'person'|'entity';
export type SelectOption={value:string;primary:string;secondary?:string;avatarUrl?:string|null;kind?:SelectKind;searchText?:string;disabled?:boolean;pinned?:boolean};
export type SelectOptionState={selected:boolean;disabled:boolean};
type CommonSelectProps={
 label:string;options:readonly SelectOption[];variant?:SelectKind;presentation?:'popover'|'inline';
 disabled?:boolean;loading?:boolean;error?:string;invalid?:boolean;describedBy?:string;id?:string;
 placeholder?:string;searchable?:boolean;searchLabel?:string;searchPlaceholder?:string;
 emptyLabel?:string;noResultsLabel?:string;loadingLabel?:string;missingLabel?:string;showMissingSelection?:boolean;
 hideLabel?:boolean;className?:string;optionClassName?:string;optionsClassName?:string;
 renderOption?:(option:SelectOption,state:SelectOptionState)=>ReactNode;
 renderValue?:(options:readonly SelectOption[],missing:readonly string[])=>ReactNode;
};
export type SelectorProps=CommonSelectProps&(
 {multiple?:false;value:string;onChange:(value:string)=>void}|{multiple:true;value:readonly string[];onChange:(value:string[])=>void}
);
export const foldSelectSearch=(value:unknown)=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es').trim();
function OptionContent({option,variant}:{option:SelectOption;variant:SelectKind}){
 const kind=option.kind??variant;
 return <span className="ui-select-content">
  {kind!=='plain'&&<FotoPerfil nombre={option.primary} foto={option.avatarUrl} tamano="sm" variante={kind==='entity'?'logo':'persona'} forma="circulo"/>}
  <span className="ui-select-text"><span>{option.primary}</span>{option.secondary&&<small>{option.secondary}</small>}</span>
 </span>;
}

/** Controlled selection only. Sources, authorization and domain transitions belong to callers. */
export function Selector(props:SelectorProps){
 const {label,options,variant='plain',presentation='popover',disabled=false,loading=false,error,invalid,describedBy,
  placeholder='Seleccionar…',searchable=options.length>8,searchLabel=`Buscar ${label.toLocaleLowerCase('es')}`,searchPlaceholder='Buscar…',
  emptyLabel='No hay opciones disponibles.',noResultsLabel='No hay coincidencias.',loadingLabel='Cargando opciones…',missingLabel='Opción no disponible',showMissingSelection=true,
  hideLabel=false,className,optionClassName='',optionsClassName='',renderOption,renderValue}=props;
 const generatedId=useId(),id=props.id||generatedId,listId=`${id}-options`;
 const initialFocus=useRef<'selected'|'last'>('selected');
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),menu=useRef<HTMLDivElement>(null),search=useRef<HTMLInputElement>(null);
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const [floating,setFloating]=useState<{target:Element;style:ReturnType<typeof selectPosition>}|null>(null);
 const locked=disabled||loading,inline=presentation==='inline';
 const values=props.multiple?[...props.value]:[props.value];
 const selected=options.filter(option=>values.includes(option.value));
 const missing=values.filter(value=>value!==''&&!options.some(option=>option.value===value));
 const selectedLabel=selected.length?selected.map(option=>option.primary).join(', '):missing.length?missingLabel:placeholder;
 const filtered=options.filter(option=>option.pinned||!query||foldSelectSearch(`${option.primary??''} ${option.secondary??''} ${option.searchText??''}`).includes(foldSelectSearch(query)));
 const help=[describedBy,error?`${id}-error`:null,missing.length&&showMissingSelection?`${id}-missing`:null].filter(Boolean).join(' ')||undefined;
 function close(restoreFocus=false){setOpen(false);if(restoreFocus)trigger.current?.focus();}
 function choose(option:SelectOption){
  if(locked||option.disabled)return;
  if(props.multiple){props.onChange(values.includes(option.value)?values.filter(value=>value!==option.value):[...values,option.value]);}
  else{props.onChange(option.value);if(!inline)close(true);}
 }
 useEffect(()=>{if(!open&&!inline)setQuery('');},[open,inline]);
 useEffect(()=>{if(locked)setOpen(false);},[locked]);
 useLayoutEffect(()=>{
  if(!open||inline){setFloating(null);return;}
  const update=()=>{if(trigger.current)setFloating({target:root.current?.closest('[role="dialog"]')||document.body,style:selectPosition(trigger.current.getBoundingClientRect(),{width:window.innerWidth,height:window.innerHeight},Math.min(380,options.length*44+12+(searchable?48:0)))});};
  update();window.addEventListener('resize',update);
  const scroll=(event:Event)=>{if(!menu.current?.contains(event.target as Node))update();};window.addEventListener('scroll',scroll,true);
  return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',scroll,true);};
 },[open,inline,options.length,searchable]);
 useEffect(()=>{
  if(!open||inline)return;
  const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)&&!menu.current?.contains(event.target as Node))close();};
  document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);
 },[open,inline]);
 const positioned=Boolean(floating);
 useEffect(()=>{if(open&&positioned){const options=Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="option"]:not(:disabled)')||[]);if(initialFocus.current==='last')options.at(-1)?.focus();else (menu.current?.querySelector<HTMLElement>('[aria-selected="true"]:not(:disabled)')||options[0]||search.current)?.focus();}},[open,positioned]);
 function navigate(key:string){
  const nodes=Array.from(menu.current?.querySelectorAll<HTMLElement>('[data-select-option]:not(:disabled)')||[]);
  if(!nodes.length)return;
  const at=nodes.indexOf(document.activeElement as HTMLElement);
  const next=key==='Home'?0:key==='End'?nodes.length-1:at<0?(key==='ArrowDown'?0:nodes.length-1):(at+(key==='ArrowDown'?1:-1)+nodes.length)%nodes.length;
  nodes[next]?.focus();
 }
 const content=<>
  {searchable&&<input ref={search} type="search" aria-label={searchLabel} placeholder={searchPlaceholder} value={query} disabled={locked} onChange={event=>setQuery(event.target.value)} onKeyDown={event=>{if(['Home','End'].includes(event.key))event.stopPropagation();if(event.key==='Enter'){event.preventDefault();const first=filtered.find(option=>!option.disabled&&(!query||!option.pinned))||filtered.find(option=>!option.disabled);if(first)choose(first);}}}/>}
  {loading?<p role="status">{loadingLabel}</p>:<div className={inline?`ui-select-inline-options ${optionsClassName}`:optionsClassName||undefined} role={inline?'group':'listbox'} id={listId} aria-labelledby={`${id}-label`} aria-multiselectable={!inline&&props.multiple?true:undefined}>
   {filtered.map(option=>{
    const state={selected:values.includes(option.value),disabled:locked||Boolean(option.disabled)};
    const body=renderOption?renderOption(option,state):<OptionContent option={option} variant={variant}/>;
    return inline&&props.multiple?<label key={option.value} className={`ui-select-check ${optionClassName}`}>
     <input data-select-option type="checkbox" checked={state.selected} disabled={state.disabled} onChange={()=>choose(option)}/>{body}
    </label>:<button key={option.value} type="button" data-select-option role={inline?undefined:'option'} aria-selected={inline?undefined:state.selected} aria-pressed={inline?state.selected:undefined} disabled={state.disabled} className={inline?`choice${state.selected?' active':''} ${optionClassName}`:optionClassName||undefined} onClick={()=>choose(option)}>{body}</button>;
   })}
  </div>}
  {!loading&&!filtered.length&&<p role="status">{query&&options.length?noResultsLabel:emptyLabel}</p>}
 </>;
 return <div data-ui-selector data-variant={variant} data-presentation={presentation} className={className||'ops-select'} ref={root} role={inline?'group':undefined} aria-labelledby={inline?`${id}-label`:undefined} aria-describedby={inline?help:undefined} aria-invalid={inline&&(invalid||Boolean(error))||undefined} aria-busy={loading||undefined} onKeyDown={event=>{
  if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close(true);return;}
  if(event.key==='Tab'&&open){close(true);return;}
  if((open||inline)&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();navigate(event.key);}
  else if(open&&searchable&&event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&event.target!==search.current&&event.key!==' '){event.preventDefault();setQuery(current=>current+event.key);search.current?.focus();}
 }}>
  <span className={hideLabel?'sr-only':'ops-label'} id={`${id}-label`}>{label}</span>
  {inline?<div ref={menu} aria-describedby={help}>{content}</div>:<>
   <button ref={trigger} type="button" disabled={locked} title={selectedLabel} className="ops-select-trigger" aria-invalid={invalid||Boolean(error)||undefined} aria-describedby={help} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-expanded={open&&!locked} aria-controls={open&&!locked?listId:undefined} onClick={()=>{if(!locked){initialFocus.current='selected';setOpen(current=>!current);}}} onKeyDown={event=>{if(!locked&&!open&&['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();event.stopPropagation();initialFocus.current=event.key==='ArrowUp'?'last':'selected';setOpen(true);}}}>
    <span id={`${id}-value`}>{renderValue?renderValue(selected,missing):selected.length===1?<OptionContent option={selected[0]} variant={variant}/>:selectedLabel}</span><ChevronDown size={16} aria-hidden="true"/>
   </button>
   {open&&!locked&&floating&&createPortal(<div className="ops-select-options ops-select-floating" data-ui-select-popup ref={menu} style={floating.style}>{content}</div>,floating.target)}
   {loading&&<p role="status">{loadingLabel}</p>}
  </>}
  {missing.length>0&&showMissingSelection&&<p id={`${id}-missing`} role="status">{missingLabel}</p>}
  {error&&<p id={`${id}-error`} role="alert">{error}</p>}
 </div>;
}
