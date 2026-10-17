"use client";
import {OptionalMark,optionalLabel} from './field-label';
import {money} from './money-format';
import {normalizeWholeMoney} from './amount-format';
import {currencyChoices} from "./currencies";
import {ProjectPresence} from './presence';
import { useEffect, useState, useRef, useId, useImperativeHandle, type ReactNode, type Ref } from "react";
import {Dialog,FormActions,useDialogPending,useDialogClose} from "./dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {validateCivilDate,validateTime} from './ui/temporal-value';
import { Building2, MessageSquare, Star } from "lucide-react";
import { AmountInput, SelectCustom, type SelectChoice } from './profile-controls';
import {PHONE_ERROR, phoneValid, emailValid, EMAIL_ERROR} from './field-rules';
import {PasswordField} from './password-field';
import {PhoneField} from './phone-field';
import {EmailField} from './email-field';
import {EmptyBlock,LoadingBlock} from './ui-v2';
import {DriveLinkNote} from './drive-link';
import {DriveLinksInput,parseDriveLinksText} from './drive-links';
import {ActorIdentity} from './actor-identity';
import {PersonContainer} from './person-container';
import {FotoPerfil} from './foto-perfil';
import {CommentBody,CommentComposer} from './commenting';
import {notifyMutation} from './feedback';
import {teamRoleLabels} from './team-directory';
import {PeopleWorkspace} from './team-workspace';
import {dataFetch} from './data-cache';
import {transporteError} from './workspace-request';
import {canOpenPeopleWorkspace} from './capabilities';

