"use client";
import {useEffect,useMemo,useState} from 'react';
import {SearchField,SegmentedField} from 'owncoding-ui';
import {Plus} from 'lucide-react';
import {api} from './operations';
import {useCompanyCurrency} from './currency-provider';
import {ConfirmDialog} from './dialog';
import {PersonContainer} from './person-container';
import {RemoveRecordDialog,canRemoveRecord} from './archive-controls';
import {PermissionsMatrix} from './permissions-matrix';
import {listDateShort} from './list-format';
import {notify} from './feedback';
import {personLabel,technicalEmail} from './field-rules';
import {BATCH_LIMITS,canOpenPeopleWorkspace,roleCan,effectiveCapability} from './capabilities';
import {ActionMenu,BulkBar,CompactCard,EmptyBlock,FilterToolbar,ListActions,ListGrid,ListPage,ListRow,LoadingBlock,StateChip,ViewSwitch,useBulkSelection,type ChipTone,type CollectionView,type Column,type RecordMenuItem} from './ui-v2';
import {teamDirectory,filterTeamEntries,teamRoleLabels,isCurrentTeamMember,type ArchivedProfile,type TeamEntry,type TeamMember,type TeamStatusFilter} from './team-directory';
import {accessState} from './team-access';
import {TeamPersonSheet,compensationTypes,type Person,type SheetTarget} from './team-person-sheet';

const TEAM_VIEW_KEY='scale:team-view';
// Una sola plantilla para el encabezado y las filas (Persona · Datos · Estado laboral · Permiso · Acceso · Acciones).
const TEAM_TEMPLATE='grid-cols-[minmax(13rem,1.6fr)_minmax(12rem,1.3fr)_7rem_8rem_7rem_4.5rem]';
const TEAM_COLUMNS:Column[]=[
  {key:'person',label:'Persona'},
  {key:'data',label:'Datos'},
  {key:'status',label:'Estado laboral',align:'center'},
  {key:'permission',label:'Permiso'},
  {key:'access',label:'Acceso',align:'center'},
  {key:'actions',label:'Acciones'},
];
const errorText=(cause:unknown)=>cause instanceof Error?cause.message:'No se pudo completar la operación';

type Entry=TeamEntry<Person>;
type Facts={
  key:string;
  name:string;
  photo:string|null;
  secondary:string|null;
  email:string;
  emailTitle?:string;
  meta:string[];
  status:{tone:ChipTone;label:string;title?:string};
  access:{role:string;tone:ChipTone;label:string;title:string};
  memberId:string|null;
};

// Estado de acceso: la etiqueta completa sale de `accessState` (fuente única con
// TeamAccess); la fila usa el rótulo corto y el tono del mismo estado.
const ACCESS_SHORT:Record<string,{label:string;tone:ChipTone}>={
  activo:{label:'Habilitado',tone:'ok'},
  suspendido:{label:'Suspendido',tone:'bad'},
  anulado:{label:'Retirado',tone:'mute'},
  pendiente:{label:'Sin acceso',tone:'mute'},
};
function accessChip(member:TeamMember|null,ambiguous:boolean){
  if(ambiguous&&!member)return {tone:'warn' as ChipTone,label:'Ambiguo',title:'Hay perfiles con el mismo correo. Revisá sus datos antes de vincular accesos; no se combinaron sus pagos.'};
  const state=accessState(member);
  const short=ACCESS_SHORT[state.estado]||ACCESS_SHORT.pendiente;
  return {tone:short.tone,label:short.label,title:state.etiqueta};
}

