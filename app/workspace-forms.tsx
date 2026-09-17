"use client";
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useSingleFlightSubmit} from './use-single-flight-submit';
import {SaveActions} from './save-actions';

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
