import type {Metadata} from 'next';
import {Catalog} from './catalog';

export const metadata:Metadata={title:'Biblioteca UI · Scale',description:'Catálogo local de componentes de Scale con datos ficticios.',robots:{index:false,follow:false}};
export default function BibliotecaUiPage(){return <Catalog/>;}
