// Demo data may be edited locally; invitations, public links and external
// providers belong to a real company. Keep this policy shared by the router
// and the handlers so an earlier mount cannot bypass it.
export const isDemoActor=actor=>Boolean(actor&&(actor.demo_owner_user_id||actor.demo_source_id||actor.is_demo_guest||actor.organization_slug==='scale-demo-controles-20260908'));
export function assertDemoEffectAllowed(actor,effect='external'){
 if(!isDemoActor(actor))return;
 const messages={
  ai:'La asistencia con IA no está disponible en la demostración. Podés completar los datos manualmente.',
  invitation:'La demostración no envía invitaciones ni habilita accesos externos. Usá esta opción desde tu empresa.',
  lookup:'La demostración no realiza consultas externas. Podés completar los datos manualmente.',
  external:'Esta acción no está disponible en la demostración. Podés usarla desde tu empresa.',
 };
 throw Object.assign(new Error(messages[effect]||messages.external),{status:403,code:'DEMO_EXTERNAL_ACTION_FORBIDDEN'});
}
export function demoRequestEffect(method,path){
 if(['GET','HEAD','OPTIONS'].includes(method))return null;
 if(path==='/api/ia/carga'||/^\/api\/agency\/contracts\/\d+\/assist$/.test(path))return 'ai';
 if(/^\/api\/agency\/clients\/\d+\/client-portal-invites$/.test(path)||/^\/api\/agency\/work-orders\/\d+\/client-portal-delivery$/.test(path)||path.startsWith('/api/agency/members')||path.startsWith('/api/agency/invite-links')||path.startsWith('/api/agency/access-requests'))return 'invitation';
 if(path==='/api/agency/ruc-lookup'||/^\/api\/agency\/clients\/\d+\/ruc-refresh$/.test(path)||/^\/api\/agency\/sso\/domains\/\d+\/verify$/.test(path))return 'lookup';
 if(['/api/auth/organizations','/api/events','/api/billing/checkout','/api/billing/portal'].includes(path)||/\/(share|client-review)$/.test(path)||/\/budgets\/\d+\/publish$/.test(path))return 'external';
 return null;
}
export async function demoEffectGate({req,res,url,session,send}){
 const effect=demoRequestEffect(req.method,url.pathname);
 if(!effect)return false;
 const actor=await session(req);
 try{assertDemoEffectAllowed(actor,effect);return false;}
 catch(error){send(res,error.status,{code:error.code,error:error.message});return true;}
}
