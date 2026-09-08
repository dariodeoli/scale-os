import {notFound,redirect} from 'next/navigation';
import ScaleWorkspace from '../scale-workspace';
import {sections,validSection,legacyRoutes,legacyDestination} from '../navigation';
export function generateStaticParams(){return [...sections.filter(([,section])=>!section.includes('/')).map(([,section])=>({section})),...Object.keys(legacyRoutes).map(section=>({section}))];}
export default function Page({params}:{params:{section:string}}){
 const destination=legacyDestination(params.section);
 if(destination)redirect(destination);
 if(!validSection(params.section))notFound();
 return <ScaleWorkspace/>;
}
