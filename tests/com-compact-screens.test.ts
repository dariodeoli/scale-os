import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Pasé de compactación (#93) y densidad integral (#100): guardas de layout y de
// contrato para Clientes, Resumen, Pipeline, Métricas, Presupuestos y Planes.
// Reglas: header de una fila (56 px), toolbar en una fila, KPIs 112–140, info
// secundaria como chip/tooltip, selección masiva contextual (sólo con
// selección), sin márgenes por defecto del navegador (preflight off) y sin
// bloques que repitan lo que ya muestra la lista.

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('pipeline: la toolbar va en una fila, los KPIs no se estiran y los totales son una franja',()=>{
 const pipeline=read('app/sections/pipeline.tsx');
 // La instrucción del tablero y las acciones comparten fila, arriba de los KPIs.
 assert.match(
  pipeline,
  /<div className="flex flex-wrap items-center gap-x-3 gap-y-2">[\s\S]{0,700}?Arrastrá una tarjeta[\s\S]{0,900}?Nueva oportunidad<\/Button>/,
  'la ayuda y las acciones del tablero comparten una fila',
 );
 assert.doesNotMatch(pipeline, /flex flex-wrap items-center justify-end gap-2">\s*<Button type="button" variant="ghost" onClick=\{\(\)=>setStagePanel\(true\)\}/, 'las acciones no vuelven a su fila propia');
 // La ayuda de arrastre es una etiqueta corta con la explicación en tooltip.
 assert.match(pipeline, /title="Arrastrá una tarjeta a otra etapa activa para moverla; ganar fija 100% y perder 0%\."><Move size=\{13\}/, 'la explicación del arrastre vive en el tooltip (#100)');
 assert.match(pipeline, /<span className="truncate">Mover: arrastrá una tarjeta a otra etapa<\/span>/, 'la etiqueta visible es corta');
 assert.match(pipeline, /flex flex-wrap items-center gap-2 max-md:ml-auto/, 'las acciones conservan su lugar en mobile');
 // Valor abierto: la moneda base en el valor y el resto en la explicación.
 assert.match(pipeline, /const openAmounts=Object\.entries\(overview\.amounts\)/, 'las monedas abiertas se leen una sola vez');
 assert.match(pipeline, /valor=\{openAmounts\.length\?<MoneyText valor=\{openAmounts\[0\]\[1\]\}/, 'el valor del KPI usa la moneda base');
 assert.match(pipeline, /openAmounts\.slice\(1\)/, 'las demás monedas van en la línea de explicación');
 // Los totales por etapa viven en la columna (sin bloque que repita el encabezado, #100).
 assert.doesNotMatch(pipeline, /aria-label="Totales por etapa"/, 'no vuelve el bloque de totales que duplicaba los encabezados de columna');
 assert.match(pipeline, /totals\?\.weighted\|\|weightedAmounts\(rows\)/, 'la columna lee el ponderado de la derivación compartida');
 assert.match(pipeline, /ponderado\{open\[currency\]/, 'la columna muestra el abierto sin repetir el encabezado');
 assert.doesNotMatch(pipeline, /GrowthDashboard/, 'el Pipeline no embebe la pantalla completa de Métricas (#100)');
 assert.match(pipeline, /Captación digital y visitas/, 'la captación se resume en un chip con enlace');
 assert.match(pipeline, /onClick=\{\(\)=>navigate\('Métricas'\)\}/, 'el chip navega a Métricas con la vía del shell (sin duplicar la pantalla)');
 // Títulos sin márgenes por defecto (preflight off).
 assert.match(pipeline, /<h3 className="m-0 text-sm font-bold text-fore">\{stage\.label\}/, 'el título de columna no trae márgenes del navegador');
});

test('resumen y métricas: títulos sin márgenes por defecto y gráfico al alto compacto',()=>{
 const resumen=read('app/sections/resumen.tsx');
 assert.match(resumen, /<h2 className="m-0 text-\[17px\] font-semibold tracking-tight text-fore">Piezas por etapa<\/h2>/, 'el panel de piezas no arrastra márgenes del navegador');
 assert.doesNotMatch(resumen, /aria-label="Métricas operativas"|label="Proyectos activos"/, 'el Resumen no repite las métricas de los módulos (#100)');
 assert.doesNotMatch(resumen, /href="\/produccion"/, 'un solo CTA a Producción (el del panel de piezas)');
 const dashboard=read('app/growth-dashboard.tsx');
 assert.match(dashboard, /<h2 className="m-0 mt-0\.5 text-\[17px\]/, 'el título del tablero de crecimiento');
 assert.match(dashboard, /role="img"[\s\S]{0,220}?h-32 items-end/, 'el gráfico usa el alto compacto');
 assert.match(dashboard, /<h3 id="growth-evolution" className="m-0 text-sm/, 'el título de la evolución');
});

test('resumen comercial: la expectativa contratada usa la derivación compartida y el chip chico',()=>{
 const control=read('app/control-center.tsx');
 assert.match(control, /const billingEstado=allowed\?billingExpectationState\(commercial,commercialError\?'error':'loading'\):null;/, 'el estado sale de la derivación de control-center-data');
 assert.match(control, /billingEstado==='sin-contratos'\?<><strong className="no-movements">—<\/strong><StateChip tone="mute" title="No hay contratos comerciales activos">Sin contratos<\/StateChip><\/>/, 'sin contratos es `—` + chip secundario');
 assert.doesNotMatch(control, /Sin contratos activos<\/strong>/, 'no vuelve el titular largo');
 const css=read('app/control-center.css');
 assert.match(css, /\.finance-compare\{display:grid;gap:10px;grid-template-columns:repeat\(auto-fit,minmax\(340px,1fr\)\);margin:10px 2px 0\}/, 'la comparativa financiera usa grilla auto-fit: dos monedas caben al lado');
});

test('planes: la acción vive en la fila de la leyenda y el KPI no se estira',()=>{
 const planes=read('app/sections/planes.tsx');
 assert.match(planes, /acciones=\{state==='ready'&&canEdit\?<Button type="button" className="max-md:min-h-11" onClick=\{\(\)=>setEdit\('new'\)\}/, 'Nuevo plan viaja como acción de la fila del comparador');
 assert.doesNotMatch(planes, /flex flex-wrap items-center justify-end">\s*<Button type="button" onClick=\{\(\)=>setEdit\('new'\)\}/, 'la acción no tiene fila propia');
 const comparison=read('app/plan-comparison.tsx');
 assert.match(comparison, /acciones\?:ReactNode/, 'el comparador acepta la acción de la pantalla');
 assert.match(comparison, /flex flex-wrap items-center justify-between gap-x-3 gap-y-2/, 'leyenda y acción comparten fila');
 assert.match(comparison, /<h3 className="m-0 whitespace-normal/, 'el nombre del plan no trae márgenes del navegador');
});

test('presupuestos: la franja de KPIs y la barra de lote quedan en el contrato compacto',()=>{
 const presupuestos=read('app/sections/presupuestos.tsx');
 assert.match(presupuestos, /<KpiStrip aria-label="Métricas de presupuestos">/, 'la franja de KPIs es la del sistema');
 assert.match(presupuestos, /hint=\{totals\.length \? `Total sin IVA:/, 'el total por moneda viaja en la línea de explicación');
 assert.match(presupuestos, /className="bulk-bar"/, 'la barra de lote sigue siendo la primitiva compartida (no se creó variante)');
 assert.doesNotMatch(presupuestos, /Intl\.NumberFormat/, 'los montos salen de los formateadores compartidos');
});


test('selección masiva contextual: la barra sólo existe con algo seleccionado (#100)',()=>{
 for(const [nombre,ruta] of [['Clientes','app/sections/clientes.tsx'],['Presupuestos','app/sections/presupuestos.tsx']] as const){
  const source=read(ruta);
  assert.match(source, /\{canManage[A-Za-z]* && selected[A-Za-z]*\.length \? <div className="bulk-bar"/, `${nombre}: la barra depende de la selección`);
  assert.doesNotMatch(source, /bulk-hint">Seleccioná varios para operar en lote/, `${nombre}: sin selección no hay fila de lote`);
 }
 const pipeline=read('app/sections/pipeline.tsx');
 assert.doesNotMatch(pipeline, /bulk-bar|batch/i, 'el Pipeline no tiene lote y no inventa una barra');
 const planes=read('app/sections/planes.tsx');
 assert.doesNotMatch(planes, /bulk-bar|batch/i, 'Planes no tiene lote y no inventa una barra');
});

test('presupuestos: la tabla densa entra a 1280–1440 y la fila va en una línea (#100)',()=>{
 const presupuestos=read('app/sections/presupuestos.tsx');
 assert.match(presupuestos, /minmax\(14rem,2fr\).*minmax\(8rem,1\.1fr\)/, 'las pistas de identidad y cliente sostienen la tabla a 1280');
 assert.match(presupuestos, /const BUDGET_TABLE_MIN_WIDTH = denseTableMinWidth\(58, 8\)/, 'el ancho mínimo (992 px) permite la tabla a 1280');
 assert.match(presupuestos, /className="min-w-0 truncate text-\[13\.5px\] font-semibold leading-tight text-fore" title=\{budget\.title\}/, 'el título de la fila no parte la fila en dos líneas');
 assert.match(presupuestos, /<BudgetActions id=\{budget\.id\} variant="icon" label=\{budget\.number\}/, 'la acción de abrir es un icono con tooltip exacto');
 const suite=read('app/suite.tsx');
 assert.match(suite, /variant\?:'text'\|'icon'/, 'el compositor de acciones de presupuesto expone la variante compacta');
});

test('planes: ítems en una línea con el detalle en tooltip y sin KPI redundante (#100)',()=>{
 const comparison=read('app/plan-comparison.tsx');
 assert.match(comparison, /data-plan-item className="flex flex-wrap items-baseline gap-x-2/, 'cada ítem del plan vive en una línea');
 assert.match(comparison, /title=\{`Cantidad del ítem: \$\{item\.quantity===null\?'No disponible':numberLabel\(item\.quantity\)\} · Precio unitario/, 'el detalle etiquetado queda en el tooltip del ítem');
 assert.match(comparison, /min-w-\[9rem\] flex-1 \[overflow-wrap:anywhere\]/, 'la descripción conserva su ancho legible y no se recorta');
 const planes=read('app/sections/planes.tsx');
 assert.match(planes, /<Kpi label="Valor de ítems"/, 'el valor de ítems es un KPI propio');
 assert.doesNotMatch(planes, /label="Monedas"/, 'sin KPI redundante de monedas');
});

test('resumen: sin métricas duplicadas de los módulos y un solo CTA (#100)',()=>{
 const resumen=read('app/sections/resumen.tsx');
 assert.doesNotMatch(resumen, /aria-label="Métricas operativas"|label="Proyectos activos"/, 'no repite Producción/Proyectos');
 assert.doesNotMatch(resumen, /href="\/produccion"/, 'un solo camino a Producción (el del panel de piezas)');
 assert.match(resumen, /<ControlCenter role=\{user\?\.role\|\|'viewer'\} orders=\{orders\} refresh=\{load\} navigate=\{setActive\} signals=\{summary\}\/>/, 'las señales siguen enlazando al módulo');
});
