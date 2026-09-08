import {notFound} from 'next/navigation';
import ScaleWorkspace from '../../scale-workspace';
import {sections,validSection} from '../../navigation';
export function generateStaticParams(){return sections.filter(([,path])=>path.includes('/')).map(([,path])=>{const [section,view]=path.split('/');return {section,view};});}
export default function Page({params}:{params:{section:string;view:string}}){
 if(!validSection(`${params.section}/${params.view}`))notFound();
 return <ScaleWorkspace/>;
}
