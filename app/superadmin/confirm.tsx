"use client";
// Confirmación destructiva del panel global (extraída de page.tsx, issue #46).
// El marco conserva el estado y los handlers; este componente dibuja el diálogo
// con la confirmación tipada, la re-autenticación y el cambio a código por correo.
import {Dialog} from "../dialog";
import type {ConfirmRequest} from "./model";

type PlatformConfirmDialogProps = {
  request: NonNullable<ConfirmRequest>;
  busy: boolean;
  self: boolean;
  emailSending: boolean;
  typed: string;
  setTyped: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  authMethod: "password" | "email";
  onSwitchAuth: () => void;
  emailSent: boolean;
  emailCode: string;
  setEmailCode: (value: string) => void;
  onClose: () => void;
  onRequestEmailCode: () => void;
  onRemove: () => void;
};

export function PlatformConfirmDialog({request, busy, self, emailSending, typed, setTyped, confirmPassword, setConfirmPassword, authMethod, onSwitchAuth, emailSent, emailCode, setEmailCode, onClose, onRequestEmailCode, onRemove}: PlatformConfirmDialogProps){
  const target = request.kind === "user" ? request.person.email : request.agency.name;
  const title = request.kind === "user"
    ? self
      ? "Eliminar mi cuenta"
      : "Eliminar usuario"
    : "Eliminar agencia";
  return (
    <Dialog title={title} busy={busy} close={onClose}>
      <p className="form-note">
        {request.kind === "user"
          ? self
            ? "Se eliminará tu usuario y las agencias que poseas. Solo vos podés eliminar tu propia cuenta. Esta acción es irreversible."
            : `Se eliminará ${request.person.email} y, si es dueño, sus agencias completas. Esta acción es irreversible.`
          : `Se eliminará la agencia ${request.agency.name} con todos sus datos. Esta acción es irreversible.`}
      </p>
      <label className="platform-admin-confirm">
        Escribí <strong>{target}</strong> para confirmar
        <input
          value={typed}
          disabled={busy}
          autoComplete="off"
          onChange={(event) => setTyped(event.target.value)}
        />
      </label>
      {authMethod === "password" ? (
        <label className="platform-admin-confirm">
          Confirmá tu identidad con tu contraseña actual
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
        <div className="form-stack">
          <p className="form-note">
            Para cuentas sin contraseña (Google): te enviamos un código de 8 dígitos al correo registrado.
          </p>
          {emailSent ? (
            <label className="platform-admin-confirm">
              Código recibido
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={emailCode}
                disabled={busy}
                onChange={(event) =>
                  setEmailCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                }
              />
            </label>
          ) : (
            <button
              type="button"
              className="secondary"
              disabled={busy || emailSending || typed !== target}
              onClick={() => void onRequestEmailCode()}
            >
              {emailSending ? "Enviando…" : "Enviar código a mi correo"}
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className="text-button"
        disabled={busy}
        onClick={onSwitchAuth}
      >
        {authMethod === "password"
          ? "No tengo contraseña (usar código por correo)"
          : "Usar mi contraseña"}
      </button>
      <div className="inline-actions">
        <button
          className="primary"
          disabled={busy || (authMethod === "password" ? !confirmPassword : emailCode.length !== 8) || typed !== target}
          onClick={() => void onRemove()}
        >
          {busy ? "Eliminando…" : "Eliminar definitivamente"}
        </button>
      </div>
    </Dialog>
  );
}
