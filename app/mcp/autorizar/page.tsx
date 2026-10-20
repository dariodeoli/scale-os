import {Suspense} from 'react';
import type {Metadata} from 'next';
import {McpConsentRoute} from '../../mcp-consent-route';
export const metadata:Metadata={title:'Autorizar conexión de IA · Scale OS',robots:{index:false,follow:false},referrer:'no-referrer'};
export default function Page(){return <Suspense fallback={<p>Cargando solicitud de conexión…</p>}><McpConsentRoute/></Suspense>;}
