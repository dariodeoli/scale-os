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
  if(represented.has(String(member.id))||member.removed_at)continue;
  const matches=archived.filter(p=>p.user_id?String(p.user_id)===String(member.id):emailKey(p.email)===emailKey(member.email));
  entries.push({key:`member-${member.id}`,profile:null,member,archivedProfileId:matches.length===1?String(matches[0].id):null,ambiguous:matches.length>1||(counts.get(emailKey(member.email))||0)>1});
 }
 return entries;
}
export const teamRoleLabels:Record<string,string>={owner:'Dueño',admin:'Administrador',management:'Gerencia',finance:'Finanzas',sales:'Ventas',production:'Producción',editor:'Editor',viewer:'Solo lectura',collaborator:'Colaborador'};
