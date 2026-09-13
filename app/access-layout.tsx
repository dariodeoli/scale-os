import type {ReactNode} from 'react';
import Link from 'next/link';
import {WorkspaceBrand} from './workspace-brand';
import {WorkspaceFooter} from './workspace-footer';

export function AccessLayout({children,eyebrow,cardClassName='',pageClassName='login-page',showBrand=true}:{children:ReactNode;eyebrow?:string;cardClassName?:string;pageClassName?:string;showBrand?:boolean}){return <main className={`${pageClassName} access-layout`.trim()}><section className={`login-card ${cardClassName}`.trim()}><header className="access-layout-header">{showBrand&&<Link className="access-layout-brand" href="https://sistema.scaleparaguay.com/" aria-label="Scale OS · Volver al sitio"><WorkspaceBrand/></Link>}{eyebrow&&<p className="eyebrow">{eyebrow}</p>}</header>{children}<WorkspaceFooter/></section></main>;}
