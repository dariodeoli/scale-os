"use client";
import {OptionsSelect as Select} from '../ui/options-select';
// Uso de la plataforma (#191): solo administradores globales (el API revalida).
// Todo sale de `GET /api/platform/usage`; no hay métricas inventadas ni datos
// financieros. Días y horas en America/Asuncion; el período sale de los chips
// compartidos con el Resumen. Sin demos en ningún KPI, tabla ni gráfico.
import {useCallback, useEffect, useMemo, useRef, useState} from "react";

import {SearchField} from '../search-field';
import {platformApi} from "../platform-admin-api";
import {listDateFull} from "../list-format";
import {PersonContainer} from "../person-container";
import {EmptyBlock, ErrorBlock, FilterToolbar, KpiStrip, ListGrid, ListRow, LoadingBlock, StateChip, type Column} from "../ui-v2";
import {formatPlatformMetric, type UsagePayload} from "./model";
import {dayLabel, UsageBarChart, UsageLineChart} from "./usage-charts";
import {MetricKpi, MetricNote} from "./metric-kpi";
import {DEFAULT_PLATFORM_PERIOD, periodQuery, type PlatformPeriodId} from "./period";
import "./usage.css";

const AGENCY_TEMPLATE = "grid-cols-[minmax(9rem,1.4fr)_minmax(11rem,1.3fr)_5.5rem_5.5rem_5rem_9.5rem]";
const AGENCY_COLUMNS: Column[] = [{key: "agency", label: "Agencia"}, {key: "owner", label: "Responsable"}, {key: "a7", label: "Activos 7 d", align: "end"}, {key: "a30", label: "Activos 30 d", align: "end"}, {key: "sessions", label: "Sesiones", align: "end"}, {key: "last", label: "Último acceso"}];
const USER_TEMPLATE = "grid-cols-[minmax(12rem,1.6fr)_minmax(8rem,1fr)_9.5rem_5rem]";
const USER_COLUMNS: Column[] = [{key: "person", label: "Persona"}, {key: "agency", label: "Agencia"}, {key: "last", label: "Último acceso"}, {key: "sessions", label: "Sesiones", align: "end"}];
const MONTH_TEMPLATE = "grid-cols-[minmax(5rem,1fr)_4.5rem_7rem]";
const MONTH_COLUMNS: Column[] = [{key: "month", label: "Mes"}, {key: "signups", label: "Altas", align: "end"}, {key: "active", label: "Usuarios activos", align: "end"}];
const MONTH_NAMES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

const monthLabel = (month: string) => { const m = /^(\d{4})-(\d{2})$/.exec(month); return m ? `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}` : month; };

