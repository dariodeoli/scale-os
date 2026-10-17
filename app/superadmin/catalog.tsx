"use client";
import {InputControl} from '../ui/input-control';
import {TextareaBase} from '../ui/input';
// Catálogo comercial (cupones) del panel global.
// Rediseño #80: panel del sistema, formulario de alta y lista densa v2.
import {OptionalMark,optionalLabel} from '../field-label';
import {useRef} from "react";
import {PauseCircle, PlayCircle} from "lucide-react";
import {ListActions, ListGrid, ListRow, EmptyBlock, EmptyCta, MoneyText, StateChip, denseTableMinWidth, useDenseTableFit, type Column} from "../ui-v2";
import {dueTone, listDateFull, listDateShort} from "../list-format";
import {todayAsuncion} from "../client-format";
import {couponStatus, couponUses, formatPlatformMetric, money, type CollectionPage, type Coupon, type CouponDraft, type State} from "./model";
import {PlatformMore} from "./states";
import {SelectCustom} from "../profile-controls";
import {decimalInput} from "../field-rules";
import {soloDigitos} from "owncoding-ui";

type PlatformCatalogProps = {
  busy: boolean;
  state: State;
  page: CollectionPage;
  onMore: () => void;
  writable: boolean;
  coupon: CouponDraft;
  setCoupon: (value: CouponDraft) => void;
  toggleCoupon: (item: Coupon) => Promise<void>;
  createCoupon: (event: import("react").FormEvent) => Promise<void>;
};

// Cupón · Descuento · Vence · Empresa · Usos (n/max) · Estado · Acciones (#189).
const TEMPLATE = "grid-cols-[minmax(9rem,1.3fr)_8rem_5.5rem_minmax(7rem,1fr)_5rem_5.5rem_7rem]";
const COLUMNS: Column[] = [
  {key: "coupon", label: "Cupón"},
  {key: "discount", label: "Descuento", align: "end"},
  {key: "expires", label: "Vence"},
  {key: "company", label: "Empresa"},
  {key: "uses", label: "Usos", align: "end"},
  {key: "status", label: "Estado"},
  {key: "actions", label: "Acciones", align: "end"},
];
const MIN_WIDTH = denseTableMinWidth(9 + 8 + 5.5 + 7 + 5 + 5.5 + 7, 7);
// Sin permiso de escritura no hay acciones: la columna (y su encabezado) no se dibuja.
const TEMPLATE_READONLY = "grid-cols-[minmax(9rem,1.3fr)_8rem_5.5rem_minmax(7rem,1fr)_5rem_5.5rem]";
const COLUMNS_READONLY = COLUMNS.slice(0, -1);
const MIN_WIDTH_READONLY = denseTableMinWidth(9 + 8 + 5.5 + 7 + 5 + 5.5, 6);

const FIELD = "grid gap-1.5 text-[11px] font-semibold text-mute";

