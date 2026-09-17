import {visibleModule} from './workspace-access';

export type StartupPreference = 'summary' | 'production' | 'my-day';
export type ProductionPreferences = {clientId:string; mine:boolean; week:boolean};
export type WorkspacePreferences = {version:1; startup:StartupPreference; production:ProductionPreferences};
export function defaultWorkspacePreferences():WorkspacePreferences {
 return {version:1,startup:'summary',production:{clientId:'',mine:false,week:false}};
}
export function workspacePreferenceKey(userId:string,organizationId:string):string {
 return userId.trim() && organizationId.trim()
  ? `scale:workspace:v1:${encodeURIComponent(userId)}:${encodeURIComponent(organizationId)}` : '';
}
export function parseWorkspacePreferences(raw:string|null):WorkspacePreferences {
 const fallback=defaultWorkspacePreferences();
 try {
  const data=JSON.parse(raw||'null');
  if(!data || data.version!==1)return fallback;
  const production=data.production;
  return {version:1,
   startup:['summary','production','my-day'].includes(data.startup)?data.startup:'summary',
   production:{
    clientId:typeof production?.clientId==='string' && /^[1-9]\d{0,19}$/.test(production.clientId)?production.clientId:'',
    mine:production?.mine===true,week:production?.week===true,
   }};
 } catch {return fallback;}
}
export function startupChoices(role:string) {
 if(!['owner','admin','management','finance','sales','production','editor','viewer','collaborator'].includes(role))return [];
 return ([
  {value:'summary',label:'Resumen',section:'Resumen'},
  {value:'production',label:'Producción',section:'Producción'},
  {value:'my-day',label:'Mi día',section:'Producción'},
 ] as const).filter(choice=>visibleModule(choice.section,role));
}
export function startupPath(startup:StartupPreference,role:string):string|null {
 const allowed=startupChoices(role);
 const value=allowed.find(choice=>choice.value===startup)?.value || allowed[0]?.value;
 return value==='my-day'?'/produccion?vista=Mi%20d%C3%ADa':value==='production'?'/produccion':value==='summary'?'/resumen':null;
}
/** Both the original entry and the current URL must be the untouched bare root.
 * Keep the original entry even when auth recovery removes its query string. */
export function startupDestination(entryHref:string,currentHref:string,startup:StartupPreference,role:string):string|null {
 try {
  const entry=new URL(entryHref),current=new URL(currentHref);
  if(entry.origin!==current.origin || entry.pathname!=='/' || current.pathname!=='/'
   || entryHref.includes('?') || entryHref.includes('#') || currentHref.includes('?') || currentHref.includes('#'))return null;
  return startupPath(startup,role);
 } catch {return null;}
}
