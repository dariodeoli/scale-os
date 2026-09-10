import {notFound} from 'next/navigation';
import {sections,validSection} from '../../../navigation';
export function generateStaticParams(){return sections.filter(([,path])=>path.includes('/')).map(([,path])=>{const [section,view]=path.split('/');return {section,view};});}
export default async function Page(props:{params: Promise<{section:string;view:string}>}) {
 const params = await props.params;
 if(!validSection(`${params.section}/${params.view}`))notFound();
 return null;
}
