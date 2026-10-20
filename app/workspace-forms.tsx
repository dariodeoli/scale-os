"use client";
import {InputControl} from './ui/input-control';
import {TextareaBase} from './ui/input';
import {useEffect,useRef,useState} from 'react';
import {BancoComboboxLazy as BancoCombobox,BancoLogoLazy as BancoLogo} from 'owncoding-ui/financial-lazy';
import {LookupField,LookupReview} from './ui/smart-field';
import {lookupRuc,rucApplyValues,type RucRecord} from './client-ruc';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {PendingFields} from './ui/form-state';
import {useFormFocus,FormValidationErrors} from './ui/form-focus';
import {ApiFieldError} from './operations';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {useCompanyCurrency} from './currency-provider';
import {statuses} from './production-board';
import {SaveActions} from './save-actions';
import type {Account,Client,Invoice,Member,Project,WorkOrder} from './workspace-types';
import {currencyCodes} from './currencies';
import {financeNoticeHref,financePurposeNotice} from './finance-privacy';
import {AmountInput,SelectCustom} from './profile-controls';
import {UrgencySelect} from './urgency';
import {EntityPicker,type EntityOption} from './entity-picker';
import {isPositiveInput} from './forecast-data';
import {todayAsuncion} from './client-format';
import {listDateShort} from './list-format';
import {money} from './money-format';
import {teamRoleLabels} from './team-directory';
import {paymentCurrency} from './treasury-data';
import {Button as ScaleButton} from "./ui/button";



type WorkspaceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
export const driveLinkSchema=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Pegá un enlace HTTPS válido de archivo o carpeta.');
const projectSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  name: z.string().trim().min(2, "Escribí el nombre del proyecto.").max(120, "El nombre no puede superar los 120 caracteres."),
  clientId: z.string().min(1, "Elegí un cliente."),
  driveUrl: driveLinkSchema,
});
type ProjectValues = z.infer<typeof projectSchema>;
export function ProjectForm({
  clients,
  request,
  done,
  initialClientId='',
}: {
  clients: Client[];
  request: WorkspaceRequest;
  initialClientId?:string;
  done: (project: Project) => void;
}) {
  const form = useForm<ProjectValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: "", clientId: initialClientId, driveUrl: "", urgency:"" },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(event=>{setError("");return form.handleSubmit(submit,errors=>focus.onInvalid(errors))(event);});
  const focus=useFormFocus(submission.pending);
  async function submit(values: ProjectValues) {
    try {
      const data = await request<{ project: Project }>("/api/agency/projects", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done(data.project);
    } catch (cause) {
      if(cause instanceof ApiFieldError){
        const accepted:Record<string,{message:string}>={};
        for(const [key,message] of Object.entries(cause.fieldErrors))if(key in form.getValues()){
          form.setError(key as keyof typeof values,{type:'server',message});accepted[key]={message};
        }
        focus.onInvalid(accepted);
      }
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
      ref={focus.formRef}
      aria-busy={submission.pending}
    >
      <PendingFields pending={submission.pending}>
      <label>
        Nombre del proyecto
        <InputControl {...form.register("name")} autoFocus maxLength={120} aria-invalid={form.formState.errors.name?true:undefined} aria-describedby={form.formState.errors.name?"project-name-error":undefined}/>
        {form.formState.errors.name && (
          <small className="error" role="alert" id="project-name-error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as ProjectValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      {/* Un desplegable con buscador (no un botón por cliente): con cientos de
          clientes la lista de botones empujaba el resto del formulario fuera de vista. */}
      <div className="grid gap-1.5" data-form-field="clientId">
        <SelectCustom label="Cliente" value={form.watch("clientId")} choices={clients.map(client=>({value:String(client.id),label:client.name}))} disabled={submission.pending} invalid={Boolean(form.formState.errors.clientId)} describedBy={form.formState.errors.clientId?"project-client-error":undefined} onChange={value=>form.setValue("clientId",value,{shouldValidate:true,shouldDirty:true})}/>
        {form.formState.errors.clientId && (
          <small className="error" role="alert" id="project-client-error">
            {form.formState.errors.clientId.message}
          </small>
        )}
      </div>
      <label>
        Enlace de archivo o carpeta de Google Drive
        <InputControl
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
          aria-invalid={form.formState.errors.driveUrl?true:undefined}
          aria-describedby={form.formState.errors.driveUrl?"project-drive-error":undefined}
        />
        {form.formState.errors.driveUrl && (
          <small className="error" role="alert" id="project-drive-error">
            {form.formState.errors.driveUrl.message}
          </small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Compartí el acceso con tu equipo desde Drive.</small>
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><ScaleButton
        className="primary"
        disabled={!clients.length || submission.pending} variant="primary"
      >
        {submission.pending ? "Guardando…" : "Crear proyecto"}
      </ScaleButton></SaveActions>
      {!clients.length && <p className="form-note">Primero creá un cliente.</p>}
      <FormValidationErrors errors={form.formState.errors}/>
      </PendingFields>
    </form>
  );
}
const orderSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  title: z.string().trim().min(2, "Escribí qué hay que hacer.").max(120, "El título no puede superar los 120 caracteres."),
  projectId: z.string().min(1, "Elegí un proyecto."),
  status: z.enum([
    "blocked",
    "to_record",
    "recorded",
    "editing",
    "review",
    "approved",
    "published",
  ]),
  driveUrl: driveLinkSchema,
  description: z.string().max(500).optional(),
  work_type: z.enum(["", "video", "reedicion", "foto", "produccion", "entregable"]),
  due_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida").or(z.literal("")),
});
type OrderValues = z.infer<typeof orderSchema>;
export function OrderForm({
  projects,
  request,
  done,
}: {
  projects: Project[];
  request: WorkspaceRequest;
  done: (order: WorkOrder) => void;
}) {
  const form = useForm<OrderValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      title: "",
      projectId: "",
      urgency:"",
      status: "to_record",
      driveUrl: "",
      description: "",
      work_type: "",
      due_time: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(event=>{setError("");return form.handleSubmit(submit,errors=>focus.onInvalid(errors))(event);});
  const focus=useFormFocus(submission.pending);
  // Paso 1 del alta (#137): primero el proyecto con buscador; el resto del
  // formulario aparece recién al elegirlo (antes se listaban ~20 botones).
  const projectId=form.watch("projectId");
  const selectedProject=projects.find(project=>String(project.id)===projectId);
  const projectChoices=projects.map(project=>({value:String(project.id),label:`${project.client_name} · ${project.name}`}));
  async function submit(values: OrderValues) {
    try {
      const data = await request<{ workOrder: WorkOrder }>(
        "/api/agency/work-orders",
        { method: "POST", body: JSON.stringify(values) },
      );
      done(data.workOrder);
    } catch (cause) {
      if(cause instanceof ApiFieldError){
        const accepted:Record<string,{message:string}>={};
        for(const [key,message] of Object.entries(cause.fieldErrors))if(key in form.getValues()){
          form.setError(key as keyof typeof values,{type:'server',message});accepted[key]={message};
        }
        focus.onInvalid(accepted);
      }
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
      ref={focus.formRef}
      aria-busy={submission.pending}
    >
      <PendingFields pending={submission.pending}>
      {selectedProject ? (
        <div className="ops-wide flex min-w-0 items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-800 px-3 py-2">
          <span className="min-w-0">
            <small className="block text-[10px] font-bold uppercase tracking-[.08em] text-mute">Proyecto</small>
            <b className="block truncate text-[13.5px] font-semibold text-fore" title={`${selectedProject.client_name} · ${selectedProject.name}`}>{selectedProject.client_name} · {selectedProject.name}</b>
          </span>
          <ScaleButton type="button" className="text-button shrink-0" onClick={()=>form.setValue("projectId","",{shouldValidate:false,shouldDirty:true})} variant="ghost">Cambiar</ScaleButton>
        </div>
      ) : (
        <div className="ops-wide grid gap-1.5" data-form-field="projectId">
          <SelectCustom disabled={submission.pending} label="Proyecto" value={projectId} choices={projectChoices} onChange={value=>form.setValue("projectId",value,{shouldValidate:true,shouldDirty:true})} invalid={Boolean(form.formState.errors.projectId)} describedBy={form.formState.errors.projectId?"order-project-error":undefined}/>
          {form.formState.errors.projectId && (
            <small className="error" role="alert" id="order-project-error">
              {form.formState.errors.projectId.message}
            </small>
          )}
          {!projects.length && (
            <p className="form-note">Primero creá un proyecto.</p>
          )}
        </div>
      )}
      {selectedProject ? <>
      <label>
        Orden de trabajo
        <InputControl {...form.register("title")} autoFocus maxLength={120} aria-invalid={form.formState.errors.title?true:undefined} aria-describedby={form.formState.errors.title?"order-title-error":undefined}/>
        {form.formState.errors.title && (
          <small className="error" role="alert" id="order-title-error">{form.formState.errors.title.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as OrderValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      <fieldset>
        <legend>Estado inicial</legend>
        <div className="choice-list compact">
          {statuses.filter(status=>!['approved','published'].includes(status.id)).map((status) => (
            <button
              type="button"
              className={
                form.watch("status") === status.id ? "choice active" : "choice"
              }
              onClick={() => form.setValue("status", status.id,{shouldDirty:true})}
              key={status.id}
            >
              {status.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        <SelectCustom disabled={submission.pending} label="Tipo de trabajo" choices={[{value:'',label:'Sin clasificar'},{value:'video',label:'Video'},{value:'reedicion',label:'Reedición'},{value:'foto',label:'Foto'},{value:'produccion',label:'Producción'},{value:'entregable',label:'Entregable'}]} value={form.watch('work_type')??''} onChange={value=>form.setValue('work_type',value as OrderValues['work_type'],{shouldDirty:true,shouldValidate:true})}/>
        <small>Se usa para los conteos automáticos del resumen semanal.</small>
      </label>
      <label>
        Hora de entrega
        <InputControl type="time" {...form.register("due_time")} />
        <small>Opcional, junto con la fecha de entrega.</small>
      </label>
      <label>
        Enlace de archivo o carpeta de Drive
        <InputControl
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
          aria-invalid={form.formState.errors.driveUrl?true:undefined}
          aria-describedby={form.formState.errors.driveUrl?"order-drive-error":undefined}
        />
        {/* Sin este aviso un enlace inválido bloqueaba el guardado en silencio. */}
        {form.formState.errors.driveUrl && (
          <small className="error" role="alert" id="order-drive-error">{form.formState.errors.driveUrl.message}</small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Los permisos se gestionan en Drive.</small>
      </label>
      <label>
        Notas
        <TextareaBase {...form.register("description")} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><ScaleButton
        className="primary"
        disabled={submission.pending} variant="primary"
      >
        {submission.pending ? "Guardando…" : "Crear orden"}
      </ScaleButton></SaveActions>
      </> : null}
      <FormValidationErrors errors={form.formState.errors}/>
      </PendingFields>
    </form>
  );
}
const accountSchema = z.object({
 name:z.string().trim().max(120).refine(value=>!value||value.length>=2,'Usá al menos 2 caracteres para el nombre.'),
 accountType:z.enum(['bank','cash','digital','investment']),currency:z.enum(currencyCodes),
 institution:z.string().max(100),accountNumber:z.string().max(80),holderName:z.string().max(120),holderTaxId:z.string().max(60),alias:z.string().max(120),accountSubtype:z.enum(['','savings','checking']),custodianUserId:z.string(),
});
type AccountValues=z.infer<typeof accountSchema>;
export function suggestedAccountName(values:{institution?:string;accountNumber?:string;holderName?:string;accountType?:string}){
 const institution=values.institution?.trim()||({cash:'Efectivo',digital:'Billetera',investment:'Inversión'}[values.accountType||'']||'Cuenta');
 return [institution,values.accountNumber?.trim()?`···${values.accountNumber.trim().slice(-4)}`:values.holderName?.trim()].filter(Boolean).join(' · ').slice(0,120);
}
export function AccountForm({custodians,request,done,initialCurrency,account}:{custodians:Member[];request:WorkspaceRequest;done:(account:Account)=>void;initialCurrency?:Account['currency'];account?:Account}){
 const {currency:defaultCurrency}=useCompanyCurrency();
 const form=useForm<AccountValues>({resolver:zodResolver(accountSchema),defaultValues:{name:account?.name||'',accountType:account?.account_type||'bank',currency:account?.currency||initialCurrency||defaultCurrency,institution:account?.institution||'',accountNumber:account?.account_number||'',holderName:account?.holder_name||'',holderTaxId:account?.holder_tax_id||'',alias:account?.alias||'',accountSubtype:account?.account_subtype||'',custodianUserId:account?.custodian_user_id||''}});
 const values=form.watch(),manualName=useRef(Boolean(account)),requestId=useRef(crypto.randomUUID());
 const [error,setError]=useState(''),[lookupBusy,setLookupBusy]=useState(false),[lookupError,setLookupError]=useState(''),[found,setFound]=useState<{record:RucRecord;taxId:string;holder:string}|null>(null);
 const lookupGeneration=useRef(0),mounted=useRef(true),lookupLock=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;lookupGeneration.current++;};},[]);
 useEffect(()=>{if(!manualName.current){const suggestion=values.institution.trim()||values.accountNumber.trim()||values.holderName.trim()||values.accountType!=='bank'?suggestedAccountName(values):'';if(values.name!==suggestion)form.setValue('name',suggestion,{shouldDirty:false});}},[values.institution,values.accountNumber,values.holderName,values.accountType,form]);
 useEffect(()=>{lookupGeneration.current++;setFound(null);},[values.holderTaxId]);
 const submission=useSingleFlightSubmit(event=>{setError('');return form.handleSubmit(submit,errors=>focus.onInvalid(errors))(event);});
 const focus=useFormFocus(submission.pending);
 async function lookup(){if(lookupLock.current||submission.pending)return;lookupLock.current=true;const taxId=form.getValues('holderTaxId'),holder=form.getValues('holderName'),generation=++lookupGeneration.current;setLookupBusy(true);setLookupError('');setFound(null);try{const record=await lookupRuc(taxId);if(mounted.current&&generation===lookupGeneration.current&&form.getValues('holderTaxId')===taxId)setFound({record,taxId,holder});}catch(cause){if(mounted.current&&generation===lookupGeneration.current)setLookupError(cause instanceof Error?cause.message:'Consulta no disponible; completá el titular manualmente.');}finally{lookupLock.current=false;if(mounted.current)setLookupBusy(false);}}
 async function submit(value:AccountValues){try{const data=await request<{account:Account}>(`/api/agency/accounts${account?'/'+account.id:''}`,{method:account?'PATCH':'POST',body:JSON.stringify({...value,accountSubtype:value.accountType==='bank'?value.accountSubtype||null:null,requestId:requestId.current,...(account?{expectedRevision:account.revision??0}:{})})});done(data.account);}catch(cause){if(cause instanceof ApiFieldError){const accepted:Record<string,{message:string}>={};for(const[key,message]of Object.entries(cause.fieldErrors))if(key in form.getValues()){form.setError(key as keyof AccountValues,{type:'server',message});accepted[key]={message};}focus.onInvalid(accepted);}setError(cause instanceof Error?cause.message:'No se pudo crear la cuenta.');}}
 const custodiansOptions:EntityOption[]=custodians.map(member=>({id:String(member.id),name:member.full_name?.trim()||member.email,secondary:teamRoleLabels[member.role]||member.role,photoUrl:member.photo_url,person:true,searchText:member.email}));
 return <form className="form-stack ops-form-grid account-form" noValidate onSubmit={submission.onSubmit} ref={focus.formRef} aria-busy={submission.pending}><PendingFields pending={submission.pending}>
  <div data-span="6"><LookupField id="account-holder-tax" label="RUC / documento del titular" value={values.holderTaxId} maxLength={60} onChange={event=>form.setValue('holderTaxId',event.target.value,{shouldDirty:true})} onLookup={()=>void lookup()} lookupLabel="Consultar RUC" state={lookupBusy?'loading':lookupError?'error':'idle'} disabled={submission.pending} policy={{allowed:!lookupBusy&&!!values.holderTaxId}} message={lookupError||'Consulta opcional si el proveedor está habilitado; siempre podés completar manualmente.'}/></div>
  <div data-span="6" data-form-field="institution"><label htmlFor="account-institution">Institución</label><div className="account-bank-input"><BancoLogo banco={values.institution} alto="h-7" soloCatalogo decorativo/><BancoCombobox id="account-institution" value={values.institution} onChange={(value:string)=>form.setValue('institution',value,{shouldDirty:true})} disabled={submission.pending} placeholder="Buscar banco o escribir otra institución" showSelectedLogo={false} showHorizontalLogo={false}/></div><small className="field-help">Catálogo OwnCoding UI; también admite una institución personalizada.</small></div>
  <div data-span="3"><SelectCustom label="Tipo de cuenta" value={values.accountType} choices={[{value:'bank',label:'Banco'},{value:'cash',label:'Efectivo'},{value:'digital',label:'Digital'},{value:'investment',label:'Inversión'}]} onChange={value=>form.setValue('accountType',value as AccountValues['accountType'],{shouldDirty:true})}/></div>
  <div data-span="3"><SelectCustom label="Moneda" value={values.currency} choices={currencyCodes.map(value=>({value,label:value}))} onChange={value=>form.setValue('currency',value as AccountValues['currency'],{shouldDirty:true})}/></div>
  <div data-span="6"><SelectCustom label="Modalidad bancaria" value={values.accountSubtype} disabled={values.accountType!=='bank'} choices={[{value:'',label:'Otra / sin especificar'},{value:'savings',label:'Caja de ahorro'},{value:'checking',label:'Cuenta corriente'}]} onChange={value=>form.setValue('accountSubtype',value as AccountValues['accountSubtype'],{shouldDirty:true})}/></div>
  {found?<div className="ops-wide"><LookupReview label="Revisar datos del titular" heading={rucApplyValues(found.record).legal_name} description="Aplicar completa sólo documento y nombre del titular. La consulta fiscal no acredita propiedad de esta cuenta bancaria." disabled={submission.pending} onDiscard={()=>setFound(null)} onApply={()=>{if(form.getValues('holderTaxId')!==found.taxId||form.getValues('holderName')!==found.holder){setFound(null);setLookupError('Los datos cambiaron; consultá nuevamente antes de aplicar.');return;}form.setValue('holderTaxId',found.record.tax_id,{shouldDirty:true});form.setValue('holderName',rucApplyValues(found.record).legal_name,{shouldDirty:true});setFound(null);}}><p>RUC {found.record.tax_id} · Fuente {found.record.source||'No informada'}</p></LookupReview></div>:null}
  <label data-span="6">Titular<InputControl {...form.register('holderName')} maxLength={120} placeholder="Empresa o persona titular"/></label>
  <label data-span="6">Número / referencia<InputControl {...form.register('accountNumber')} maxLength={80} placeholder="Número de cuenta"/></label>
  <label data-span="6">Nombre visible<InputControl {...form.register('name',{onChange:()=>{manualName.current=true;}})} maxLength={120} placeholder={suggestedAccountName(values)}/><small className="field-help">Sugerido automáticamente hasta que lo personalices.</small></label>
  <label data-span="6">Alias · Opcional<InputControl {...form.register('alias')} maxLength={120} placeholder="Operativa, ahorro, caja…"/></label>
  <div data-span="12" data-form-field="custodianUserId"><EntityPicker disabled={submission.pending} legend="Quién custodia este dinero" options={custodiansOptions} value={values.custodianUserId} onChange={value=>form.setValue('custodianUserId',value,{shouldDirty:true})} placeholder="Buscar persona…" searchLabel="Buscar persona" allowEmpty emptyLabel="Sin asignar"/></div>
  {error?<p className="error ops-wide" role="alert">{error}</p>:null}<p className="field-help ops-wide">Los datos del titular se declaran manualmente o se revisan después de consultar el RUC; no verificamos titularidad bancaria. {financePurposeNotice('treasury')} · <a href={financeNoticeHref('treasury')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p>
  <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><ScaleButton type="submit" className="primary" disabled={submission.pending} variant="primary">{submission.pending?'Guardando…':account?'Guardar cuenta':'Crear cuenta'}</ScaleButton></SaveActions><FormValidationErrors errors={form.formState.errors}/>
 </PendingFields></form>;
}
const invoiceSchema = z.object({
  clientId: z.string().min(1, "Elegí un cliente."),
  total: z.string().min(1, "Ingresá el importe.").refine(value=>Number.isFinite(Number(value))&&Number(value)>0, "El importe debe ser mayor a cero."),
  currency: z.enum(currencyCodes),
  dueOn: z.string().optional(),
});
type InvoiceValues = z.infer<typeof invoiceSchema>;
export function InvoiceForm({
  clients,
  request,
  done,
}: {
  clients: Client[];
  request: WorkspaceRequest;
  done: (invoice: Invoice) => void;
}) {
  const {currency:defaultCurrency}=useCompanyCurrency();
  const form = useForm<InvoiceValues>({
    resolver: zodResolver(invoiceSchema),
    mode: "onChange",
    defaultValues: { clientId: "", total: "", currency: defaultCurrency, dueOn: "" },
  });
  const clientId=form.watch("clientId"),total=form.watch("total");
  const clientOptions:EntityOption[]=clients.map(client=>({id:client.id,name:client.name,secondary:client.legal_name?.trim()||client.tax_id?.trim()||undefined,photoUrl:client.logo_url,logo:true,searchText:`${client.legal_name||''} ${client.tax_id||''}`}));
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(event=>{setError("");return form.handleSubmit(submit,errors=>focus.onInvalid(errors))(event);});
  const focus=useFormFocus(submission.pending);
  const canSubmit=Boolean(clientId)&&isPositiveInput(total)&&!submission.pending;
  async function submit(values: InvoiceValues) {
    try {
      const data = await request<{ invoice: Invoice }>("/api/agency/invoices", {
        method: "POST",
        body: JSON.stringify({...values,total:Number(values.total)}),
      });
      done(data.invoice);
    } catch (cause) {
      if(cause instanceof ApiFieldError){
        const accepted:Record<string,{message:string}>={};
        for(const [key,message] of Object.entries(cause.fieldErrors))if(key in form.getValues()){
          form.setError(key as keyof typeof values,{type:'server',message});accepted[key]={message};
        }
        focus.onInvalid(accepted);
      }
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la factura.",
      );
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
      ref={focus.formRef}
      aria-busy={submission.pending}
    >
      <PendingFields pending={submission.pending}>
      <div className="contents" data-form-field="clientId"><EntityPicker
        disabled={submission.pending}
        legend="Cliente"
        options={clientOptions}
        value={clientId}
        onChange={value=>form.setValue("clientId",value,{shouldValidate:true,shouldDirty:true})}
        error={form.formState.errors.clientId?.message}
        placeholder="Buscar cliente…"
        searchLabel="Buscar cliente"
      /></div>
      <label>
        Total sin IVA
        <AmountInput name="total" disabled={submission.pending} value={form.watch('total')||''} currency={form.watch('currency')} invalid={!!form.formState.errors.total} onChange={value=>form.setValue('total',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      {form.formState.errors.total?<small className="error" role="alert">{form.formState.errors.total.message}</small>:null}
      <fieldset data-form-field="currency">
        <legend>Moneda</legend>
        <div className="choice-list compact">
          {currencyCodes.map((currency) => (
            <button
              type="button"
              className={
                form.watch("currency") === currency ? "choice active" : "choice"
              }
              onClick={() => form.setValue("currency", currency,{shouldDirty:true})}
              key={currency}
            >
              {currency}
            </button>
          ))}
        </div>
      </fieldset>
      <label>
        Vencimiento
        <InputControl type="date" {...form.register("dueOn")} />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {!canSubmit&&!submission.pending?<p className="field-help">Completá el cliente y un importe mayor a cero para crear la factura.</p>:null}
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><ScaleButton
        className="primary"
        disabled={!canSubmit} variant="primary"
      >
        {submission.pending ? "Creando…" : "Crear factura"}
      </ScaleButton></SaveActions>
      <FormValidationErrors errors={form.formState.errors}/>
      </PendingFields>
    </form>
  );
}
const paymentSchema = z.object({
  invoiceId: z.string().min(1, "Elegí una factura."),
  accountId: z.string().min(1, "Elegí una cuenta."),
  amount: z.string().min(1, "Ingresá el importe cobrado.").refine(value=>Number.isFinite(Number(value))&&Number(value)>0, "El cobro debe ser mayor a cero."),
  receivedOn: z.string().optional(),
  reference: z.string().max(120).optional(),
  receivedByUserId: z.string().optional(),
});
type PaymentValues = z.infer<typeof paymentSchema>;
export function PaymentForm({
  invoices,
  accounts,
  custodians,
  request,
  done,
  preselectInvoiceId = "",
}: {
  invoices: Invoice[];
  accounts: Account[];
  custodians: Member[];
  request: WorkspaceRequest;
  done: () => void;
  /** Factura elegida desde la lista: el modal abre con esa factura marcada. */
  preselectInvoiceId?: string;
}) {
  const [requestId]=useState(()=>crypto.randomUUID());
  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    mode: "onChange",
    defaultValues: {
      invoiceId: preselectInvoiceId,
      accountId: "",
      amount: "",
      receivedOn: todayAsuncion(),
      reference: "",
      receivedByUserId: "",
    },
  });
  const [error, setError] = useState("");
  const submission=useSingleFlightSubmit(event=>{setError("");return form.handleSubmit(submit,errors=>focus.onInvalid(errors))(event);});
  const focus=useFormFocus(submission.pending);
  const invoiceId=form.watch("invoiceId"),accountId=form.watch("accountId"),amount=form.watch("amount");
  const canSubmit=Boolean(invoiceId)&&Boolean(accountId)&&isPositiveInput(amount)&&!submission.pending;
  const invoiceOptions:EntityOption[]=invoices
    .filter((invoice) => invoice.status !== "paid")
    .map((invoice) => {
      const pending=Number(invoice.total)-Number(invoice.paid_amount);
      return {id:invoice.id,name:`${invoice.number} · ${invoice.client_name}`,photoUrl:invoice.client_logo_url,logo:true,secondary:`Vence ${listDateShort(invoice.due_on)||'sin fecha'}`,context:`${money(pending,invoice.currency)} pendiente`,searchText:`${invoice.number} ${invoice.client_name}`};
    });
  const custodianOptions:EntityOption[]=custodians.map(member=>({id:String(member.id),name:member.full_name?.trim()||member.email,secondary:teamRoleLabels[member.role]||member.role,photoUrl:member.photo_url,person:true,searchText:member.email}));
  async function submit(values: PaymentValues) {
    try {
      await request("/api/agency/payments", {
        method: "POST",
        body: JSON.stringify({...values,amount:Number(values.amount),requestId}),
      });
      done();
    } catch (cause) {
      if(cause instanceof ApiFieldError){
        const accepted:Record<string,{message:string}>={};
        for(const [key,message] of Object.entries(cause.fieldErrors))if(key in form.getValues()){
          form.setError(key as keyof typeof values,{type:'server',message});accepted[key]={message};
        }
        focus.onInvalid(accepted);
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo registrar el cobro.",
      );
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
      ref={focus.formRef}
      aria-busy={submission.pending}
    >
      <PendingFields pending={submission.pending}>
      <div className="contents" data-form-field="invoiceId"><EntityPicker
        disabled={submission.pending}
        legend="Factura"
        options={invoiceOptions}
        value={invoiceId}
        onChange={value=>form.setValue("invoiceId",value,{shouldValidate:true,shouldDirty:true})}
        error={form.formState.errors.invoiceId?.message}
        placeholder="Buscar factura o cliente…"
        searchLabel="Buscar factura"
      /></div>
      {custodianOptions.length?<div className="contents" data-form-field="receivedByUserId"><EntityPicker
        disabled={submission.pending}
        legend="Quién recibió el cobro"
        options={custodianOptions}
        value={form.watch("receivedByUserId")||""}
        onChange={value=>form.setValue("receivedByUserId",value,{shouldValidate:true,shouldDirty:true})}
        placeholder="Buscar persona…"
        searchLabel="Buscar persona"
      /></div>:null}
      <fieldset data-form-field="accountId">
        <legend>Cuenta de ingreso</legend>
        <div className="choice-list">
          {accounts.map((account) => (
            <button
              type="button"
              className={
                form.watch("accountId") === account.id
                  ? "choice active max-w-full !whitespace-normal break-words text-left"
                  : "choice max-w-full !whitespace-normal break-words text-left"
              }
              onClick={() =>
                form.setValue("accountId", account.id, { shouldValidate: true,shouldDirty:true })
              }
              key={account.id}
              title={`${account.name} · ${account.currency}`}
            >
              {account.name} · {account.currency}
            </button>
          ))}
        </div>
      </fieldset>
      {form.formState.errors.accountId?<small className="error" role="alert">{form.formState.errors.accountId.message}</small>:null}
      <label>
        Importe cobrado
        <AmountInput name="amount" disabled={submission.pending} value={form.watch('amount')||''} currency={paymentCurrency(accounts,invoices,form.watch('accountId'),invoiceId)} invalid={!!form.formState.errors.amount} onChange={value=>form.setValue('amount',value,{shouldValidate:true,shouldDirty:true})}/>
      </label>
      {form.formState.errors.amount?<small className="error" role="alert">{form.formState.errors.amount.message}</small>:null}
      <label>
        Fecha
        <InputControl type="date" {...form.register("receivedOn")} />
      </label>
      <label>
        Referencia
        <InputControl
          {...form.register("reference")}
          placeholder="Transferencia / comprobante"
        />
      </label>
      {error && <p className="error" role="alert">{error}</p>}
      {!canSubmit&&!submission.pending?<p className="field-help">Elegí la factura, la cuenta y un importe mayor a cero para registrar el cobro.</p>:null}
      <p className="field-help">{financePurposeNotice('payments')} · <a href={financeNoticeHref('payments')} target="_blank" rel="noreferrer">Aviso de Privacidad</a></p>
      <SaveActions pending={submission.pending} dirty={form.formState.isDirty}><ScaleButton
        className="primary"
        disabled={!canSubmit} variant="primary"
      >
        {submission.pending ? "Guardando…" : "Registrar cobro"}
      </ScaleButton></SaveActions>
      <FormValidationErrors errors={form.formState.errors}/>
      </PendingFields>
    </form>
  );
}

