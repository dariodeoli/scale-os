"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {SaveActions} from './save-actions';
import type {Client,Project} from './workspace-types';
import {SelectCustom} from './profile-controls';
import {UrgencySelect,urgencyField} from './urgency';


export const clientSchema = z.object({
  name: z.string().trim().min(2, "Escribí el nombre del cliente."),
  email: z.string().email("Email inválido.").or(z.literal("")),
  phone: z.string().max(40).optional(),
});
type ClientValues = z.infer<typeof clientSchema>;
type SavedClient = { id: string; name: string; email: string | null; phone: string | null; active: boolean; [key: string]: unknown };
type WorkspaceRequest = <T>(path: string, init?: RequestInit) => Promise<T>;
export function ClientForm({ request, done }: { request: WorkspaceRequest; done: (client: SavedClient) => void }) {
  const form = useForm<ClientValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });
  const [error, setError] = useState("");
  const [dialCode,setDialCode]=useState('+595');
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: ClientValues) {
    try {
      const digits=values.phone?.replace(/\D/g,'')||'';
      const data = await request<{ client: SavedClient }>("/api/agency/clients", {
        method: "POST",
        body: JSON.stringify({...values,phone:digits?`${dialCode}${digits}`:''}),
      });
      done(data.client);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Nombre
        <input {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <small className="error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <label>
        Email
        <input type="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <small className="error">{form.formState.errors.email.message}</small>
        )}
      </label>
      <label>
        Teléfono / WhatsApp · Opcional
        <span className="phone-input"><select aria-label="Código de país" value={dialCode} onChange={event=>setDialCode(event.target.value)}><option value="+595">🇵🇾 +595</option><option value="+55">🇧🇷 +55</option><option value="+54">🇦🇷 +54</option><option value="+1">🇺🇸 +1</option><option value="+34">🇪🇸 +34</option></select><input inputMode="tel" autoComplete="tel-national" placeholder="981 123 456" {...form.register("phone")} /></span>
        <small className="field-help">Elegí el país; al guardar se conserva el código internacional y se habilita el acceso directo a WhatsApp.</small>
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button className="primary" disabled={submission.pending}>
        {submission.pending ? "Guardando…" : "Crear cliente"}
      </button></SaveActions>
    </form>
  );
}
export const driveLinkSchema=z.string().trim().max(2048).refine(value=>{if(!value)return true;try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password;}catch{return false;}},'Pegá un enlace HTTPS válido de archivo o carpeta.');
const projectSchema = z.object({
  urgency:z.enum(["","1","2","3","4","5"]),
  name: z.string().trim().min(2, "Escribí el nombre del proyecto."),
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
  const submission=useSingleFlightSubmit(form.handleSubmit(submit));
  async function submit(values: ProjectValues) {
    try {
      const data = await request<{ project: Project }>("/api/agency/projects", {
        method: "POST",
        body: JSON.stringify(values),
      });
      done(data.project);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo guardar.");
    }
  }
  return (
    <form
      className="form-stack ops-form-grid"
      noValidate
      onSubmit={submission.onSubmit}
    >
      <label>
        Nombre del proyecto
        <input {...form.register("name")} autoFocus />
        {form.formState.errors.name && (
          <small className="error">{form.formState.errors.name.message}</small>
        )}
      </label>
      <UrgencySelect value={form.watch("urgency")} onChange={value=>form.setValue("urgency",value as ProjectValues["urgency"],{shouldDirty:true})} disabled={submission.pending}/>
      <fieldset>
        <legend>Cliente</legend>
        <div className="choice-list">
          {clients.map((client) => (
            <button
              type="button"
              className={
                form.watch("clientId") === client.id
                  ? "choice active"
                  : "choice"
              }
              onClick={() =>
                form.setValue("clientId", client.id, { shouldValidate: true })
              }
              key={client.id}
            >
              {client.name}
            </button>
          ))}
        </div>
        {form.formState.errors.clientId && (
          <small className="error">
            {form.formState.errors.clientId.message}
          </small>
        )}
      </fieldset>
      <label>
        Enlace de archivo o carpeta de Google Drive
        <input
          placeholder="https://drive.google.com/..."
          {...form.register("driveUrl")}
        />
        {form.formState.errors.driveUrl && (
          <small className="error">
            {form.formState.errors.driveUrl.message}
          </small>
        )}
        <small>Solo guardamos el enlace, no el archivo. Compartí el acceso con tu equipo desde Drive.</small>
      </label>
      {error && <p className="error">{error}</p>}
      <SaveActions pending={submission.pending}><button
        className="primary"
        disabled={!clients.length || submission.pending}
      >
        {submission.pending ? "Guardando…" : "Crear proyecto"}
      </button></SaveActions>
      {!clients.length && <p className="form-note">Primero creá un cliente.</p>}
    </form>
  );
}
