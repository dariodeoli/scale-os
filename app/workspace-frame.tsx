"use client";
import React, {type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {validSection} from './navigation';

export function WorkspaceFrame({workspace,children}:{workspace:ReactNode;children:ReactNode}){
 const pathname=usePathname();
 const isWorkspace=pathname==='/'||validSection(pathname.replace(/^\//,'').replace(/\/$/,''));
 // Leave notFound/error content to the router; never replace an unknown URL with Resumen.
 return <>{isWorkspace?workspace:children}</>;
}
