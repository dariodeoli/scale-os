"use client";
import {SegmentedField} from '../ui/navigation';

// Tráfico y demos (panel global): cargas de la landing, tiempo y scroll, CTA y la
// actividad de las demos como bloque aparte. Todo sale de `GET /api/platform/traffic`
// (analítica de primera parte, sin PII); días de Asunción. Sin datos se dice «sin
// datos todavía»: nunca se dibujan números inventados.
import {ReactNode, useCallback, useEffect, useMemo, useRef, useState} from "react";

import {platformApi} from "../platform-admin-api";
import {EmptyBlock, ErrorBlock, FilterToolbar, Kpi, KpiStrip, ListGrid, ListRow, LoadingBlock, StateChip, type Column} from "../ui-v2";
import {dayLabel, UsageBarChart} from "./usage-charts";
import {
  CTA_LABELS, DEMO_KIND_LABELS, TRAFFIC_PERIODS, demoHasData, formatCount, formatDuration, formatPercent, landingHasData,
  referrerLabel, roleLabel, scrollDistribution, sectionLabel, sparkPath, trafficDelta, trafficQuery, type TrafficPayload, type TrafficPeriod,
} from "./traffic-model";
import "./usage.css";
import "./traffic.css";

const PAGE_TEMPLATE = "grid-cols-[minmax(9rem,1.6fr)_5rem_5.5rem_6.5rem_5rem]";
const PAGE_COLUMNS: Column[] = [{key: "path", label: "Página"}, {key: "views", label: "Cargas", align: "end"}, {key: "visitors", label: "Visitantes", align: "end"}, {key: "time", label: "Tiempo prom.", align: "end"}, {key: "scroll", label: "Scroll", align: "end"}];
const REF_TEMPLATE = "grid-cols-[minmax(9rem,1.6fr)_5rem_5.5rem]";
const REF_COLUMNS: Column[] = [{key: "domain", label: "Origen"}, {key: "views", label: "Cargas", align: "end"}, {key: "visitors", label: "Visitantes", align: "end"}];
const CTA_TEMPLATE = "grid-cols-[minmax(10rem,1.6fr)_4.5rem_5rem_7.5rem]";
const CTA_COLUMNS: Column[] = [{key: "cta", label: "Botón"}, {key: "clicks", label: "Clics", align: "end"}, {key: "previous", label: "Anterior", align: "end"}, {key: "delta", label: "Variación", align: "end"}];
const SCREEN_TEMPLATE = "grid-cols-[minmax(9rem,1.6fr)_5rem_5rem_6.5rem]";
const SCREEN_COLUMNS: Column[] = [{key: "path", label: "Pantalla"}, {key: "views", label: "Vistas", align: "end"}, {key: "demos", label: "Demos", align: "end"}, {key: "time", label: "Tiempo prom.", align: "end"}];
const SHARE_TEMPLATE = "grid-cols-[minmax(10rem,1.6fr)_4.5rem_5rem_7.5rem]";
const KIND_COLUMNS: Column[] = [{key: "kind", label: "Tipo de demo"}, {key: "started", label: "Iniciadas", align: "end"}, {key: "previous", label: "Anterior", align: "end"}, {key: "delta", label: "Variación", align: "end"}];
const ROLE_TEMPLATE = "grid-cols-[minmax(9rem,1.6fr)_5rem_5rem]";
const ROLE_COLUMNS: Column[] = [{key: "role", label: "Permiso"}, {key: "changes", label: "Cambios", align: "end"}, {key: "demos", label: "Demos", align: "end"}];

/** Nota corta «fuente · cálculo» debajo de cada gráfico o lista. */
function Source({children}: {children: ReactNode}) {
  return <p className="traffic-source">{children}</p>;
}

function Spark({values, label}: {values: (number | null)[]; label: string}) {
  if (!values.length || values.every((value) => !value)) return null;
  return <svg className="traffic-spark" viewBox="0 0 96 24" preserveAspectRatio="none" role="img" aria-label={label}><path d={sparkPath(values)}/></svg>;
}

function DeltaChip({current, previous}: {current: number | null; previous: number | null}) {
  const delta = trafficDelta(current, previous);
  return <span className="traffic-delta" data-tone={delta.tone} title="Contra el período anterior de igual duración">{delta.label}</span>;
}

/** Tarjeta KPI densa: valor, delta contra el período anterior y sparkline diaria. */
function TrafficKpi({label, value, current, previous, series, destacado}: {label: string; value: string; current: number | null; previous: number | null; series: (number | null)[]; destacado?: boolean}) {
  return <Kpi label={label} valor={value} destacado={destacado} hint={<span className="traffic-hint"><DeltaChip current={current} previous={previous}/><Spark values={series} label={`${label} por día`}/></span>}/>;
}

