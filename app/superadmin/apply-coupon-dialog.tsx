"use client";
import {Input} from '../ui/input';

import {Button} from '../ui/button';

// «Aplicar cupón» desde el panel global (#189): el superadmin canjea un cupón
// aplicable en nombre de la agencia (vigente, con cupo, global o dirigido a ella
// y todavía no usado por ella). El API reutiliza el mismo canje que la empresa.
import {OptionalMark} from '../field-label';
import {useEffect, useRef, useState} from "react";
import {Dialog, ConfirmDialog} from "../dialog";
import {SelectCustom} from "../profile-controls";
import {LoadingBlock} from "../ui-v2";
import {notify} from "../feedback";
import {platformApi} from "../platform-admin-api";
import {formatPlatformMetric, money, newExtendKey, type Agency, type Coupon} from "./model";

type ApplyCouponDialogProps = {
  agency: Agency;
  onClose: () => void;
  /** Se llama tras aplicar con éxito (el marco refresca la fila de la agencia). */
  onApplied: () => void | Promise<void>;
  /** Devuelve true si el error ya se resolvió (sesión vencida, etc.). */
  onFailure: (cause: unknown) => boolean;
};

export function couponChoiceLabel(item: Coupon) {
  const grant = item.discount_type === "days"
    ? `${formatPlatformMetric(item.discount_value)} días gratis`
    : item.discount_type === "percent"
      ? `${formatPlatformMetric(item.discount_value)}% · 1 mes`
      : `${money(item.discount_value, item.currency)} · 1 mes`;
  return `${item.code} · ${grant}`;
}

export function ApplyCouponDialog({agency, onClose, onApplied, onFailure}: ApplyCouponDialogProps) {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [selected, setSelected] = useState("");
  const [reason, setReason] = useState("");
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // Misma clave durante toda la apertura: un reintento no vuelve a canjear.
  const key = useRef(newExtendKey());
  useEffect(() => {
    let active = true;
    void platformApi<{coupons: Coupon[]}>(`/api/platform/coupons?organization=${agency.id}&limit=100`)
      .then((data) => { if (active) setCoupons(data.coupons); })
      .catch((cause) => { if (active && !onFailure(cause)) setLoadError("No pudimos cargar los cupones aplicables."); });
    return () => { active = false; };
  }, [agency.id]);
  async function apply() {
    const couponId = Number(selected);
    if (!couponId) { setError("Elegí el cupón a aplicar."); return; }
    setBusy(true);
    setError("");
    try {
      const result = await platformApi<{message?: string}>(`/api/platform/agencies/${agency.id}/coupons/apply`, {
        method: "POST",
        headers: {"Idempotency-Key": key.current},
        body: JSON.stringify({coupon_id: couponId, ...(reason.trim() ? {reason: reason.trim()} : {})}),
      });
      notify({tone: "success", message: result.message || `Cupón aplicado a ${agency.name}.`});
      await onApplied();
      onClose();
    } catch (cause) {
      if (!onFailure(cause)) setError(cause instanceof Error ? cause.message : "No pudimos aplicar el cupón.");
      setBusy(false);
    }
  }
  const title = `Aplicar cupón · ${agency.name}`;
  if (loadError || coupons === null || !coupons.length) {
    return (
      <Dialog title={title} close={onClose}>
        {loadError ? <p className="error" role="alert">{loadError}</p>
          : coupons === null ? <LoadingBlock label="Cargando cupones aplicables…" lines={2}/>
          : <p className="form-note">No hay cupones aplicables a esta agencia: deben estar vigentes, con cupo, ser globales o dirigidos a ella y no haber sido usados por ella.</p>}
        <div className="inline-actions"><Button variant="secondary" type="button" className="secondary" onClick={onClose}>Cerrar</Button></div>
      </Dialog>
    );
  }
  return (
    <ConfirmDialog
      title={title}
      description={<p className="form-note">El cupón se canjea por la agencia, extiende su suscripción y queda auditado.</p>}
      confirmLabel="Aplicar cupón"
      busy={busy}
      error={error}
      onCancel={onClose}
      onConfirm={() => void apply()}
    >
      <SelectCustom label="Cupón" choices={coupons.map((item) => ({value: String(item.id), label: couponChoiceLabel(item)}))} value={selected} disabled={busy} onChange={setSelected}/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">
        Motivo<OptionalMark/>
        <Input value={reason} disabled={busy} maxLength={500} placeholder="Ej.: gracia acordada con el cliente" onChange={(event) => setReason(event.target.value)}/>
      </label>
    </ConfirmDialog>
  );
}