function factsOf(entry:Entry,salaryView:boolean):Facts{
  const {profile:p,member}=entry;
  const chip=accessChip(entry.member,entry.ambiguous);
  const roleLabel=member?teamRoleLabels[member.role]||member.role:'';
  const access={role:roleLabel,tone:chip.tone,label:chip.label,title:`${roleLabel?`${roleLabel} · `:''}${chip.title}`};
  if(p){
    const meta:string[]=[];
    if(p.started_on)meta.push(`Ingreso ${listDateShort(p.started_on)}`);
    if(p.ended_on)meta.push(`Salió ${listDateShort(p.ended_on)}`);
    // Modalidad (no el monto): solo para quien ve remuneraciones.
    if(salaryView)meta.push(Number(p.compensation_amount)>0?(compensationTypes.find(type=>type.value===p.compensation_type)?.label||'Sin modalidad'):p.active?'Sin salario definido':'');
    return {key:entry.key,name:p.full_name,photo:p.photo_url,secondary:p.job_title||'Sin cargo',email:p.email||'Sin correo',emailTitle:p.email||undefined,meta:meta.filter(Boolean),status:p.active?{tone:'ok',label:'Activo'}:{tone:'warn',label:'Inactivo',title:p.ended_on?`Salió el ${listDateShort(p.ended_on)}`:undefined},access,memberId:member?String(member.id):null};
  }
  const m=member!;
  const technical=technicalEmail(m.email);
  return {key:entry.key,name:m.full_name||'Integrante sin ficha',photo:m.photo_url??null,secondary:null,email:technical?`Acceso de demostración · ${teamRoleLabels[m.role]||'Integrante'}`:m.email,emailTitle:technical?undefined:m.email,meta:[],status:{tone:'mute',label:'Sin ficha',title:'Agregá la ficha laboral para registrar fechas y pagos.'},access,memberId:String(m.id)};
}