export function PlatformCatalog({busy, state, page, onMore, writable, coupon, setCoupon, toggleCoupon, createCoupon}: PlatformCatalogProps){
  // El vacío de cupones lleva al formulario de creación que vive arriba.
  const codeRef=useRef<HTMLInputElement|null>(null);
  const {ref: listRef, fits: listFits} = useDenseTableFit<HTMLDivElement>(writable ? MIN_WIDTH : MIN_WIDTH_READONLY);
  const usesTitle = (item: Coupon) => `${formatPlatformMetric(item.redemptions ?? 0)} usos · ${item.max_redemptions === null ? "sin límite" : `máximo ${formatPlatformMetric(item.max_redemptions)}`}`;
  const companyLabel = (item: Coupon) => item.organization_name || (item.organization_id ? `Empresa #${item.organization_id}` : "Todas");
  const expiryCell = (item: Coupon) => <span className="list-date" data-tone={item.expired ? "warn" : dueTone(item.expires_at) || undefined} title={item.expires_at ? `Vence ${listDateFull(item.expires_at)}` : "Sin vencimiento"}>{listDateShort(item.expires_at) || "—"}</span>;
  const statusChip = (item: Coupon) => { const status = couponStatus(item); return <StateChip tone={status.tone}>{status.label}</StateChip>; };
  const discountCell = (item: Coupon) => item.discount_type === "fixed"
    ? <MoneyText valor={item.discount_value} currency={item.currency || undefined} className="text-fore"/>
    : <span className="list-amount text-fore">{item.discount_type === "percent" ? `${formatPlatformMetric(item.discount_value)}%` : `${formatPlatformMetric(item.discount_value)} días`}</span>;
  const detail = (item: Coupon) => `${item.discount_type === "percent" ? `${formatPlatformMetric(item.discount_value)}%` : item.discount_type === "days" ? `${formatPlatformMetric(item.discount_value)} días gratis` : money(item.discount_value, item.currency)} · ${item.max_redemptions === null ? "Sin límite de usos" : `${formatPlatformMetric(item.max_redemptions)} usos máximos`}`;
  return (
    <section className="panel h-full" aria-labelledby="platform-catalog-title">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="platform-catalog-title" className="text-[15px] font-semibold tracking-tight text-fore">Catálogo comercial</h2>
          <StateChip tone="mute" title="Cupones cargados">{formatPlatformMetric(state.coupons.length)}</StateChip>
        </div>
        <small className="text-[12px] leading-[1.35] text-mute">Crear un cupón no inicia cobros ni activa un proveedor de pagos</small>
      </div>
      {writable && (
      <form className="platform-admin-coupon" onSubmit={createCoupon}>
        <label className={FIELD}>
          Código
          <InputControl
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
          <InputControl
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
        <label className={FIELD}>
          Vence<OptionalMark/>
          <InputControl type="date" value={coupon.expires_at} min={todayAsuncion()} onChange={(event) => setCoupon({...coupon, expires_at: event.target.value})}/>
        </label>
        <SelectCustom label={optionalLabel("Empresa")} choices={[{value:'',label:'Todas las empresas'}, ...state.agencies.map(agency=>({value:String(agency.id),label:agency.name||`Agencia #${agency.id}`}))]} value={coupon.organization_id} onChange={value=>setCoupon({...coupon,organization_id:value})}/>
        <label className={`${FIELD} platform-admin-coupon-note`}>
          Nota interna<OptionalMark/>
          <TextareaBase value={coupon.note} rows={2} maxLength={2000} onChange={(event) => setCoupon({...coupon, note: event.target.value})} placeholder="Ej.: gracia acordada por WhatsApp"/>
        </label>
        <button className="primary min-h-11 md:min-h-10 whitespace-nowrap" disabled={busy}>
          Crear cupón
        </button>
      </form>
      )}
      <div ref={listRef} className="mt-4 min-w-0">
        {state.coupons.length ? (listFits ? (
          <ListGrid label="Cupones" template={writable ? TEMPLATE : TEMPLATE_READONLY} columns={writable ? COLUMNS : COLUMNS_READONLY} minWidthClass={writable ? "min-w-[62rem]" : "min-w-[55rem]"} pinnedActions={writable}>
            {state.coupons.map((item) => (
              <ListRow key={item.id} template={writable ? TEMPLATE : TEMPLATE_READONLY}>
                <div role="cell" className="min-w-0">
                  <b className="list-identity text-fore" title={item.code || "Cupón sin código"}>{item.code || "Cupón sin código"}</b>
                </div>
                <span role="cell" className="text-right">{discountCell(item)}</span>
                <span role="cell" className="min-w-0">{expiryCell(item)}</span>
                <span role="cell" className="list-secondary min-w-0" title={item.note ? `${companyLabel(item)} · ${item.note}` : companyLabel(item)}>{companyLabel(item)}</span>
                <span role="cell" className="text-right text-[12.5px] font-semibold tabular-nums text-fore whitespace-nowrap" title={usesTitle(item)}>{couponUses(item)}</span>
                <span role="cell">{statusChip(item)}</span>
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
                <div className="flex flex-wrap items-center gap-2">{statusChip(item)}</div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                  <div><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Vence</dt><dd className="mt-0.5">{expiryCell(item)}</dd></div>
                  <div><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Usos</dt><dd className="mt-0.5 font-semibold tabular-nums text-fore" title={usesTitle(item)}>{couponUses(item)}</dd></div>
                  <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Empresa</dt><dd className="mt-0.5 text-fore [overflow-wrap:anywhere]">{companyLabel(item)}</dd></div>
                  {item.note ? <div className="col-span-2"><dt className="text-[10px] font-bold uppercase tracking-[.06em] text-mute">Nota</dt><dd className="mt-0.5 text-mute [overflow-wrap:anywhere]">{item.note}</dd></div> : null}
                </dl>
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
      <PlatformMore loaded={state.coupons.length} total={page.total} hasMore={page.hasMore} busy={busy} onMore={onMore} label="cupones"/>
    </section>
  );
}
