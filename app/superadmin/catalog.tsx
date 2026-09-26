"use client";
// Catálogo comercial (cupones) del panel global.
// Extraído de superadmin/page.tsx (issue #46): misma JSX y comportamiento.
import {useRef} from "react";
import {Ticket} from "lucide-react";
import {formatPlatformMetric, type Coupon, type CouponDraft, type State} from "./model";
import {StatusBadge, money} from "./model";
import {PauseCircle, PlayCircle} from "lucide-react";
import {SelectCustom} from "../profile-controls";
import {decimalInput} from "../field-rules";
import {soloDigitos} from "owncoding-ui";

type PlatformCatalogProps = {
  busy: boolean;
  state: State;
  writable: boolean;
  coupon: CouponDraft;
  setCoupon: (value: CouponDraft) => void;
  toggleCoupon: (item: Coupon) => Promise<void>;
  createCoupon: (event: import("react").FormEvent) => Promise<void>;
};

export function PlatformCatalog({busy, state, writable, coupon, setCoupon, toggleCoupon, createCoupon}: PlatformCatalogProps){
  // El vacío de cupones lleva al formulario de creación que vive arriba.
  const codeRef=useRef<HTMLInputElement|null>(null);
  return (
            <section className="platform-admin-section platform-admin-commercial">
              <div className="platform-admin-section-heading">
                <div>
                  <p className="eyebrow">CUPONES</p>
                  <h2>Catálogo comercial</h2>
                </div>
                <small>
                  {formatPlatformMetric(state.coupons.length)} códigos
                </small>
              </div>
              {writable && (
              <form className="platform-admin-coupon" onSubmit={createCoupon}>
                <label>
                  Código
                  <input
                    ref={codeRef}
                    value={coupon.code}
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        code: event.target.value.toUpperCase(),
                      })
                    }
                    placeholder="SCALE10"
                    required
                    minLength={3}
                    maxLength={40}
                  />
                </label>
                  <SelectCustom label="Tipo" choices={[{value:'percent',label:'Porcentaje'},{value:'fixed',label:'Monto fijo'},{value:'days',label:'Días gratis'}]} value={coupon.discount_type} onChange={value=>setCoupon({...coupon,discount_type:value as 'percent'|'fixed'|'days'})}/>
                <label>
                  {coupon.discount_type === "days" ? "Días gratis" : "Valor"}
                  <input
                    value={coupon.discount_value}
                    inputMode={coupon.discount_type === "days" ? "numeric" : "decimal"}
                    maxLength={coupon.discount_type === "fixed" ? 10 : 3}
                    onChange={(event) =>
                      setCoupon({
                        ...coupon,
                        discount_value: coupon.discount_type === "fixed" ? decimalInput(event.target.value) : soloDigitos(event.target.value, 3),
                      })
                    }
                    required
                  />
                </label>
                {coupon.discount_type === "fixed" ? (
                    <SelectCustom label="Moneda" choices={[{value:'USD',label:'USD'},{value:'PYG',label:'PYG'}]} value={coupon.currency} onChange={value=>setCoupon({...coupon,currency:value})}/>
                ) : null}
                <button className="primary" disabled={busy}>
                  Crear cupón
                </button>
              </form>
              )}
              <p className="form-note">
                Crear un cupón no inicia cobros ni activa un proveedor de pagos.
              </p>
              <ul className="platform-admin-list">
                {state.coupons.length ? (
                  <li className="platform-admin-list-head" aria-hidden="true">
                    <span>Cupón</span>
                    <span>Acciones</span>
                  </li>
                ) : null}
                {state.coupons.length ? (
                  state.coupons.map((item) => (
                    <li key={item.id}>
                      <span>
                        <b title={item.code || "Cupón sin código"}>{item.code || "Cupón sin código"}</b>
                        <small>
                          {item.discount_type === "percent"
                            ? `${formatPlatformMetric(item.discount_value)}%`
                            : item.discount_type === "days"
                              ? `${formatPlatformMetric(item.discount_value)} días gratis`
                              : money(item.discount_value, item.currency)}{" "}
                          ·{" "}
                          {item.max_redemptions === null
                            ? "Sin límite de usos"
                            : `${formatPlatformMetric(item.max_redemptions)} usos máximos`}
                        </small>
                      </span>
                      <span className="platform-admin-list-actions">
                        <StatusBadge tone={item.active ? "success" : "neutral"}>
                          {item.active ? "Activo" : "Pausado"}
                        </StatusBadge>
                        {writable && (
                        <button
                          type="button"
                          className={"text-button " + (item.active ? "warn" : "positive")}
                          disabled={busy}
                          onClick={() => void toggleCoupon(item)}
                        >
                          {item.active ? (
                            <PauseCircle size={14} />
                          ) : (
                            <PlayCircle size={14} />
                          )}
                          {item.active ? "Pausar" : "Reactivar"}
                        </button>
                        )}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="platform-admin-empty">
                    <span>No hay cupones para mostrar.{writable&&<> <button type="button" className="text-button" onClick={()=>codeRef.current?.focus()}>Crear el primer cupón</button></>}</span>
                  </li>
                )}
              </ul>
            </section>
  );
}
