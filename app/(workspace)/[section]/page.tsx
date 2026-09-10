import {notFound,redirect} from 'next/navigation';
import {sections,validSection,legacyRoutes,legacyDestination} from '../../navigation';
export function generateStaticParams(){return [...sections.filter(([,section])=>!section.includes('/')).map(([,section])=>({section})),...Object.keys(legacyRoutes).map(section=>({section}))];}
export default async function Page(props:{params: Promise<{section:string}>}) {
 const params = await props.params;
 const destination=legacyDestination(params.section);
 if(destination)redirect(destination);
 if(!validSection(params.section))notFound();
 return null;
}
