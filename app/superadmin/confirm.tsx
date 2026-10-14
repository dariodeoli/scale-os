"use client";
// Confirmación destructiva del panel global (extraída de page.tsx, issue #46).
// #189: se apoya en el `ConfirmDialog` único (palabra corta «ELIMINAR») y la
// re-autenticación obligatoria pasa a primer plano: Google en un clic y, como
// alternativas, la contraseña actual o el código por correo. El API sigue
// exigiendo vista previa + prueba de identidad + su propio texto de confirmación,
// que el marco toma de la vista previa del servidor.
import {ConfirmDialog} from "../dialog";
import type {ConfirmRequest} from "./model";
import {PLATFORM_DELETE_WORD} from "./model";

export type PlatformAuthMethod = "google" | "password" | "email";

type PlatformConfirmDialogProps = {
  request: NonNullable<ConfirmRequest>;
  busy: boolean;
  self: boolean;
  error: string;
  emailSending: boolean;
  googleStarting: boolean;
  /** Google ya confirmó la identidad (volvió del consentimiento con prueba válida). */
  googleVerified: boolean;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  authMethod: PlatformAuthMethod;
  setAuthMethod: (value: PlatformAuthMethod) => void;
  emailSent: boolean;
  emailCode: string;
  setEmailCode: (value: string) => void;
  onClose: () => void;
  onGoogle: () => void;
  onRequestEmailCode: () => void;
  onRemove: () => void;
};

export function PlatformConfirmDialog({request, busy, self, error, emailSending, googleStarting, googleVerified, confirmPassword, setConfirmPassword, authMethod, setAuthMethod, emailSent, emailCode, setEmailCode, onClose, onGoogle, onRequestEmailCode, onRemove}: PlatformConfirmDialogProps){
  const title = request.kind === "user"
    ? self
      ? "Eliminar mi cuenta"
      : "Eliminar usuario"
    : "Eliminar agencia";
  const description = request.kind === "user"
    ? self
      ? "Se eliminará tu usuario y las agencias que poseas. Solo vos podés eliminar tu propia cuenta. Esta acción es irreversible."
      : `Se eliminará ${request.person.full_name ? `${request.person.full_name} (${request.person.email})` : request.person.email} y, si es dueño, sus agencias completas. Esta acción es irreversible.`
    : `Se eliminará la agencia ${request.agency.name} con todos sus datos. Esta acción es irreversible.`;
  const alternatives = (["password", "email"] as const).filter((method) => method !== authMethod);
  const label = {password: "Usar mi contraseña", email: "Recibir un código por correo", google: "Confirmar con Google"};
  return (
    <ConfirmDialog
      title={title}
      description={<p className="form-note">{description}</p>}
      variant="danger"
      confirmLabel="Eliminar definitivamente"
      busy={busy}
      error={error}
      requireText={PLATFORM_DELETE_WORD}
      requireLabel={`Escribí ${PLATFORM_DELETE_WORD} para confirmar`}
      onCancel={onClose}
      onConfirm={onRemove}
    >
      <div className="grid gap-3 rounded-xl border border-ink-600 bg-ink-700/40 p-4" aria-label="Confirmación de identidad">
        <strong className="text-[12px] text-fore">Confirmá tu identidad</strong>
        {googleVerified ? (
          <p className="m-0 rounded-lg bg-ok/10 p-3 text-xs text-ok" role="status">Identidad confirmada con Google.</p>
        ) : authMethod === "google" ? (
          <>
            <button type="button" className="primary" disabled={busy || googleStarting} onClick={onGoogle}>
              {googleStarting ? "Abriendo Google…" : "Confirmar con Google"}
            </button>
            <small className="text-[11px] text-mute">Un clic: Google verifica que seas vos y volvés acá para terminar.</small>
          </>
        ) : authMethod === "password" ? (
          <label className="grid gap-2 text-[12px] font-semibold text-mute">
            Contraseña actual
            <input
              type="password"
              value={confirmPassword}
              disabled={busy}
              autoComplete="current-password"
              maxLength={128}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        ) : (
          <div className="grid gap-2">
            <p className="form-note">Te enviamos un código de 8 dígitos al correo registrado.</p>
            {emailSent ? (
              <label className="grid gap-2 text-[12px] font-semibold text-mute">
                Código recibido
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={emailCode}
                  disabled={busy}
                  onChange={(event) => setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
                />
              </label>
            ) : (
              <button type="button" className="secondary" disabled={busy || emailSending} onClick={onRequestEmailCode}>
                {emailSending ? "Enviando…" : "Enviar código a mi correo"}
              </button>
            )}
          </div>
        )}
        {googleVerified ? null : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {authMethod !== "google" ? (
              <button type="button" className="text-button" disabled={busy} onClick={() => setAuthMethod("google")}>{label.google}</button>
            ) : null}
            {alternatives.map((method) => (
              <button key={method} type="button" className="text-button" disabled={busy} onClick={() => setAuthMethod(method)}>{label[method]}</button>
            ))}
          </div>
        )}
      </div>
    </ConfirmDialog>
  );
}
