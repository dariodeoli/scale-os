'use client';
import {createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {Dialog} from './dialog';
import {ChevronUp,ChevronDown} from 'lucide-react';
import {Button} from './ui/button';
import {InputControl} from './ui/input-control';
import {columnListKey,parseListColumnPreferences,resolveListColumns,type ConfigurableColumn,type ListColumnPreference,type ListColumnPreferences} from './list-column-preferences';
import type {WorkspacePreferences} from './workspace-preferences';
import './list-column-controls.css';
type ColumnPreferenceContext={scope?:string;ready:boolean;preferences:WorkspacePreferences;update:(change:Partial<WorkspacePreferences>)=>void;warning:string;saving:boolean;retry:()=>void};
const ColumnsContext=createContext<ColumnPreferenceContext|null>(null);
export const useColumnPreferenceContext=()=>useContext(ColumnsContext);
export function ListColumnPreferenceProvider({children,...value}:ColumnPreferenceContext&{children:ReactNode}){return <ColumnsContext.Provider value={value}>{children}</ColumnsContext.Provider>;}
export function ListColumnControls({label,listKey,columns,pinnedActions=false}:{label:string;listKey:string;columns:ConfigurableColumn[];pinnedActions?:boolean}){
 const context=useColumnPreferenceContext(),[open,setOpen]=useState(false),[draft,setDraft]=useState<ListColumnPreference>({order:[],hidden:[]}),[editingScope,setEditingScope]=useState('');
 useEffect(()=>setOpen(false),[context?.scope]);
 if(!context)return null;
 const pinnedKey=columns[columns.length-1]?.key;
 const settings=parseListColumnPreferences(context.preferences.columns),view=resolveListColumns(columns,draft,pinnedActions);
 function begin(){setDraft(settings[listKey]??{order:[],hidden:[]});setEditingScope(context?.scope??'');setOpen(true);}
 function move(key:string,delta:number){const order=[...view.order],index=order.indexOf(key),target=index+delta;if(target<0||target>=order.length||pinnedActions&&(key===pinnedKey||order[target]===pinnedKey))return;[order[index],order[target]]=[order[target],order[index]];setDraft(value=>({...value,order}));}
 return <div className="list-column-toolbar"><Button variant="ghost" type="button" disabled={!context.ready} onClick={begin} aria-label={`Editar columnas de ${label}`}>Editar columnas</Button>{context.warning&&<p role="alert" className="error">{context.warning} <Button type="button" variant="ghost" onClick={context.retry}>Reintentar sincronización</Button></p>}{open&&editingScope===(context.scope??'')&&<Dialog title={`Columnas · ${label}`} close={()=>setOpen(false)}><p className="form-note">Elegí las columnas disponibles y su orden. Se guardan para tu usuario en esta empresa. La identidad permanece visible{pinnedActions?'; las acciones conservan su posición al final':''}.</p><ol className="list-column-options">{view.order.map((key,index)=>{const column=columns.find(item=>item.key===key)!;return <li key={key}><label><InputControl type="checkbox" checked={!view.hidden.has(key)} disabled={view.required.has(key)} onChange={event=>setDraft(value=>({...value,hidden:event.target.checked?value.hidden.filter(item=>item!==key):[...value.hidden,key]}))}/><span><strong>{column.label}</strong>{column.description&&<small>{column.description}</small>}{view.required.has(key)&&<small>Siempre visible</small>}</span></label><div><Button variant="ghost" size="large" type="button" aria-label={`Subir ${column.label}`} disabled={index===0||pinnedActions&&key===pinnedKey} onClick={()=>move(key,-1)}><ChevronUp size={16} aria-hidden="true"/></Button><Button variant="ghost" size="large" type="button" aria-label={`Bajar ${column.label}`} disabled={index===view.order.length-1||pinnedActions&&(key===pinnedKey||view.order[index+1]===pinnedKey)} onClick={()=>move(key,1)}><ChevronDown size={16} aria-hidden="true"/></Button></div></li>;})}</ol>{context.warning&&<p role="alert" className="error">{context.warning} <Button type="button" variant="ghost" onClick={context.retry}>Reintentar sincronización</Button></p>}<div className="list-column-actions"><Button variant="secondary" type="button" onClick={()=>setDraft({order:[],hidden:[]})}>Restaurar predeterminadas</Button><Button variant="secondary" type="button" onClick={()=>setOpen(false)}>Cancelar</Button><Button variant="primary" type="button" onClick={()=>{const all:ListColumnPreferences={...settings,[listKey]:{order:view.order,hidden:[...view.hidden]}};context.update({columns:all});setOpen(false);}}>Guardar columnas</Button></div></Dialog>}</div>;
}

/** The same layout contract supports legacy tables while they adopt ListGrid.
 * Pass original tracks; render both header and row cells by `indices` and use
 * `style` on both. The caller's columns are already filtered by its permissions. */
export function useListColumnConfiguration({label,columns,tracks,preferenceKey,pinnedActions=false,enabled=true}:{label:string;columns:ConfigurableColumn[];tracks:string[]|null;preferenceKey?:string;pinnedActions?:boolean;enabled?:boolean}){
 const context=useColumnPreferenceContext();
 const listKey=preferenceKey??columnListKey(typeof window==='undefined'?'':window.location?.pathname||'',label);
 const supported=!!context&&!!tracks&&tracks.length===columns.length&&columns.length>1&&enabled;
 const view=resolveListColumns(columns,supported?context.preferences.columns?.[listKey]:undefined,pinnedActions);
 const customized=supported&&(view.indices.length!==columns.length||view.indices.some((index,position)=>index!==position));
 return {supported,customized,indices:view.indices,visibleColumns:view.indices.map(index=>columns[index]),style:customized&&tracks?{gridTemplateColumns:view.indices.map(index=>tracks[index]).join(' ')}:undefined,controls:supported?<ListColumnControls label={label} listKey={listKey} columns={columns} pinnedActions={pinnedActions}/>:null};
}
