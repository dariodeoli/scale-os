"use client";
// Uso de la plataforma (#191): solo administradores globales (el API revalida).
// Todo sale de `GET /api/platform/usage`; no hay métricas inventadas ni datos
// financieros. Días y horas en America/Asuncion.
import {useCallback, useEffect, useMemo, useState} from "react";
import {SearchField, SegmentedField, Select} from "owncoding-ui";
import {platformApi} from "../platform-admin-api";
import {listDateFull} from "../list-format";
import {PersonContainer} from "../person-container";
import {EmptyBlock, ErrorBlock, FilterToolbar, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, StateChip, type Column} from "../ui-v2";
import {formatPlatformMetric, type UsagePayload} from "./model";
import {dayLabel, UsageBarChart, UsageLineChart} from "./usage-charts";
import "./usage.css";

const RANGES: [string, string][] = [["7", "7 días"], ["30", "30 días"], ["90", "90 días"]];
const AGENCY_TEMPLATE = "grid-cols-[minmax(9rem,1.4fr)_minmax(11rem,1.3fr)_5.5rem_5.5rem_5rem_9.5rem]";
const AGENCY_COLUMNS: Column[] = [{key: "agency", label: "Agencia"}, {key: "owner", label: "Responsable"}, {key: "a7", label: "Activos 7 d", align: "end"}, {key: "a30", label: "Activos 30 d", align: "end"}, {key: "sessions", label: "Sesiones", align: "end"}, {key: "last", label: "Último acceso"}];
const USER_TEMPLATE = "grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_9.5rem_5rem]";
const USER_COLUMNS: Column[] = [{key: "person", label: "Persona"}, {key: "agency", label: "Agencia"}, {key: "last", label: "Último acceso"}, {key: "sessions", label: "Sesiones", align: "end"}];
const MONTH_TEMPLATE = "grid-cols-[minmax(6rem,1fr)_6rem_8rem]";
const MONTH_COLUMNS: Column[] = [{key: "month", label: "Mes"}, {key: "signups", label: "Altas", align: "end"}, {key: "active", label: "Usuarios activos", align: "end"}];
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Rango en días de Asunción terminado hoy; el API valida y vuelve a calcular. */
export function usageQuery(days: number, now = new Date()) {
  const today = new Intl.DateTimeFormat("en-CA", {timeZone: "America/Asuncion", year: "numeric", month: "2-digit", day: "2-digit"}).format(now);
  const end = new Date(`${today}T00:00:00Z`);
  const start = new Date(end.getTime() - (days - 1) * 86400000);
  return `?from=${start.toISOString().slice(0, 10)}&to=${today}`;
}
const monthLabel = (month: string) => { const m = /^(\d{4})-(\d{2})$/.exec(month); return m ? `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : month; };
const delta = (current: number, previous: number) => previous > 0 ? `${current >= previous ? "+" : "−"}${Math.round(Math.abs(current - previous) / previous * 100)} % vs período anterior` : "Sin período anterior para comparar";

export function PlatformUsage({onError}: {onError?: (cause: unknown) => boolean}) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<UsagePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (range: number) => {
    setLoading(true);
    setError("");
    try {
      setData(await platformApi<UsagePayload>(`/api/platform/usage${usageQuery(range)}`));
    } catch (cause) {
      if (!onError?.(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar el uso de la plataforma.");
    } finally {
      setLoading(false);
    }
  }, [onError]);
  useEffect(() => { void load(days); }, [days]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="panel usage-viz" aria-labelledby="platform-usage-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="platform-usage-title" className="text-[15px] font-semibold tracking-tight text-fore">Uso de la plataforma</h2>
      <small className="text-[12px] leading-[1.35] text-mute">Usuarios únicos según sesiones reales; días y horas de Asunción, sin cuentas demo</small>
    </div>
    <FilterToolbar summary={data ? `${dayLabel(data.range.from)} → ${dayLabel(data.range.to)}` : undefined}>
      <SegmentedField className="w-max flex-nowrap [&>button]:min-h-11 md:[&>button]:min-h-8" value={String(days)} onChange={(value: string) => setDays(Number(value))} ariaLabel="Período de uso" options={RANGES}/>
    </FilterToolbar>
    {error ? <ErrorBlock title="No pudimos cargar el uso" description={error} onRetry={() => void load(days)}/> : null}
    {!error && loading && !data ? <LoadingBlock label="Cargando el uso de la plataforma…" lines={4}/> : null}
    {!error && data ? <div aria-busy={loading} className={loading ? "opacity-70 transition-opacity" : ""}><UsageBody data={data}/></div> : null}
  </section>;
}

export function UsageBody({data}: {data: UsagePayload}) {
  const empty = data.totals.sessions === 0 && data.signups.every((row) => row.users === 0 && row.agencies === 0);
  const prevName = `Período anterior (${dayLabel(data.range.previous_from)} → ${dayLabel(data.range.previous_to)})`;
  const line = useMemo(() => data.daily.map((row) => ({label: dayLabel(row.day), value: row.users, prevLabel: dayLabel(row.previous_day), prev: row.previous_users})), [data]);
  const signups = useMemo(() => data.signups.map((row) => ({label: dayLabel(row.day), values: [row.users, row.agencies]})), [data]);
  const hourly = useMemo(() => data.hourly.map((row) => ({label: `${String(row.hour).padStart(2, "0")} h`, values: [row.users]})), [data]);
  const recurringShare = data.totals.unique_users ? `${Math.round(data.totals.recurring_users / data.totals.unique_users * 100)} % de los únicos` : "Sin usuarios en el período";
  return <div className="grid min-w-0 gap-5">
    <KpiStrip>
      <Kpi label="Usuarios únicos" valor={formatPlatformMetric(data.totals.unique_users)} hint={delta(data.totals.unique_users, data.totals.previous_unique_users)} destacado/>
      <Kpi label="Recurrentes (≥2 días)" valor={formatPlatformMetric(data.totals.recurring_users)} hint={recurringShare}/>
      <Kpi label="Sesiones" valor={formatPlatformMetric(data.totals.sessions)} hint={`en ${data.range.days} días`}/>
      <Kpi label="Activos ahora" valor={formatPlatformMetric(data.totals.active_now)} hint="Visto en los últimos 5 min"/>
    </KpiStrip>
    {empty ? <EmptyBlock compact icon="report" title="Sin actividad en el período." description="Todavía no hay sesiones ni altas reales en este rango. Probá con un período más largo."/> : <div className="usage-charts">
      <div className="usage-wide min-w-0"><h3 className="mb-2 text-[13px] font-semibold text-fore">Usuarios únicos por día</h3><UsageLineChart title="Usuarios únicos por día" points={line} valueLabel="Usuarios únicos" prevName="Período anterior"/><p className="sr-only">{prevName}</p></div>
      <div className="min-w-0"><h3 className="mb-2 text-[13px] font-semibold text-fore">Altas por día</h3><UsageBarChart title="Altas por día" groups={signups} series={["Usuarios", "Agencias"]}/></div>
      <div className="min-w-0"><h3 className="mb-2 text-[13px] font-semibold text-fore">Usuarios únicos por hora</h3><UsageBarChart title="Usuarios únicos por hora" groups={hourly} series={["Usuarios únicos"]} tickEvery={3}/></div>
    </div>}
    <div className="min-w-0">
      <h3 className="mb-2 text-[13px] font-semibold text-fore">Últimos 4 meses</h3>
      <ListGrid label="Últimos 4 meses" template={MONTH_TEMPLATE} columns={MONTH_COLUMNS} minWidthClass="min-w-[20rem]">
        {data.monthly.map((row) => <ListRow key={row.month} template={MONTH_TEMPLATE}>
          <span role="cell" className="list-identity text-fore">{monthLabel(row.month)}</span>
          <span role="cell" className="list-amount">{formatPlatformMetric(row.signups)}</span>
          <span role="cell" className="list-amount">{formatPlatformMetric(row.active_users)}</span>
        </ListRow>)}
      </ListGrid>
    </div>
    <UsageAgencies agencies={data.agencies}/>
    <UsageUsers users={data.users}/>
  </div>;
}

function UsageAgencies({agencies}: {agencies: UsagePayload["agencies"]}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("active30");
  const visible = useMemo(() => {
    const text = query.trim().toLowerCase();
    const rows = agencies.filter((row) => !text || `${row.name} ${row.owner?.name || ""} ${row.owner?.email || ""}`.toLowerCase().includes(text));
    const stamp = (value: string | null) => value ? new Date(value).getTime() : 0;
    return [...rows].sort((a, b) => sort === "last" ? stamp(b.last_seen_at) - stamp(a.last_seen_at) : b.active30 - a.active30 || stamp(b.last_seen_at) - stamp(a.last_seen_at));
  }, [agencies, query, sort]);
  return <div className="min-w-0">
    <div className="mb-2 flex min-w-0 items-center gap-2"><h3 className="text-[13px] font-semibold text-fore">Uso por agencia</h3><StateChip tone="mute" title="Agencias reales">{formatPlatformMetric(agencies.length)}</StateChip></div>
    <FilterToolbar summary={`${visible.length} de ${agencies.length}`}>
      <SearchField className="min-w-[12rem] flex-1 sm:max-w-72" type="search" ariaLabel="Buscar agencias en el uso" value={query} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)} placeholder="Agencia o responsable"/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">Ordenar por
        <Select aria-label="Ordenar agencias" value={sort} onChange={(event: React.ChangeEvent<HTMLSelectElement>) => setSort(event.target.value)} className="min-w-[11rem]">
          <option value="active30">Activos 30 días</option>
          <option value="last">Último acceso</option>
        </Select>
      </label>
    </FilterToolbar>
    {visible.length ? <ListGrid label="Uso por agencia" template={AGENCY_TEMPLATE} columns={AGENCY_COLUMNS} minWidthClass="min-w-[46rem]">
      {visible.map((row) => <ListRow key={row.id} template={AGENCY_TEMPLATE}>
        <span role="cell" className="list-identity text-fore" title={row.name}>{row.name}</span>
        <span role="cell" className="min-w-0">{row.owner ? <PersonContainer size="sm" name={row.owner.name} photoUrl={row.owner.avatar_url} secondary={row.owner.email}/> : <span className="list-secondary">Sin responsable</span>}</span>
        <span role="cell" className="list-amount">{formatPlatformMetric(row.active7)}</span>
        <span role="cell" className="list-amount">{formatPlatformMetric(row.active30)}</span>
        <span role="cell" className="list-amount">{formatPlatformMetric(row.sessions)}</span>
        <span role="cell" className="list-date" title={listDateFull(row.last_seen_at) || undefined}>{listDateFull(row.last_seen_at) || "Sin accesos"}</span>
      </ListRow>)}
    </ListGrid> : <EmptyBlock compact icon="report" title={agencies.length ? "Sin agencias que coincidan." : "Sin agencias reales."} description={agencies.length ? "Probá con otro nombre." : undefined}/>}
  </div>;
}

function UsageUsers({users}: {users: UsagePayload["users"]}) {
  return <div className="min-w-0">
    <div className="mb-2 flex min-w-0 items-center gap-2"><h3 className="text-[13px] font-semibold text-fore">Usuarios recientes</h3><StateChip tone="mute" title="Los 50 con acceso más reciente">{formatPlatformMetric(users.length)}</StateChip></div>
    {users.length ? <ListGrid label="Usuarios recientes" template={USER_TEMPLATE} columns={USER_COLUMNS} minWidthClass="min-w-[36rem]">
      {users.map((row) => <ListRow key={row.id} template={USER_TEMPLATE}>
        <span role="cell" className="min-w-0"><PersonContainer size="sm" name={row.name} photoUrl={row.avatar_url} secondary={row.email}/></span>
        <span role="cell" className="list-secondary text-[12.5px] text-fore" title={row.agency}>{row.agency}</span>
        <span role="cell" className="list-date" title={listDateFull(row.last_seen_at) || undefined}>{listDateFull(row.last_seen_at) || "—"}</span>
        <span role="cell" className="list-amount">{formatPlatformMetric(row.sessions)}</span>
      </ListRow>)}
    </ListGrid> : <EmptyBlock compact icon="report" title="Sin accesos registrados." description="Cuando alguien use la plataforma aparece acá con su último acceso."/>}
  </div>;
}
