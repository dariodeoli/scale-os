export type TeamMember={id:string;email:string;role:string;active:boolean;removed_at:string|null;full_name?:string|null;photo_url?:string|null};
export type TeamProfile={id:string;user_id:string|null;email:string|null};
export type ArchivedProfile=TeamProfile;
export type TeamEntry<P extends TeamProfile>={key:string;profile:P|null;member:TeamMember|null;archivedProfileId:string|null;ambiguous:boolean};
const emailKey=(value:string|null)=>value?.trim().toLowerCase()||'';
export function teamDirectory<P extends TeamProfile>(profiles:P[],members:TeamMember[],archived:ArchivedProfile[]):TeamEntry<P>[] {
 const byId=new Map(members.map(m=>[String(m.id),m])),byEmail=new Map(members.map(m=>[emailKey(m.email),m]));
 const counts=new Map<string,number>();for(const p of [...profiles,...archived]){const key=emailKey(p.email);if(key)counts.set(key,(counts.get(key)||0)+1);}
 const represented=new Set<string>();
 const entries:TeamEntry<P>[]=profiles.map(profile=>{
  const email=emailKey(profile.email),ambiguous=Boolean(!profile.user_id&&email&&(counts.get(email)||0)>1);
  const member=(profile.user_id?byId.get(String(profile.user_id)):!ambiguous?byEmail.get(email):undefined)||null;
  if(member)represented.add(String(member.id));
  return{key:`person-${profile.id}`,profile,member,archivedProfileId:null,ambiguous};
 });
 for(const member of members){
  // Los retirados sin ficha también se listan: es el único punto para reinvitar (issue #22).
  if(represented.has(String(member.id)))continue;
  const matches=archived.filter(p=>p.user_id?String(p.user_id)===String(member.id):emailKey(p.email)===emailKey(member.email));
  entries.push({key:`member-${member.id}`,profile:null,member,archivedProfileId:matches.length===1?String(matches[0].id):null,ambiguous:matches.length>1||(counts.get(emailKey(member.email))||0)>1});
 }
 return entries;
}
export const teamRoleLabels:Record<string,string>={owner:'Dueño',admin:'Administrador',management:'Gerencia',finance:'Finanzas',sales:'Ventas',production:'Producción',editor:'Editor',viewer:'Solo lectura',collaborator:'Colaborador'};

export type TeamStatusFilter='all'|'active'|'inactive';
type FilterableTeamEntry={profile:{full_name?:string|null;email?:string|null;active?:boolean}|null;member:TeamMember|null};
/** Búsqueda y filtro de estado de la toolbar de Equipo (ronda 14, #62).
 *  El filtro sigue la etiqueta visible de cada tarjeta: los perfiles por su
 *  estado laboral y los accesos sin ficha por su acceso vigente. */
export function filterTeamEntries<E extends FilterableTeamEntry>(entries:E[],search:string,status:TeamStatusFilter='all'):E[]{
 const query=search.trim().toLowerCase();
 return entries.filter(entry=>{
  if(query&&!`${entry.profile?.full_name||''} ${entry.profile?.email||''} ${entry.member?.full_name||''} ${entry.member?.email||''}`.toLowerCase().includes(query))return false;
  if(status==='all')return true;
  const active=entry.profile?entry.profile.active===true:Boolean(entry.member&&entry.member.active&&!entry.member.removed_at);
  return status==='active'?active:!active;
 });
}
