import {PublicClientIntake} from '../../public-client-intake';
export const metadata={title:'Enviar datos para revisión · Scale OS',robots:{index:false,follow:false}};
export default async function ClientIntakePage({params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 return <main className="control-shell mx-auto w-full max-w-4xl p-4 sm:p-6"><PublicClientIntake token={token}/></main>;
}
