import type {ReactNode} from 'react';
import ScaleWorkspace from '../scale-workspace';
import {WorkspaceFrame} from '../workspace-frame';

/** One mounted workspace across root, sections and nested sections. No pathname key. */
export default function WorkspaceLayout({children}:{children:ReactNode}){
 return <WorkspaceFrame workspace={<ScaleWorkspace/>}>{children}</WorkspaceFrame>;
}
