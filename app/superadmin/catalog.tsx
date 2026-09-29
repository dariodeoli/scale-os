"use client";
// Catálogo comercial (cupones) del panel global.
// Rediseño #80: panel del sistema, formulario de alta y lista densa v2.
import {useRef} from "react";
import {PauseCircle, PlayCircle} from "lucide-react";
import {ListActions, ListGrid, ListRow, EmptyBlock, EmptyCta, StateChip, denseTableMinWidth, useDenseTableFit, type Column} from "../ui-v2";
import {formatPlatformMetric, money, type Coupon, type CouponDraft, type State} from "./model";
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

const TEMPLATE = "grid-cols-[minmax(10rem,1fr)_6.5rem_8rem]";
const COLUMNS: Column[] = [
  {key: "coupon", label: "Cupón"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones"},
];
const MIN_WIDTH = denseTableMinWidth(23.5, 3);

const FIELD = "grid gap-1.5 text-[11px] font-semibold text-mute";

export function PlatformCatalog({busy, state, writable, coupon, setCoupon, toggleCoupon, createCoupon}: PlatformCatalogProps){
  // El vacío de cupones lleva al formulario de creación que vive arriba.
  const codeRef=useRef<HTMLInputElement|null>(null);
  const {ref: listRef, fits: listFits} = useDenseTableFit<HTMLDivElement>(MIN_WIDTH);
  const detail = (item: Coupon) => `${item.discount_type === "percent" ? `${formatPlatformMetric(item.discount_value)}%` : item.discount_type === "days" ? `${formatPlatformMetric(item.discount_value)} días gratis` : money(item.discount_value, item.currency)} · ${item.max_redemptions === null ? "Sin límite de usos" : `${formatPlatformMetric(item.max_redemptions)} usos máximos`}`;
  return (
    <section className="panel h-full" aria-labelledby="platform-catalog-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <p className="eyebrow">Cupones</p>
          <h2 id="platform-catalog-title" className="text-[17px] font-semibold tracking-tight text-fore">Catálogo comercial</h2>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">{formatPlatformMetric(state.coupons.length)} códigos</small>
      </div>
      {writable && (
      <form className="platform-admin-coupon mb-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(10rem,1.2fr)_minmax(8rem,.9fr)_minmax(7rem,.8fr)_auto]" onSubmit={createCoupon}>
        <label className={FIELD}>
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
            autoComplete="off"
            spellCheck={false}
            autoCapitalize="characters"
            required
            minLength={3}
            maxLength={40}
          />
        </label>
          <SelectCustom label="Tipo" choices={[{value:'percent',label:'Porcentaje'},{value:'fixed',label:'Monto fijo'},{value:'days',label:'Días gratis'}]} value={coupon.discount_type} onChange={value=>setCoupon({...coupon,discount_type:value as 'percent'|'fixed'|'days'})}/>
        <label className={FIELD}>
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
      <p className="form-note">Crear un cupón no inicia cobros ni activa un proveedor de pagos.</p>
      <div ref={listRef} className="mt-3 min-w-0">
        {state.coupons.length ? (listFits ? (
          <ListGrid label="Cupones" template={TEMPLATE} columns={COLUMNS} minWidthClass="min-w-[25rem]" pinnedActions>
            {state.coupons.map((item) => (
              <ListRow key={item.id} template={TEMPLATE}>
                <div role="cell" className="min-w-0">
                  <b className="list-identity text-fore" title={item.code || "Cupón sin código"}>{item.code || "Cupón sin código"}</b>
                  <small className="list-secondary" title={detail(item)}>{detail(item)}</small>
                </div>
                <span role="cell"><StateChip tone={item.active ? "ok" : "mute"}>{item.active ? "Activo" : "Pausado"}</StateChip></span>
                {writable ? <ListActions>
                  <button
                    type="button"
                    className={"text-button " + (item.active ? "warn" : "positive")}
                    disabled={busy}
                    onClick={() => void toggleCoupon(item)}
                  >
                    {item.active ? <PauseCircle size={14} aria-hidden="true" /> : <PlayCircle size={14} aria-hidden="true" />}
                    {item.active ? "Pausar" : "Reactivar"}
                  </button>
                </ListActions> : null}
              </ListRow>
            ))}
          </ListGrid>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {state.coupons.map((item) => (
              <article key={item.id} className="flex min-h-[200px] flex-col gap-3 rounded-xl border border-ink-600 bg-ink-800 p-4">
                <div className="min-w-0">
                  <b className="block text-[13.5px] font-semibold leading-snug text-fore [overflow-wrap:anywhere]" title={item.code || "Cupón sin código"}>{item.code || "Cupón sin código"}</b>
                  <small className="mt-0.5 block text-[11px] text-mute">{detail(item)}</small>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StateChip tone={item.active ? "ok" : "mute"}>{item.active ? "Activo" : "Pausado"}</StateChip>
                </div>
                {writable ? <div className="mt-auto border-t border-ink-600 pt-3">
                  <button
                    type="button"
                    className={"text-button " + (item.active ? "warn" : "positive")}
                    disabled={busy}
                    onClick={() => void toggleCoupon(item)}
                  >
                    {item.active ? <PauseCircle size={14} aria-hidden="true" /> : <PlayCircle size={14} aria-hidden="true" />}
                    {item.active ? "Pausar" : "Reactivar"}
                  </button>
                </div> : null}
              </article>
            ))}
          </div>
        )) : (
          <EmptyBlock
            compact
            icon="tag"
            title="No hay cupones para mostrar."
            description={writable ? "Creá el primero: el código se carga a mano y no activa cobros." : "Cuando se cree un cupón comercial, vas a verlo acá."}
            action={writable ? <EmptyCta label="Crear el primer cupón" onClick={() => codeRef.current?.focus()} /> : undefined}
          />
        )}
      </div>
    </section>
  );
}