export function PlatformUsage({period = DEFAULT_PLATFORM_PERIOD, onError}: {period?: PlatformPeriodId; onError?: (cause: unknown) => boolean}) {
  const [data, setData] = useState<UsagePayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  // Solo la última consulta pinta: si se cambia de período antes de que llegue la
  // respuesta anterior, esa respuesta (o su error) se descarta y no pisa el rango elegido.
  const latest = useRef(0);
  const load = useCallback(async (range: PlatformPeriodId) => {
    const request = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const next = await platformApi<UsagePayload>(`/api/platform/usage${periodQuery(range)}`);
      if (request === latest.current) setData(next);
    } catch (cause) {
      if (request === latest.current && !onError?.(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar el uso de la plataforma.");
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [onError]);
  useEffect(() => { void load(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="panel usage-viz" aria-labelledby="platform-usage-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="platform-usage-title" className="text-[15px] font-semibold tracking-tight text-fore">Uso de la plataforma</h2>
      <small className="text-[12px] leading-[1.35] text-mute">{data ? `${dayLabel(data.range.from)} → ${dayLabel(data.range.to)} · ` : ""}usuarios únicos según sesiones reales; días y horas de Asunción, sin demos</small>
    </div>
    {error ? <ErrorBlock title="No pudimos cargar el uso" description={error} onRetry={() => void load(period)}/> : null}
    {!error && loading && !data ? <LoadingBlock label="Cargando el uso de la plataforma…" lines={4}/> : null}
    {!error && data ? <div aria-busy={loading} className={loading ? "opacity-70 transition-opacity" : ""}><UsageBody data={data}/></div> : null}
  </section>;
}

const NOTES = {
  unique: {source: "Sesiones de uso", calc: "usuarios distintos del período"},
  recurring: {source: "Sesiones de uso", calc: "usuarios con sesiones en ≥2 días"},
  sessions: {source: "Sesiones de uso", calc: "sesiones iniciadas en agencias reales"},
  live: {source: "Sesiones de uso", calc: "vistos en los últimos 5 min"},
};

export function UsageBody({data}: {data: UsagePayload}) {
  // La fuente sin filas reales dice «Sin datos todavía»; con datos, un período en cero es «sin actividad».
  const hasSessions = data.has_data?.sessions ?? true;
  const empty = data.totals.sessions === 0 && data.signups.every((row) => row.users === 0 && row.agencies === 0);
  const prevName = `Período anterior (${dayLabel(data.range.previous_from)} → ${dayLabel(data.range.previous_to)})`;
  const line = useMemo(() => data.daily.map((row) => ({label: dayLabel(row.day), value: row.users, prevLabel: dayLabel(row.previous_day), prev: row.previous_users})), [data]);
  const signups = useMemo(() => data.signups.map((row) => ({label: dayLabel(row.day), values: [row.users, row.agencies]})), [data]);
  const hourly = useMemo(() => data.hourly.map((row) => ({label: `${String(row.hour).padStart(2, "0")} h`, values: [row.users]})), [data]);
  const series = (pick: (row: UsagePayload["daily"][number]) => number) => data.daily.map(pick);
  const metric = (value: number, previous: number, values: number[]) => ({value, previous, series: values, has_data: hasSessions});
  const t = data.totals;
  return <div className="grid min-w-0 gap-5">
    <KpiStrip aria-label="Indicadores de uso">
      <MetricKpi label="Usuarios únicos" metric={metric(t.unique_users, t.previous_unique_users, series((row) => row.users))} {...NOTES.unique} destacado/>
      <MetricKpi label="Recurrentes (≥2 días)" metric={metric(t.recurring_users, t.previous_recurring_users ?? 0, series((row) => row.recurring ?? 0))} {...NOTES.recurring}/>
      <MetricKpi label="Sesiones" metric={metric(t.sessions, t.previous_sessions ?? 0, series((row) => row.sessions))} {...NOTES.sessions}/>
      <MetricKpi label="Activos ahora" metric={metric(t.active_now, 0, [])} {...NOTES.live} live/>
    </KpiStrip>
    {!hasSessions ? <EmptyBlock compact icon="report" title="Sin datos todavía." description="Todavía no hay sesiones reales registradas: el uso aparece acá cuando alguien entra a la plataforma."/>
     : empty ? <EmptyBlock compact icon="report" title="Sin actividad en el período." description="Todavía no hay sesiones ni altas reales en este rango. Probá con un período más largo."/> : <div className="usage-charts">
      <div className="usage-wide min-w-0"><h3 className="mb-1 text-[13px] font-semibold text-fore">Usuarios únicos por día</h3><MetricNote className="mb-2 block" source="Sesiones de uso" calc="usuarios distintos por día de Asunción; punteado: período anterior"/><UsageLineChart title="Usuarios únicos por día" points={line} valueLabel="Usuarios únicos" prevName="Período anterior"/><p className="sr-only">{prevName}</p></div>
      <div className="min-w-0"><h3 className="mb-1 text-[13px] font-semibold text-fore">Altas por día</h3><MetricNote className="mb-2 block" source="Cuentas y agencias" calc="creadas por día de Asunción, sin demos"/><UsageBarChart title="Altas por día" groups={signups} series={["Usuarios", "Agencias"]}/></div>
      <div className="min-w-0"><h3 className="mb-1 text-[13px] font-semibold text-fore">Usuarios únicos por hora</h3><MetricNote className="mb-2 block" source="Sesiones de uso" calc="usuarios distintos por hora de Asunción en el período"/><UsageBarChart title="Usuarios únicos por hora" groups={hourly} series={["Usuarios únicos"]} tickEvery={3}/></div>
    </div>}
    <div className="min-w-0">
      <h3 className="mb-1 text-[13px] font-semibold text-fore">Últimos 4 meses</h3>
      <MetricNote className="mb-2 block" source="Cuentas y sesiones" calc="altas y usuarios activos por mes calendario de Asunción"/>
      <ListGrid label="Últimos 4 meses" template={MONTH_TEMPLATE} columns={MONTH_COLUMNS} minWidthClass="min-w-[18rem]">
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
    <MetricNote className="mb-2 block" source="Sesiones de uso" calc="usuarios activos a 7 y 30 días y sesiones del período por agencia real"/>
    <FilterToolbar summary={`${visible.length} de ${agencies.length}`}>
      <SearchField className="min-w-[12rem] flex-1 sm:max-w-72"  label="Buscar agencias en el uso" hideLabel value={query} onChange={(nextSearchValue)=>setQuery(nextSearchValue)} placeholder="Agencia o responsable"/>
      <label className="grid gap-1.5 text-[11px] font-semibold text-mute">Ordenar por
        <Select hideLabel label="Ordenar agencias" value={sort} onChange={(value:string)=>setSort(value)} className="min-w-[11rem]">
          <option value="active30">Activos 30 días</option>
          <option value="last">Último acceso</option>
        </Select>
      </label>
    </FilterToolbar>
    {visible.length ? <ListGrid label="Uso por agencia" template={AGENCY_TEMPLATE} columns={AGENCY_COLUMNS} minWidthClass="min-w-[46rem]">
      {visible.map((row) => <ListRow key={row.id} template={AGENCY_TEMPLATE}>
        <span role="cell" className="min-w-0"><PersonContainer size="sm" variante="logo" name={row.name} photoUrl={row.logo_url} verified/></span>
        <span role="cell" className="min-w-0">{row.owner ? <PersonContainer size="sm" name={row.owner.name} photoUrl={row.owner.avatar_url} secondary={row.owner.email} verified/> : <span className="list-secondary">Sin responsable</span>}</span>
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
    <MetricNote className="mb-2 block" source="Sesiones de uso" calc="los 50 usuarios reales con acceso más reciente"/>
    {users.length ? <ListGrid label="Usuarios recientes" template={USER_TEMPLATE} columns={USER_COLUMNS} minWidthClass="min-w-[36rem]">
      {users.map((row) => <ListRow key={row.id} template={USER_TEMPLATE}>
        <span role="cell" className="min-w-0"><PersonContainer size="sm" name={row.name} photoUrl={row.avatar_url} secondary={row.email} verified/></span>
        <span role="cell" className="list-secondary text-[12.5px] text-fore" title={row.agency}>{row.agency}</span>
        <span role="cell" className="list-date" title={listDateFull(row.last_seen_at) || undefined}>{listDateFull(row.last_seen_at) || "—"}</span>
        <span role="cell" className="list-amount">{formatPlatformMetric(row.sessions)}</span>
      </ListRow>)}
    </ListGrid> : <EmptyBlock compact icon="report" title="Sin accesos registrados." description="Cuando alguien use la plataforma aparece acá con su último acceso."/>}
  </div>;
}
