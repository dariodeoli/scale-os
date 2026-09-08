import {notFound,redirect} from 'next/navigation';
import ScaleWorkspace from '../scale-workspace';
import {sections,validSection} from '../navigation';
export function generateStaticParams(){return sections.map(([,section])=>({section}));}
export default function Page({params}:{params:{section:string}}){
 if(params.section==='colaboradores')redirect('/equipo');
 if(!validSection(params.section))notFound();
 return <ScaleWorkspace/>;
}