/** Structured field errors are consumed only when the API explicitly names fields. */
export class ApiFieldError extends Error {
  readonly fieldErrors:Record<string,string>;
  constructor(message:string,fields:unknown){
    super(message);this.name='ApiFieldError';this.fieldErrors={};
    if(fields&&typeof fields==='object'&&!Array.isArray(fields))for(const [key,value] of Object.entries(fields)){
      if(typeof value==='string'&&value.trim()&&key!=='__proto__'&&key!=='constructor'&&key!=='prototype')Object.defineProperty(this.fieldErrors,key,{value,enumerable:true});
    }
  }
}
export async function api<T>(
  path: string,
  body?: unknown,
  method = "POST",
  options?:{signal?:AbortSignal},
): Promise<T> {
  let r: Response;
  try {
    r = await dataFetch(path.startsWith("/core-api/") ? path : `/core-api${path}`, {
      credentials: "include",
      signal:options?.signal,
      method: body === undefined ? "GET" : method,
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    // Un fallo de red nunca llega como mensaje del servidor (§15.6).
    if(options?.signal?.aborted)throw cause;
    throw transporteError(cause);
  }
  let data: T & {error?: string;fieldErrors?:unknown};
  try {
    data = (await r.json()) as T & {error?: string;fieldErrors?:unknown};
  } catch {
    // Una respuesta no-JSON nunca es un dato: se dice en es-PY y sin el cuerpo crudo.
    if (!r.ok) throw new Error(r.status >= 500 ? "El servidor no pudo completar la operación. Probá de nuevo en unos segundos." : `No se pudo completar la operación (HTTP ${r.status}).`);
    throw new Error("El servidor devolvió una respuesta inválida. Reintentá.");
  }
  if (!r.ok) throw new ApiFieldError(typeof data?.error==='string'?data.error:"No se pudo completar la operación",data?.fieldErrors);
  notifyMutation(path,body===undefined?'GET':method,body,data);
  if(body!==undefined&&/^\/api\/agency\/(productivity\/profile|collaborators(?:\/\d+)?)$/.test(path))window.dispatchEvent(new Event('scale:identity-changed'));
  return data as T;
}
const message = (e: unknown) =>
  e instanceof Error ? e.message : "No se pudo completar la operación";
export {money};
export {Dialog} from './dialog';
type Choice = SelectChoice;
export type Field = {
  key: string;
  label: string;
  type?: "number" | "date" | "time" | "email" | "url" | "textarea" | "money" | "password" | "phone" | "checkbox";
  choices?: Choice[];
  optional?: boolean;
  section?: string;
  wide?: boolean;
  /** Relative width in the canonical responsive form grid (12 columns). */
  span?: 2|3|4|6|12;
  placeholder?: string;
  help?: string;
  integer?: boolean;
  maxLength?: number;
  /** Inclusive civil date / HH:mm bounds; business ranges belong to the consumer. */
  min?:string;
  max?:string;
  currencyKey?: string;
  currency?: string;
  currencyFrom?: (values: Record<string, string>) => string;
  /** Valor dependiente; undefined conserva la edición independiente del campo. */
  valueFrom?: (values: Record<string, string>) => string | undefined;
  lookup?: {
    label:string;
    run:(value:string,context?:{signal:AbortSignal;snapshot:Readonly<Record<string,string>>})=>Promise<Record<string,string>>;
    /** Called only after the snapshot still matches and returned fields are applied. */
    onApplied?:(values:Record<string,string>)=>void;
  };
  /** Deshabilita el campo según los valores actuales del formulario (p. ej. dependientes de un interruptor maestro). */
  disabled?: boolean | ((values: Record<string, string>) => boolean);
  /** Regla propia del campo: devuelve el mensaje de error o null/'' si es válido (se aplica solo con valor). */
  validate?: (value: string) => string | null | undefined;
  /** Contenido contextual bajo el campo (p. ej. la tarjeta de confirmación de una consulta). */
  after?: ReactNode;
};
const currencies = currencyChoices;
/** Patch a dependent field without resetting the canonical form or its errors. */
export type EditorHandle={getValues:()=>Record<string,string>;patchValues:(values:Record<string,string>)=>void};
export function Editor({
  fields,
  defaults,
  save,
  label = "Guardar",
  columns = true,
  closeOnSave = false,
  resetOnSave = false,
  cancelLabel = 'Cancelar',
  collapseSections = false,
  secondaryAction,
  formHandle,
}: {
  fields: Field[];
  defaults: Record<string, string>;
  save: (v: Record<string, string>) => Promise<void>;
  label?: string;
  columns?: boolean;
  closeOnSave?: boolean;
  resetOnSave?: boolean;
  cancelLabel?: string | false;
  /** Secciones (`Field.section`) colapsadas salvo la primera; la primera con error se abre sola. */
  collapseSections?: boolean;
  /** Segundo guardado (p. ej. «Guardar y crear otro»): misma validación, deja el formulario limpio y enfocado en el primer campo. */
  secondaryAction?: {label: string; save: (v: Record<string, string>) => Promise<void>};
  formHandle?:Ref<EditorHandle>;
}) {
  const serverErrors=useRef<Record<string,{value:string;message:string}>>({});
  const shape: Record<string, z.ZodString> = {};
  for (const f of fields) {
    let s = z.string();
    if(f.maxLength!==undefined)s=s.max(f.maxLength,`Usá hasta ${f.maxLength} caracteres.`);
    if (!f.optional) s = s.min(1, `Completá ${f.label.toLowerCase()}`);
    if(f.integer)s=s.refine(value=>value===''||(f.type==='money'?normalizeWholeMoney(value)!==null:/^\d+$/.test(value)),'Ingresá un número entero.');
    if(f.type==='phone')s=s.refine(value=>value===''||phoneValid(value),PHONE_ERROR);
    if(f.type==='email')s=s.refine(value=>value===''||emailValid(value),EMAIL_ERROR);
    if(f.type==='date'||f.type==='time'){
      const valid=f.type==='date'?validateCivilDate:validateTime;
      s=s.refine(value=>value===''||valid(value),f.type==='date'?'Ingresá una fecha válida.':'Ingresá una hora válida (HH:mm).');
      if(f.min)s=s.refine(value=>value===''||!valid(value)||!valid(f.min!)||value>=f.min!,`El valor debe ser igual o posterior a ${f.min}.`);
      if(f.max)s=s.refine(value=>value===''||!valid(value)||!valid(f.max!)||value<=f.max!,`El valor debe ser igual o anterior a ${f.max}.`);
    }
    const check=f.validate;
    shape[f.key] = check?s.superRefine((value,ctx)=>{const problem=value===''?null:check(value);if(problem)ctx.addIssue({code:'custom',message:problem});}):s;
  }
  const form = useForm<Record<string, string>>({
    resolver:async(values,context,options)=>{
      const result=await zodResolver(z.object(shape))(values,context,options);
      for(const [key,problem] of Object.entries(serverErrors.current)){
        if(values[key]!==problem.value){delete serverErrors.current[key];continue;}
        result.errors[key]={type:'server',message:problem.message};
      }
      return Object.keys(result.errors).length?{values:{},errors:result.errors}:result;
    },
    defaultValues: defaults,
  });
  const currentValues=form.watch();
  useEffect(()=>{
    for(const field of fields){
      const next=field.valueFrom?.(currentValues);
      if(next!==undefined&&next!==form.getValues(field.key))form.setValue(field.key,next,{shouldDirty:form.formState.isDirty,shouldValidate:true});
    }
  },[fields,currentValues,form]);
  const [error, setError] = useState("");
  const formPrefix=useId(),saving=useRef(false),requestClose=useDialogClose();
  const [savingNow,setSavingNow]=useState(false),[saved,setSaved]=useState(false);
  const [lookupBusy,setLookupBusy]=useState(''),[lookupNotices,setLookupNotices]=useState<Record<string,string>>({});
  const lookupRequest=useRef<{generation:number;controller:AbortController;key:string;value:string}|null>(null),lookupGeneration=useRef(0);
  const fieldElements=useRef(new Map<string,HTMLDivElement>()),[focusTarget,setFocusTarget]=useState<{key:string}|null>(null);
  const pending=form.formState.isSubmitting||savingNow;
  useEffect(()=>()=>{lookupGeneration.current++;lookupRequest.current?.controller.abort();},[]);
  useEffect(()=>{
    const request=lookupRequest.current;
    if(request&&form.getValues(request.key)!==request.value){lookupGeneration.current++;request.controller.abort();lookupRequest.current=null;setLookupBusy('');setLookupNotices(current=>({...current,[request.key]:'El valor cambió. Volvé a buscar para usar los datos actuales.'}));}
  },[currentValues,form]);
  useEffect(()=>{
    if(!focusTarget||pending)return;
    const element=fieldElements.current.get(focusTarget.key)?.querySelector<HTMLElement>('input:not(:disabled),select:not(:disabled),textarea:not(:disabled),button:not(:disabled)');
    element?.focus();setFocusTarget(null);
  },[focusTarget,pending]);
  // Cambios sin guardar (aviso al cerrar): solo cuenta lo que la persona tocó; una
  // normalización del campo al montar no convierte el formulario en «sucio».
  const [interacted,setInteracted]=useState(false);
  useImperativeHandle(formHandle,()=>({getValues:()=>({...form.getValues()}),patchValues:values=>{
    for(const [key,value] of Object.entries(values))if(fields.some(field=>field.key===key))form.setValue(key,value,{shouldDirty:true,shouldValidate:true});
    setInteracted(true);
  }}),[form,fields]);
  useDialogPending(pending,interacted&&form.formState.isDirty&&!pending);
  // Secciones (issue #183): grupos plegables, resumen de errores y, en móvil con
  // 3 o más secciones, pasos Anterior/Siguiente. Sin `section` nada de esto aparece.
  const sectionNames=Array.from(new Set(fields.map(f=>f.section).filter((name):name is string=>Boolean(name))));
  const [openedSections,setOpenedSections]=useState<string[]|null>(null),[step,setStep]=useState(0),[narrow,setNarrow]=useState(false);
  useEffect(()=>{
    if(typeof window==='undefined'||typeof window.matchMedia!=='function')return;
    const query=window.matchMedia('(max-width: 540px)'),update=()=>setNarrow(query.matches);
    update();query.addEventListener?.('change',update);
    return()=>query.removeEventListener?.('change',update);
  },[]);
  const stepper=narrow&&sectionNames.length>=3,activeStep=Math.min(step,Math.max(sectionNames.length-1,0));
  const sectionIsOpen=(name:string)=>openedSections?openedSections.includes(name):!collapseSections||name===sectionNames[0];
  const setSectionOpen=(name:string,open:boolean)=>setOpenedSections(current=>{
    const base=current??sectionNames.filter(entry=>!collapseSections||entry===sectionNames[0]);
    return open?(base.includes(name)?base:[...base,name]):base.filter(entry=>entry!==name);
  });
  const sectionErrorCount=(name:string)=>fields.filter(f=>f.section===name&&form.formState.errors[f.key]).length;
  const errorSections=sectionNames.filter(name=>sectionErrorCount(name)>0);
  const showSectionSummary=form.formState.submitCount>0&&errorSections.length>0;
  const revealSection=(name:string)=>{setSectionOpen(name,true);const index=sectionNames.indexOf(name);if(index>=0)setStep(index);};
  useEffect(()=>{if(saved&&!pending){setSaved(false);requestClose?.({afterSave:true});}},[saved,pending,requestClose]);
  async function runLookup(f:Field){
    if(!f.lookup||pending)return;
    const snapshot={...form.getValues()},value=(snapshot[f.key]||'').trim();
    lookupRequest.current?.controller.abort();lookupRequest.current=null;setLookupBusy('');
    const generation=++lookupGeneration.current,controller=new AbortController();
    setLookupNotices(current=>({...current,[f.key]:''}));
    if(!value){setLookupNotices(current=>({...current,[f.key]:`Escribí ${f.label} primero.`}));return;}
    lookupRequest.current={generation,controller,key:f.key,value:snapshot[f.key]};setLookupBusy(f.key);
    try{
      const found=await f.lookup.run(value,{signal:controller.signal,snapshot});
      if(controller.signal.aborted||generation!==lookupGeneration.current)return;
      const known=new Set(fields.map(field=>field.key));
      const entries=Object.entries(found).filter(([key])=>known.has(key));
      if(form.getValues(f.key)!==snapshot[f.key]||entries.some(([key])=>form.getValues(key)!==snapshot[key])){
        setLookupNotices(current=>({...current,[f.key]:'Editaste estos datos durante la consulta. Se conservaron tus cambios; volvé a buscar para revisarlos.'}));return;
      }
      for(const [key,next] of entries)form.setValue(key,String(next),{shouldValidate:true,shouldDirty:true});
      setInteracted(true);f.lookup.onApplied?.(Object.fromEntries(entries));
      setLookupNotices(current=>({...current,[f.key]:'Datos encontrados. Revisá y guardá.'}));
    }catch(cause){if(!controller.signal.aborted&&generation===lookupGeneration.current)setLookupNotices(current=>({...current,[f.key]:message(cause)}));}
    finally{if(generation===lookupGeneration.current){lookupRequest.current=null;setLookupBusy('');}}
  }
  const focusError=(key:string)=>{const section=fields.find(field=>field.key===key)?.section;if(section)revealSection(section);setFocusTarget({key});};
  const renderField = (f: Field) => {
    const id=`${formPrefix}-${f.key}`,invalid=!!form.formState.errors[f.key];
    const describedBy=[f.help?`${id}-help`:null,invalid?`${id}-error`:null,lookupNotices[f.key]?`${id}-lookup`:null].filter(Boolean).join(' ')||undefined;
    const derivedCurrency=f.currencyFrom?(f.currencyFrom(form.watch() as Record<string,string>)):undefined;
    // Un campo dependiente se deshabilita con los valores actuales (issue #152);
    // el guardado del formulario conserva el valor tal como se guardó antes.
    const fieldDisabled=pending||(typeof f.disabled==='boolean'?f.disabled:Boolean(f.disabled?.(form.watch() as Record<string,string>)));
    return <div ref={element=>{if(element)fieldElements.current.set(f.key,element);else fieldElements.current.delete(f.key);}} key={f.key} data-field={f.key} data-span={f.span} className={f.wide || f.type === 'textarea' || f.type === 'url' || ['title','description','drive_url','drive_links','address','notes','legal_name'].includes(f.key) ? 'ops-wide' : undefined}>
      {f.type==='checkbox'?<label htmlFor={id} className="ops-checkbox-field"><input id={id} type="checkbox" checked={form.watch(f.key)==='true'} disabled={fieldDisabled} aria-invalid={invalid||undefined} aria-describedby={describedBy} onChange={event=>form.setValue(f.key,String(event.target.checked),{shouldValidate:true,shouldDirty:true})}/><span>{f.label}</span></label>:f.choices ? <SelectCustom label={optionalLabel(f.label,Boolean(f.optional))} choices={f.choices} value={form.watch(f.key)||''} disabled={fieldDisabled} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <label htmlFor={id}><span>{f.key==='drive_url'||f.key==='drive_links'?'Enlace de archivo o carpeta de Drive':f.label}{f.optional&&<OptionalMark/>}</span>
        {f.key==='drive_links' ? (
          <DriveLinksInput value={form.watch(f.key)||''} disabled={fieldDisabled} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/>
        ) : f.type === 'textarea' ? <textarea id={id} disabled={fieldDisabled} aria-invalid={invalid||undefined} aria-describedby={describedBy} placeholder={f.placeholder} maxLength={f.maxLength} {...form.register(f.key)}/> : f.type === 'password' ? <PasswordField bare id={id} invalid={invalid} describedBy={describedBy} label={f.label} name={f.key} disabled={fieldDisabled} value={form.watch(f.key)||''} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})} autoComplete="new-password" required={!f.optional} minLength={8}/> : f.type === 'money' ? <AmountInput id={id} disabled={fieldDisabled} invalid={invalid} describedBy={describedBy} placeholder={f.placeholder||'0'} value={form.watch(f.key)||''} currency={f.currency||derivedCurrency||form.watch(f.currencyKey||'currency')||'PYG'} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : f.type === 'phone' ? <PhoneField id={id} value={form.watch(f.key)||''} disabled={fieldDisabled} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : f.type === 'email' ? <EmailField id={id} value={form.watch(f.key)||''} disabled={fieldDisabled} invalid={invalid} describedBy={describedBy} onChange={value=>form.setValue(f.key,value,{shouldValidate:true,shouldDirty:true})}/> : <span className={f.lookup?'ops-lookup-row':undefined}><input id={id} disabled={fieldDisabled} aria-invalid={invalid||undefined} aria-describedby={describedBy} inputMode={f.type === 'number' ? (f.integer?'numeric':'decimal') : undefined} type={f.type||'text'} min={f.min} max={f.max} step={f.type === 'number' ? f.integer?'1':'0.01' : undefined} placeholder={f.placeholder} maxLength={f.maxLength} {...form.register(f.key)}/>{f.lookup&&<button type="button" className="text-button ops-lookup-button" disabled={fieldDisabled||lookupBusy===f.key} onClick={()=>void runLookup(f)}>{lookupBusy===f.key?'Buscando…':f.lookup.label}</button>}</span>}
      </label>}
      {f.help&&<small id={`${id}-help`} className="field-help">{f.help}</small>}
      {invalid&&<small id={`${id}-error`} className="error" role="alert">{String(form.formState.errors[f.key]?.message)}</small>}
      {lookupNotices[f.key]&&<small id={`${id}-lookup`} className="field-help ops-lookup-note" role="status">{lookupNotices[f.key]}</small>}
      {f.after}
    </div>;
  };
  const submitWith=(saveFn:(v:Record<string,string>)=>Promise<void>,another=false)=>form.handleSubmit(async (v) => {
        if(saving.current)return;
        saving.current=true;
        setSavingNow(true);
        setError("");
        try {
          const values:Record<string,unknown>={...v};
          for(const field of fields)if(field.type==='money'&&field.integer&&v[field.key]!=='')values[field.key]=normalizeWholeMoney(v[field.key]);
          if(typeof values.drive_links==='string')values.drive_links=parseDriveLinksText(values.drive_links);
          // `drive_links` is normalized to structured link objects just before
          // sending it to the API. Keep the public Editor contract string-based
          // so every existing form remains simple and type-safe.
          await saveFn(values as unknown as Record<string, string>);
          lookupGeneration.current++;lookupRequest.current?.controller.abort();lookupRequest.current=null;setLookupBusy('');serverErrors.current={};
          if(resetOnSave||another){form.reset(defaults);if(another){const first=fields[0]?.key;if(first)form.setFocus(first);}}
          // Lo guardado pasa a ser la base: cerrar después no pide descartar nada.
          else form.reset(v);
          setInteracted(false);
          // Most existing editors close in their own success callback. Only
          // simple edit dialogs opt in; multi-action detail drawers stay open.
          if(closeOnSave&&!another)setSaved(true);
        } catch (e) {
          setError(message(e));
          if(e instanceof ApiFieldError){
            for(const field of fields){const problem=e.fieldErrors[field.key];if(problem){serverErrors.current[field.key]={value:v[field.key],message:problem};form.setError(field.key,{type:'server',message:problem});}}
            const first=fields.find(field=>e.fieldErrors[field.key]);if(first)focusError(first.key);
          }
        } finally {
          saving.current=false;
          setSavingNow(false);
        }
      },invalid=>{
        // La primera sección con error se abre sola (y en móvil se salta a su paso).
        const first=fields.find(field=>invalid[field.key]);
        if(first)focusError(first.key);
      });
  return (
    <form
      className={columns ? "form-stack ops-form-grid" : "form-stack"}
      noValidate
      aria-busy={pending}
      onKeyDownCapture={()=>{if(!interacted)setInteracted(true);}}
      onPointerDownCapture={()=>{if(!interacted)setInteracted(true);}}
      onSubmit={submitWith(save)}
    >
      {fields.some(f=>f.key==='drive_url'||f.key==='drive_links')&&<div className="ops-wide"><DriveLinkNote multiple={fields.some(f=>f.key==='drive_links')}/></div>}
      {fields.filter(f=>!f.section).map(renderField)}
      {showSectionSummary&&<div className="error form-error-summary ops-wide" role="alert">
        <span>Revisá {errorSections.length===1?'esta sección':'estas secciones'}:</span>{' '}
        {errorSections.map((name,index)=><span key={name}>{index>0?', ':''}<button type="button" className="text-button" onClick={()=>revealSection(name)}>{name} ({sectionErrorCount(name)})</button></span>)}
      </div>}
      {sectionNames.map((section,index)=>{
        const errors=sectionErrorCount(section);
        return <details className="ops-profile-section ops-wide" key={section} open={stepper||sectionIsOpen(section)} hidden={stepper&&index!==activeStep} data-section-errors={errors||undefined}
          onToggle={event=>{if(!stepper)setSectionOpen(section,(event.currentTarget as HTMLDetailsElement).open);}}>
          <summary>{section}{errors>0&&<span className="ops-section-errors"> · {errors} con error</span>}</summary><div className="ops-form-grid">{fields.filter(f=>f.section===section).map(renderField)}</div>
        </details>;
      })}
      {stepper&&<div className="ops-stepper ops-wide" role="group" aria-label="Pasos del formulario">
        <button type="button" className="secondary" disabled={pending||activeStep===0} onClick={()=>setStep(activeStep-1)}>Anterior</button>
        <span aria-live="polite">Paso {activeStep+1} de {sectionNames.length}</span>
        <button type="button" className="secondary" disabled={pending||activeStep>=sectionNames.length-1} onClick={()=>setStep(activeStep+1)}>Siguiente</button>
      </div>}
      {error && (
        <p className="error form-error-summary ops-wide" role="alert">
          {error}
        </p>
      )}
      <FormActions>{requestClose&&cancelLabel&&<button className="secondary" type="button" disabled={pending} onClick={()=>requestClose()}>{cancelLabel}</button>}{secondaryAction&&<button className="secondary" type="button" disabled={pending} onClick={()=>void submitWith(secondaryAction.save,true)()}>{secondaryAction.label}</button>}<button type="submit" className="primary ops-wide" disabled={pending}>
        {pending ? "Guardando…" : label}
      </button></FormActions>
    </form>
  );
}
export function OperationsWorkspace({
  role,
  capabilities,
  currentEmail='',
  currentUserId='',
  organizationName='',
}: {
  role: string;
  capabilities?:Record<string,boolean>;
  currentEmail?:string;
  currentUserId?:string;
  organizationName?:string;
}) {
  if(!canOpenPeopleWorkspace(role,capabilities))return <TeamDirectoryView organizationName={organizationName}/>;
  return <PeopleWorkspace capabilities={capabilities} role={role} currentEmail={currentEmail} currentUserId={currentUserId}/>;
}
type DirectoryPerson={id:string;full_name:string;photo_url:string|null;role:string;cargo?:string};
function TeamDirectoryView({organizationName}:{organizationName:string}){
  const [directory,setDirectory]=useState<DirectoryPerson[]>([]),[loaded,setLoaded]=useState(false),[error,setError]=useState('');
  useEffect(()=>{let alive=true;void api<{directory:DirectoryPerson[]}>('/api/agency/team').then(data=>{if(alive){setDirectory(Array.isArray(data?.directory)?data.directory:[]);setLoaded(true);}}).catch(e=>{if(alive)setError(message(e));});return()=>{alive=false;};},[]);
  return <div className="ops-stack">
    <section className="panel">
      <div className="mb-4 min-w-0">
        <h2 className="text-[17px] font-semibold tracking-tight text-fore">Directorio interno</h2>
        <p className="mt-1 text-[13px] leading-[1.5] text-mute">Foto, nombre y cargo. Los datos personales de cada integrante se administran desde su propio perfil.</p>
      </div>
      {error&&<p className="error" role="alert">{error}</p>}
      {directory.length?<div className="ops-grid team-directory-grid">
        {directory.map(person=><article className="ops-card team-directory-card" key={person.id}><PersonContainer size="lg" name={person.full_name||'Integrante'} photoUrl={person.photo_url||undefined} secondary={teamRoleLabels[person.role]||person.cargo||'Sin cargo'} verified/></article>)}
      </div>:error?null:loaded?<EmptyBlock title="Sin integrantes para mostrar" description="Cuando la empresa tenga personas activas vas a verlas acá."/>:<LoadingBlock label="Cargando equipo…" lines={3}/>}
    </section>
  </div>;
}
export function ProjectComments({
  projectId,
  name,
  role,
}: {
  projectId: string;
  name: string;
  role: string;
}) {
  const [open, setOpen] = useState(false),
    [comments, setComments] = useState<
      { id: string; body: string; author_email: string; created_at: string; actor_name?:string; actor_photo_url?:string; actor_verified?:boolean }[]
    >([]),
    [error, setError] = useState("");
  async function load() {
    setComments(
      (
        await api<{ comments: typeof comments }>(
          `/api/agency/projects/${projectId}/comments`,
        )
      ).comments,
    );
  }
  return (
    <>
      <button
        className="text-button"
        onClick={() => {
          setOpen(true);
          load().catch((e) => setError(message(e)));
        }}
      >
        <MessageSquare size={14} /> Comentarios
      </button>
      {open && (
        <Dialog title={`Seguimiento · ${name}`} close={() => setOpen(false)}>
          <ProjectPresence projectId={projectId}/>
          <div className="ops-comments">
            {comments.map((c) => (
              <article className="ops-comment" key={c.id}>
                <ActorIdentity name={c.actor_name||c.author_email||'Integrante'} photoUrl={c.actor_photo_url} verified={c.actor_verified===true} timestamp={c.created_at}/>
                <CommentBody value={c.body}/>
              </article>
            ))}
            {!comments.length && (
              <p className="empty-copy">
                Todavía no hay comentarios. Dejá el próximo paso o una
                actualización.
              </p>
            )}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
          {role !== "viewer" && (
            <CommentComposer
              label="Comentario"
              save={async (body,mentionedUserIds) => {
                await api(`/api/agency/projects/${projectId}/comments`, {body,mentioned_user_ids:mentionedUserIds});
                await load();
              }}
            />
          )}
        </Dialog>
      )}
    </>
  );
}
/** Evento que avisa al selector de empresa que cambió el logo (Configuración › Empresa). */
export const COMPANY_LOGO_EVENT='scale:company-logo-changed';
/** Marca de la empresa en el selector: el logo (objeto único de foto, variante logo) o el edificio. */
function CompanyMark({name,logo}:{name:string;logo?:string|null}){
  return logo?<FotoPerfil nombre={name} foto={logo} tamano="xs" forma="cuadrado" variante="logo" className="company-mark"/>:<Building2 size={16} />;
}
export function CompanySelector({ name, logo }: { name: string; logo?: string|null }) {
  // El logo llega con la sesión; si se cambia en Configuración se refleja sin recargar.
  const [logoOverride,setLogoOverride]=useState<{value:string|null}|null>(null);
  useEffect(()=>{const update=(event:Event)=>{const value=(event as CustomEvent<{logo?:string|null}>).detail?.logo;setLogoOverride({value:typeof value==='string'&&value?value:null});};window.addEventListener(COMPANY_LOGO_EVENT,update);return()=>window.removeEventListener(COMPANY_LOGO_EVENT,update);},[]);
  const companyLogo=logoOverride?logoOverride.value:logo||null;
  const [companies, setCompanies] = useState<
      { id: string; name: string; role: string;isDemo?:boolean }[]
    >([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState("");
  const [preferred,setPreferred]=useState<string|null>(null);
  const preferenceLock=useRef(false);
  useEffect(() => {
    let generation=0,alive=true;
    const load=(initial=false)=>{const version=++generation;void api<{ organizations: typeof companies; defaultOrganizationId?:string|number|null }>("/api/auth/organizations")
      .then((d) => {
        if(!alive||version!==generation)return;
        // A demo is an isolated session opened only from the public landing.
        // It is never a company the person can browse to from a real workspace.
        const realCompanies=d.organizations.filter(company=>!company.isDemo);
        setCompanies(realCompanies);
        setLoaded(true);
        setPreferred(d.defaultOrganizationId&&realCompanies.some(company=>String(company.id)===String(d.defaultOrganizationId))?String(d.defaultOrganizationId):null);
        if (
          initial && realCompanies.length > 1 &&
          !d.defaultOrganizationId &&
          !sessionStorage.getItem("scale_company_selected")
        )
          setOpen(true);
      })
      .catch((e) => {if(alive&&version===generation)setError(message(e));});};
    load(true);const refresh=()=>load();window.addEventListener('scale:default-company-changed',refresh);
    return()=>{alive=false;generation++;window.removeEventListener('scale:default-company-changed',refresh);};
  }, []);
  // Con una sola empresa accesible (#147) no hay nada que elegir: el control
  // deja de ser un disparador y explica dónde estás; la Configuración conserva
  // la lista completa con la estrella de empresa predeterminada.
  const singleCompany = loaded && !error && companies.length <= 1;
  return (
    <>
      {singleCompany ? (
        <span className="workspace" title={`Estás en ${name}; no tenés otras empresas`} aria-label={`Empresa actual: ${name}. No tenés otras empresas.`}>
          <CompanyMark name={name} logo={companyLogo}/>
          <span className="company-name">{name}</span>
        </span>
      ) : (
        <button className="workspace" title={name} onClick={() => setOpen(true)}>
          <CompanyMark name={name} logo={companyLogo}/>
          <span className="company-name">{name}</span>
        </button>
      )}
      {open && (
        <Dialog title="Elegí la empresa" close={() => setOpen(false)}>
          <p className="form-note">
            Solo aparecen las empresas que te dieron acceso.
          </p>
          {!companies.length && !error ? <p className="form-note" role="status">Cargando tus empresas…</p> : null}
          <div className="ops-stack">
            {companies.map((c) => (
              <div key={c.id} className="company-choice-row">
              <button
                className="choice"
                disabled={busy}
                key={c.id}
                onClick={async () => {
                  if(preferenceLock.current)return;preferenceLock.current=true;
                  setBusy(true);
                  setError('');
                  try {
                    await api("/api/auth/switch-organization", {
                      organizationId: c.id,
                    });
                    try{sessionStorage.setItem("scale_company_selected", "1");}catch{/* Navigation must still complete. */}
                    window.location.assign("/");
                  } catch (e) {
                    setError(message(e));
                    setBusy(false);
                    preferenceLock.current=false;
                  }
                }}
              >
                {c.name} · {c.role}
              </button>
              {!c.isDemo&&<button type="button" className="text-button" disabled={busy||preferred===String(c.id)} onClick={async()=>{
                if(preferenceLock.current)return;preferenceLock.current=true;setBusy(true);setError('');
                try{await api('/api/auth/default-organization',{organizationId:c.id});setPreferred(String(c.id));window.dispatchEvent(new Event('scale:default-company-changed'));}
                catch(e){setError(message(e));}finally{preferenceLock.current=false;setBusy(false);}
              }}><Star size={14}/>{preferred===String(c.id)?'Predeterminada':'Usar al iniciar sesión'}</button>}
              </div>
            ))}
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </Dialog>
      )}
    </>
  );
}
