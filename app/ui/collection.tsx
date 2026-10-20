'use client';
import type {ReactNode} from 'react';
import {DataTable as CanonicalDataTable} from 'owncoding-ui/core';
import {useListColumnConfiguration} from '../list-column-controls';
type Props<Row>={columns:{key:string;label:ReactNode;align?:'left'|'right'|'center';mobile?:boolean;render?:(row:NoInfer<Row>)=>ReactNode}[];rows:Row[];emptyLabel?:string;loading?:boolean;mobileCard?:(row:NoInfer<Row>)=>ReactNode;encabezadoFijo?:boolean;caption?:ReactNode;getRowKey?:(row:NoInfer<Row>,index:number)=>string|number;className?:string;columnPreferenceKey?:string;columnPreferenceLabel?:string};
/** Keep the library's table/card renderer and row inference. Only the displayed
 * column catalogue is selected by the same preferences as ListGrid. Custom
 * mobile cards remain the default; an explicit column layout uses the library's
 * generic cards so hidden fields do not silently remain on a phone. */
export function DataTable<Row=Record<string,unknown>>({columnPreferenceKey,columnPreferenceLabel,...props}:Props<Row>){
 const label=columnPreferenceLabel??(typeof props.caption==='string'?props.caption:'Tabla · '+props.columns.map(column=>typeof column.label==='string'?column.label:column.key).join(' · '));
 const columns=props.columns.map(column=>({key:column.key,label:typeof column.label==='string'?column.label:column.key}));
 const configuration=useListColumnConfiguration({label,columns,tracks:columns.map(()=>'minmax(0,1fr)'),preferenceKey:columnPreferenceKey});
 return <>{configuration.controls}<CanonicalDataTable {...props} columns={configuration.indices.map(index=>props.columns[index])} mobileCard={configuration.customized?undefined:props.mobileCard}/></>;
}