export function PlatformTraffic({onError}: {onError?: (cause: unknown) => boolean}) {
  const [period, setPeriod] = useState<TrafficPeriod>("30");
  const [data, setData] = useState<TrafficPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const load = useCallback(async (next: TrafficPeriod) => {
    const request = ++latest.current;
    setLoading(true);
    setError("");
    try {
      const payload = await platformApi<TrafficPayload>(`/api/platform/traffic${trafficQuery(next)}`);
      if (request === latest.current) setData(payload);
    } catch (cause) {
      if (request === latest.current && !onError?.(cause)) setError(cause instanceof Error ? cause.message : "No pudimos cargar el tráfico.");
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [onError]);
  useEffect(() => { void load(period); }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  return <section className="panel usage-viz traffic-viz" aria-labelledby="platform-traffic-title">
    <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 id="platform-traffic-title" className="text-[15px] font-semibold tracking-tight text-fore">Tráfico y demos</h2>
      <small className="text-[12px] leading-[1.35] text-mute">Analítica propia, sin datos personales; días de Asunción. La demo se muestra aparte y no entra en ningún otro número del panel.</small>
    </div>
    <FilterToolbar summary={data ? (data.range.from === data.range.to ? dayLabel(data.range.from) : `${dayLabel(data.range.from)} → ${dayLabel(data.range.to)}`) : undefined}>
      <SegmentedField className="w-max flex-nowrap [&>button]:min-h-11 md:[&>button]:min-h-8" value={period} onChange={(value: string) => setPeriod(value as TrafficPeriod)} ariaLabel="Período del tráfico" options={TRAFFIC_PERIODS}/>
    </FilterToolbar>
    {error ? <ErrorBlock title="No pudimos cargar el tráfico" description={error} onRetry={() => void load(period)}/> : null}
    {!error && loading && !data ? <LoadingBlock label="Cargando el tráfico…" lines={4}/> : null}
    {!error && data ? <div aria-busy={loading} className={loading ? "opacity-70 transition-opacity" : ""}><TrafficBody data={data}/></div> : null}
  </section>;
}

export function TrafficBody({data}: {data: TrafficPayload}) {
  const {landing, demo, range} = data;
  const prevRange = `${dayLabel(range.previous_from)} → ${dayLabel(range.previous_to)}`;
  const daily = useMemo(() => landing.daily.map((row) => ({label: dayLabel(row.day), values: [row.views, row.visitors]})), [landing.daily]);
  const demoDaily = useMemo(() => demo.daily.map((row) => ({label: dayLabel(row.day), values: [row.started]})), [demo.daily]);
  const scroll = scrollDistribution(landing.totals);
  const pick = <K extends keyof TrafficPayload["landing"]["daily"][number]>(key: K) => landing.daily.map((row) => row[key] as number | null);
  return <div className="grid min-w-0 gap-5">
    <div className="traffic-today" role="status">
      <strong>Hoy ({dayLabel(landing.today.day)})</strong>
      <span>{landing.today.views ? `${formatCount(landing.today.views)} cargas de la web · ${formatCount(landing.today.visitors)} visitantes` : "Sin cargas todavía hoy"}</span>
    </div>

    <section className="grid min-w-0 gap-3" aria-labelledby="traffic-landing">
      <h3 id="traffic-landing" className="text-[13px] font-semibold text-fore">Landing y web pública</h3>
      <KpiStrip dense columns={6}>
        <TrafficKpi destacado label="Cargas de página" value={formatCount(landing.totals.views)} current={landing.totals.views} previous={landing.previous.views} series={pick("views")}/>
        <TrafficKpi label="Visitantes únicos" value={formatCount(landing.totals.visitors)} current={landing.totals.visitors} previous={landing.previous.visitors} series={pick("visitors")}/>
        <TrafficKpi label="Tiempo promedio" value={formatDuration(landing.totals.avg_seconds)} current={landing.totals.avg_seconds} previous={landing.previous.avg_seconds} series={pick("avg_seconds")}/>
        <TrafficKpi label="Scroll promedio" value={formatPercent(landing.totals.avg_scroll)} current={landing.totals.avg_scroll} previous={landing.previous.avg_scroll} series={pick("avg_scroll")}/>
        <TrafficKpi label="Clics en CTA" value={formatCount(landing.totals.cta_clicks)} current={landing.totals.cta_clicks} previous={landing.previous.cta_clicks} series={pick("cta_clicks")}/>
        <TrafficKpi label="Altas reales" value={formatCount(landing.totals.signups)} current={landing.totals.signups} previous={landing.previous.signups} series={[]}/>
      </KpiStrip>
      <Source>Variación contra {prevRange} (mismo largo). Visitante = identificador aleatorio que el navegador renueva cada día: en rangos largos los únicos se acercan a la suma de únicos diarios. Altas reales = cuentas creadas sin demo, sin cruce con visitas.</Source>
      {!landingHasData(data) ? <EmptyBlock compact icon="report" title="Sin datos todavía." description="La landing empieza a medir desde esta versión. Cuando lleguen visitas aparecen acá."/> : <div className="traffic-grid">
        <div className="traffic-wide min-w-0">
          <h4 className="traffic-title">Cargas y visitantes por día</h4>
          <UsageBarChart title="Cargas y visitantes por día" groups={daily} series={["Cargas", "Visitantes únicos"]}/>
          <Source>public_page_views · una carga por vista de la landing; visitantes = ids diarios distintos por día de Asunción.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Profundidad de scroll</h4>
          {landing.totals.scrolled ? <ul className="traffic-bars" aria-label="Vistas que alcanzaron cada profundidad">
            {scroll.map((row) => <li key={row.threshold}><span>{row.threshold} %</span><span className="traffic-bar"><i style={{width: `${row.share ?? 0}%`}}/></span><b>{row.share === null ? "—" : `${row.share} %`}</b></li>)}
          </ul> : <p className="traffic-empty">Sin datos todavía.</p>}
          <Source>Scroll máximo de cada vista al ocultar o cerrar la pestaña · % de {formatCount(landing.totals.scrolled)} vistas medidas que llegó a cada umbral.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Clics en CTA</h4>
          <ListGrid label="Clics en CTA" template={CTA_TEMPLATE} columns={CTA_COLUMNS} minWidthClass="min-w-[26rem]">
            {landing.ctas.map((row) => <ListRow key={row.cta} template={CTA_TEMPLATE}>
              <span role="cell" className="list-identity text-fore" title={CTA_LABELS[row.cta] || row.cta}>{CTA_LABELS[row.cta] || row.cta}</span>
              <span role="cell" className="list-amount">{formatCount(row.clicks)}</span>
              <span role="cell" className="list-amount text-mute">{formatCount(row.previous)}</span>
              <span role="cell" className="text-right"><DeltaChip current={row.clicks} previous={row.previous}/></span>
            </ListRow>)}
          </ListGrid>
          <Source>public_analytics_events · clics en botones marcados (registro, demo), WhatsApp y envíos del formulario de contacto.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Páginas más vistas</h4>
          <ListGrid label="Páginas más vistas" template={PAGE_TEMPLATE} columns={PAGE_COLUMNS} minWidthClass="min-w-[30rem]">
            {landing.pages.map((row) => <ListRow key={row.path} template={PAGE_TEMPLATE}>
              <span role="cell" className="list-identity font-mono text-[12px] text-fore" title={row.path}>{row.path}</span>
              <span role="cell" className="list-amount">{formatCount(row.views)}</span>
              <span role="cell" className="list-amount">{formatCount(row.visitors)}</span>
              <span role="cell" className="list-amount">{formatDuration(row.avg_seconds)}</span>
              <span role="cell" className="list-amount">{formatPercent(row.avg_scroll)}</span>
            </ListRow>)}
          </ListGrid>
          <Source>Ruta sin parámetros ni ids · top 10 por cargas; tiempo = segundos con la pestaña visible.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Origen de las visitas</h4>
          <ListGrid label="Origen de las visitas" template={REF_TEMPLATE} columns={REF_COLUMNS} minWidthClass="min-w-[20rem]">
            {landing.referrers.map((row) => <ListRow key={row.domain || "directo"} template={REF_TEMPLATE}>
              <span role="cell" className="list-identity text-fore" title={referrerLabel(row.domain)}>{referrerLabel(row.domain)}</span>
              <span role="cell" className="list-amount">{formatCount(row.views)}</span>
              <span role="cell" className="list-amount">{formatCount(row.visitors)}</span>
            </ListRow>)}
          </ListGrid>
          <Source>Solo el dominio del referer (sin ruta ni query) · top 10 por cargas.</Source>
        </div>
      </div>}
    </section>

    <section className="traffic-demo grid min-w-0 gap-3" aria-labelledby="traffic-demo">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 id="traffic-demo" className="text-[13px] font-semibold text-fore">Demos</h3>
        <StateChip tone="info" title="Los datos de demo solo aparecen en este bloque">Separado del resto del panel</StateChip>
      </div>
      <KpiStrip dense columns={4}>
        <TrafficKpi destacado label="Demos iniciadas" value={formatCount(demo.totals.started)} current={demo.totals.started} previous={demo.previous.started} series={demo.daily.map((row) => row.started)}/>
        <TrafficKpi label="Duración promedio" value={formatDuration(demo.totals.avg_seconds)} current={demo.totals.avg_seconds} previous={demo.previous.avg_seconds} series={[]}/>
        <TrafficKpi label="Pantallas vistas" value={formatCount(demo.totals.views)} current={demo.totals.views} previous={demo.previous.views} series={[]}/>
        <Kpi label="Cambios de permiso" valor={formatCount(demo.totals.role_changes)} hint="Permisos probados dentro de la demo"/>
      </KpiStrip>
      <Source>public_analytics_events (inicio y cambio de permiso, registrados por el API) y public_page_views de la demo · duración = segundos visibles acumulados por demo, promedio entre {formatCount(demo.totals.timed_demos)} demos medidas.</Source>
      {!demoHasData(data) ? <EmptyBlock compact icon="report" title="Sin datos todavía." description="Cuando alguien abra una demo aparece acá, separada de los datos reales."/> : <div className="traffic-grid">
        <div className="traffic-wide min-w-0">
          <h4 className="traffic-title">Demos iniciadas por día</h4>
          <UsageBarChart title="Demos iniciadas por día" groups={demoDaily} series={["Demos iniciadas"]}/>
          <Source>Evento demo_start · día de Asunción en que se creó la demo.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Qué demo se usa más</h4>
          <ListGrid label="Tipo de demo" template={SHARE_TEMPLATE} columns={KIND_COLUMNS} minWidthClass="min-w-[26rem]">
            {demo.kinds.map((row) => <ListRow key={row.kind} template={SHARE_TEMPLATE}>
              <span role="cell" className="list-identity text-fore" title={DEMO_KIND_LABELS[row.kind] || row.kind}>{DEMO_KIND_LABELS[row.kind] || row.kind}</span>
              <span role="cell" className="list-amount">{formatCount(row.started)}</span>
              <span role="cell" className="list-amount text-mute">{formatCount(row.previous)}</span>
              <span role="cell" className="text-right"><DeltaChip current={row.started} previous={row.previous}/></span>
            </ListRow>)}
          </ListGrid>
          <Source>Pública = abierta desde la landing; privada = un dueño real que abre la demo desde su cuenta.</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Permisos probados</h4>
          {demo.roles.length ? <ListGrid label="Permisos probados" template={ROLE_TEMPLATE} columns={ROLE_COLUMNS} minWidthClass="min-w-[18rem]">
            {demo.roles.map((row) => <ListRow key={row.role} template={ROLE_TEMPLATE}>
              <span role="cell" className="list-identity text-fore">{roleLabel(row.role)}</span>
              <span role="cell" className="list-amount">{formatCount(row.changes)}</span>
              <span role="cell" className="list-amount">{formatCount(row.demos)}</span>
            </ListRow>)}
          </ListGrid> : <p className="traffic-empty">Sin cambios de permiso todavía. Toda demo empieza como Dueño.</p>}
          <Source>Evento demo_role · cada cambio en «Probar permiso».</Source>
        </div>
        <div className="min-w-0">
          <h4 className="traffic-title">Pantallas más visitadas</h4>
          {demo.screens.length ? <ListGrid label="Pantallas más visitadas en la demo" template={SCREEN_TEMPLATE} columns={SCREEN_COLUMNS} minWidthClass="min-w-[24rem]">
            {demo.screens.map((row) => <ListRow key={row.path} template={SCREEN_TEMPLATE}>
              <span role="cell" className="list-identity capitalize text-fore" title={row.path}>{sectionLabel(row.path)}</span>
              <span role="cell" className="list-amount">{formatCount(row.views)}</span>
              <span role="cell" className="list-amount">{formatCount(row.demos)}</span>
              <span role="cell" className="list-amount">{formatDuration(row.avg_seconds)}</span>
            </ListRow>)}
          </ListGrid> : <p className="traffic-empty">Sin pantallas registradas todavía.</p>}
          <Source>public_page_views de la demo · sección (primer tramo de la ruta), top 12 por vistas.</Source>
        </div>
        <div className="traffic-wide min-w-0">
          <h4 className="traffic-title">Conversión demo → registro</h4>
          <p className="traffic-empty">{demo.conversion.measurable ? "" : `No medible todavía. ${demo.conversion.reason}`} Como referencia: {formatCount(landing.ctas.find((row) => row.cta === "trial")?.clicks ?? 0)} clics en «Empezar gratis» y {formatCount(landing.totals.signups)} altas reales en el período.</p>
        </div>
      </div>}
    </section>
  </div>;
}