export function PeopleWorkspace({role,capabilities,currentEmail='',currentUserId=''}:{role:string;capabilities?:Record<string,boolean>;currentEmail?:string;currentUserId?:string}){
  const {currency:defaultCurrency}=useCompanyCurrency();
  const [members,setMembers]=useState<TeamMember[]>([]),[archivedProfiles,setArchivedProfiles]=useState<ArchivedProfile[]>([]),[people,setPeople]=useState<Person[]>([]);
  const [search,setSearch]=useState(''),[teamFilter,setTeamFilter]=useState<TeamStatusFilter>('all');
  const [loading,setLoading]=useState(true),[error,setError]=useState('');
  const [permissionsOpen,setPermissionsOpen]=useState(false);
  const [sheet,setSheet]=useState<SheetTarget|null>(null);
  const [revokeTarget,setRevokeTarget]=useState<TeamMember|null>(null);
  const [removeTarget,setRemoveTarget]=useState<{id:string;name:string}|null>(null);
  const [purgeTarget,setPurgeTarget]=useState<TeamMember|null>(null),[purgeBusy,setPurgeBusy]=useState(false),[purgeError,setPurgeError]=useState('');
  const [view,setView]=useState<CollectionView>('list');
  // La preferencia Lista/Cuadrícula se recuerda por navegador (mismo criterio que Clientes).
  useEffect(()=>{try{const stored=localStorage.getItem(TEAM_VIEW_KEY);setView(stored==='cards'||stored==='grid'?'grid':'list');}catch{/* Preferencia opcional de la interfaz. */}},[]);
  const changeView=(next:CollectionView)=>{setView(next);try{localStorage.setItem(TEAM_VIEW_KEY,next);}catch{/* Preferencia opcional de la interfaz. */}};
  const canManageAccess=effectiveCapability(role,'members.manage',capabilities);
  // Equipo sigue a quienes gestionan personas o ven salarios (sin listas de roles paralelas).
  const salaryView=effectiveCapability(role,'salary.view',capabilities);
  const allowed=canOpenPeopleWorkspace(role,capabilities);
  const bulk=useBulkSelection({limit:BATCH_LIMITS.members,noun:'accesos'});
  const [bulkBusy,setBulkBusy]=useState(false);

  async function load(){
    const data=await api<{collaborators:Person[];members?:TeamMember[];archivedProfiles?:ArchivedProfile[]}>('/api/agency/team');
    setPeople(data.collaborators);setMembers(data.members||[]);setArchivedProfiles(data.archivedProfiles||[]);
  }
  useEffect(()=>{
    if(allowed)load().catch(cause=>setError(errorText(cause))).finally(()=>setLoading(false));
  },[allowed]);
  useEffect(()=>{
    if(!allowed)return;
    const refreshIdentity=()=>{void load().catch(cause=>setError(errorText(cause)));};
    window.addEventListener('scale:identity-changed',refreshIdentity);
    return()=>window.removeEventListener('scale:identity-changed',refreshIdentity);
  },[allowed]);

  const directory=useMemo(()=>teamDirectory(people,members,archivedProfiles),[people,members,archivedProfiles]);
  const visible=useMemo(()=>filterTeamEntries(directory,search,teamFilter),[directory,search,teamFilter]);
  const selectable=(entry:Entry)=>Boolean(canManageAccess&&entry.member&&!entry.member.removed_at&&!isCurrentTeamMember(entry.member,currentUserId));
  const selectableIds=useMemo(()=>directory.filter(selectable).map(entry=>String(entry.member!.id)),[directory,canManageAccess,currentUserId]);
  const {prune}=bulk;
  useEffect(()=>{prune(selectableIds);},[selectableIds,prune]);

  async function batchSetAccess(active:boolean){
    if(bulkBusy||!bulk.count)return;
    setBulkBusy(true);setError('');
    let done=0,failed=0;
    try{
      // Una fila retirada o vencida no aborta el lote: se cuenta y se sigue (issue #22).
      for(const id of bulk.ids){
        try{await api(`/api/agency/members/${id}`,{active},'PATCH');done+=1;}
        catch{failed+=1;}
      }
      bulk.clear();await load();
      const action=active?'reactivado':'suspendido';
      const plural=(count:number)=>`${count} acceso${count===1?'':'s'} ${action}${count===1?'':'s'}.`;
      notify({tone:failed?'warning':'success',message:failed?`${plural(done)} ${failed} no se pudieron actualizar (acceso ya retirado).`:plural(done)});
    }catch(cause){setError(errorText(cause));await load().catch(()=>{});}
    finally{setBulkBusy(false);}
  }
  // Eliminación definitiva (Equipo): solo para accesos ya retirados/suspendidos.
  async function purgeMember(){
    if(!purgeTarget||purgeBusy)return;
    setPurgeBusy(true);setPurgeError('');
    try{
      await api(`/api/agency/members/${purgeTarget.id}/permanent`,{},'DELETE');
      const label=personLabel(purgeTarget,'esta persona');
      setPurgeTarget(null);await load();
      notify({tone:'success',message:`${label} salió del equipo.`});
    }catch(cause){setPurgeError(errorText(cause));}
    finally{setPurgeBusy(false);}
  }

  if(!allowed)return <EmptyBlock title="Información restringida" description="Solo administración y finanzas pueden ver remuneraciones y comisiones."/>;

  const openSheet=(target:Partial<SheetTarget>={})=>setSheet({personId:null,memberId:null,seedEmail:'',tab:'perfil',...target});
  const hasFilters=Boolean(search.trim())||teamFilter!=='all';
  const clearFilters=()=>{setSearch('');setTeamFilter('all');};
  const summary=`${visible.length} de ${directory.length} ${directory.length===1?'persona':'personas'}`;

  function menuItems(entry:Entry):RecordMenuItem[]{
    const items:RecordMenuItem[]=[];
    const p=entry.profile,m=entry.member;
    if(p){
      items.push({id:'profile',label:'Perfil',onClick:()=>openSheet({personId:String(p.id),memberId:m?String(m.id):null})});
    }else if(entry.archivedProfileId){
      items.push({id:'restore',label:'Restaurar perfil',onClick:()=>{void api(`/api/agency/collaborators/${entry.archivedProfileId}/restore`,{}).then(load).catch(cause=>setError(errorText(cause)));}});
    }else if(!entry.ambiguous){
      items.push({id:'profile',label:'Perfil',onClick:()=>openSheet({memberId:String(m!.id),seedEmail:m!.email&&!technicalEmail(m!.email)?m!.email:''})});
    }
    if(canManageAccess&&(m||p))items.push({id:'access',label:'Acceso',onClick:()=>openSheet({personId:p?String(p.id):null,memberId:m?String(m.id):null,seedEmail:!p&&m&&!technicalEmail(m.email)?m.email:'',tab:'acceso'})});
    if(m&&!m.removed_at&&canManageAccess&&!isCurrentTeamMember(m,currentUserId)&&!(m.role==='owner'&&role!=='owner'))items.push({id:'revoke',label:'Quitar acceso',peligro:true,onClick:()=>setRevokeTarget(m)});
    if(p&&canManageAccess&&canRemoveRecord('collaborators',role))items.push({id:'remove',label:'Eliminar',peligro:true,onClick:()=>setRemoveTarget({id:String(p.id),name:p.full_name})});
    else if(!p&&m&&canManageAccess&&(!m.active||Boolean(m.removed_at))&&!isCurrentTeamMember(m,currentUserId)&&!(m.role==='owner'&&role!=='owner'))items.push({id:'purge',label:'Eliminar',peligro:true,onClick:()=>{setPurgeError('');setPurgeTarget(m);}});
    return items;
  }
  const menuLabel=(facts:Facts)=>`Acciones de ${facts.name}`;
  const check=(entry:Entry,facts:Facts,reserve=false,className='')=>selectable(entry)
    ?<label className={`select-check flex h-11 w-8 shrink-0 items-center justify-center md:h-8 ${className}`} title="Seleccionar integrante"><input type="checkbox" aria-label={`Seleccionar ${facts.name}`} checked={bulk.has(String(entry.member!.id))} onChange={()=>bulk.toggle(String(entry.member!.id))}/></label>
    :reserve&&canManageAccess?<span className={`block w-8 shrink-0 ${className}`} aria-hidden="true"/>:null;

  const row=(entry:Entry)=>{
    const facts=factsOf(entry,salaryView);
    const items=menuItems(entry);
    return <ListRow key={facts.key} template={TEAM_TEMPLATE} className="team-row">
      <div role="cell" className="flex min-w-0 items-center gap-1">
        {check(entry,facts,true)}
        <div className="min-w-0" title={facts.name}><PersonContainer size="md" name={facts.name} photoUrl={facts.photo||undefined} secondary={facts.secondary} verified/></div>{isCurrentTeamMember(entry.member,currentUserId)?<StateChip tone="mute">vos</StateChip>:null}
      </div>
      <span role="cell" className="flex min-w-0 items-baseline gap-x-1.5 text-[12px] leading-tight text-mute" title={[facts.emailTitle||facts.email,...facts.meta].join(' · ')}><span className="min-w-0 truncate">{facts.email}</span>{facts.meta.map(item=><span key={item} className="shrink-0 whitespace-nowrap text-[11px] opacity-80">· {item}</span>)}</span>
      <span role="cell" className="team-state-cell flex min-w-0 justify-center"><StateChip tone={facts.status.tone} title={facts.status.title}>{facts.status.label}</StateChip></span>
      <span role="cell" className="min-w-0 truncate text-[12px] text-mute" title={facts.access.role}>{facts.access.role||'Sin permiso'}</span>
      <span role="cell" className="team-state-cell flex min-w-0 justify-center" title={facts.access.title}><StateChip tone={facts.access.tone}>{facts.access.label}</StateChip></span>
      <ListActions>{items.length?<ActionMenu label={menuLabel(facts)} items={items}/>:null}</ListActions>
    </ListRow>;
  };
  const card=(entry:Entry)=>{
    const facts=factsOf(entry,salaryView);
    const items=menuItems(entry);
    const p=entry.profile;
    return <CompactCard
      key={facts.key}
      title={<PersonContainer size="md" name={facts.name} photoUrl={facts.photo||undefined} secondary={facts.secondary} verified/>}
      onOpen={items.find(item=>item.id==='profile')?.onClick}
      openLabel={`Abrir ${facts.name}`}
      quickAction={check(entry,facts)}
      actions={items}
      menuLabel={menuLabel(facts)}
      context={<><span className="min-w-0 truncate" title={facts.emailTitle||facts.email}>{facts.email}</span>{facts.meta.map(item=><span key={item} className="whitespace-nowrap">· {item}</span>)}</>}
      chips={<>{isCurrentTeamMember(entry.member,currentUserId)?<StateChip tone="mute">vos</StateChip>:null}<StateChip tone={facts.status.tone} title={facts.status.title}>{facts.status.label}</StateChip>{facts.access.role?<span className="text-[11.5px] text-mute">{facts.access.role}</span>:null}<StateChip tone={facts.access.tone} title={facts.access.title}>{facts.access.label}</StateChip></>}
      data-team-card={p?'profile':'member'}
    />;
  };

  const sheetPerson=sheet?.personId?people.find(person=>String(person.id)===sheet.personId)||null:null;
  const sheetEntry=sheetPerson?directory.find(entry=>entry.profile?.id===sheetPerson.id):undefined;
  const sheetMember=sheetPerson?sheetEntry?.member||null:sheet?.memberId?members.find(member=>String(member.id)===sheet.memberId)||null:null;
  const sheetReady=Boolean(sheet&&(!sheet.personId||sheetPerson));

  return <>
    <ListPage
      className="directory grid-cols-[minmax(0,1fr)]"
      aria-label="Personas, accesos y remuneraciones"
      primaryAction={<>
        {roleCan(role,'settings.manage')?<button type="button" className="secondary" onClick={()=>setPermissionsOpen(true)}>Permisos del panel</button>:null}
        <button type="button" className="primary" onClick={()=>openSheet()}><Plus size={16} aria-hidden="true"/>Agregar persona</button>
        <ViewSwitch value={view} onChange={changeView}/>
      </>}
      toolbar={<FilterToolbar className="mb-0" summary={<span role="status" aria-atomic="true">{summary}</span>}>
        <SegmentedField className="[&>button]:min-h-11 md:[&>button]:min-h-8" ariaLabel="Filtrar por estado laboral" value={teamFilter} onChange={(value:string)=>setTeamFilter(value as TeamStatusFilter)} options={[['all','Todos'],['active','Activos'],['inactive','Inactivos']]}/>
        <SearchField className="w-full sm:w-72" ariaLabel="Buscar persona" value={search} onChange={(event:React.ChangeEvent<HTMLInputElement>)=>setSearch(event.target.value)} placeholder="Nombre, correo o cargo"/>
        {hasFilters?<button type="button" className="text-button min-h-11 md:min-h-8" onClick={clearFilters}>Limpiar filtros</button>:null}
      </FilterToolbar>}
      bulk={canManageAccess?<BulkBar count={bulk.count} total={BATCH_LIMITS.members} role={role} busy={bulkBusy} onSelectVisible={()=>bulk.selectVisible(visible.filter(selectable).map(entry=>String(entry.member!.id)))} onClear={bulk.clear}>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>void batchSetAccess(false)}>Suspender acceso</button>
        <button type="button" className="secondary min-h-11 md:min-h-10" disabled={bulkBusy} onClick={()=>void batchSetAccess(true)}>Reactivar acceso</button>
      </BulkBar>:undefined}
    >
      {error?<p className="error" role="alert">{error}</p>:null}
      {loading?<LoadingBlock label="Cargando equipo…" lines={4}/>
        :!visible.length?<EmptyBlock compact title={hasFilters?'Sin coincidencias':'Todavía no hay personas'} description={hasFilters?'Probá con otro nombre, correo o cargo, o cambiá el filtro.':'Agregá la primera persona del equipo para registrar accesos y remuneraciones.'} action={hasFilters?<button type="button" className="text-button" onClick={clearFilters}>Limpiar filtros</button>:<button type="button" className="primary" onClick={()=>openSheet()}><Plus size={16} aria-hidden="true"/>Agregar primera persona</button>}/>
        :view==='list'
          ?<ListGrid label="Equipo" template={TEAM_TEMPLATE} columns={TEAM_COLUMNS} minWidthClass="min-w-[56rem]" pinnedActions>{visible.map(row)}</ListGrid>
          :<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(card)}</div>}
    </ListPage>
    {revokeTarget?<RemoveRecordDialog kind="members" id={String(revokeTarget.id)} name={personLabel(revokeTarget,'Esta persona')} role={role} done={load} open onClose={()=>setRevokeTarget(null)}/>:null}
    {removeTarget?<RemoveRecordDialog kind="collaborators" id={removeTarget.id} name={removeTarget.name} role={role} done={load} open onClose={()=>setRemoveTarget(null)}/>:null}
    {purgeTarget?<ConfirmDialog open busy={purgeBusy} variant="danger" title="Eliminar del equipo" confirmLabel="Eliminar del equipo" description={<><strong>{personLabel(purgeTarget,'Esta persona')}</strong>{' '}dejará de aparecer en Equipo y no podrá reingresar con este acceso; sus sesiones se cierran. El historial (piezas, reservas, pagos y comentarios) se conserva, y una nueva invitación la reactiva.{purgeError?<span role="alert" className="mt-2 block font-semibold text-bad">{purgeError}</span>:null}</>} onCancel={()=>{if(!purgeBusy)setPurgeTarget(null);}} onConfirm={()=>void purgeMember()}/>:null}
    {sheet&&sheetReady?<TeamPersonSheet
      role={role}
      capabilities={capabilities}
      currentEmail={currentEmail}
      currentUserId={currentUserId}
      person={sheetPerson}
      member={sheetMember}
      ambiguous={Boolean(sheetEntry?.ambiguous)}
      seedEmail={sheet.seedEmail}
      tab={sheet.tab}
      defaultCurrency={defaultCurrency}
      load={load}
      onCreated={created=>setSheet(current=>current?{...current,personId:String(created.id)}:current)}
      close={()=>setSheet(null)}
    />:null}
    {permissionsOpen?<PermissionsMatrix role={role} close={()=>setPermissionsOpen(false)}/>:null}
  </>;
}
