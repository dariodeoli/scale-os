'use client';
import {useSearchParams} from 'next/navigation';
import {McpConsent} from './mcp-consent';
export function McpConsentRoute(){const query=useSearchParams();const values=query.getAll('request');return <McpConsent request={values.length===1?values[0]:''}/>;}
