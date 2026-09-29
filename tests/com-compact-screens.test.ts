import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

// Pase de compactación del resto de Comercial (#93): guardas de layout y de
// contrato para Resumen, Pipeline, Métricas, Presupuestos y Planes. Las reglas
// del pase: una fila de header (56–64 px), toolbar en una fila, KPIs 112–140,
// info secundaria como chip/tooltip y sin márgenes por defecto del navegador
// (el preflight de Tailwind está apagado en esta app).

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
 assert.match(pipeline, /<span className="line-clamp-1 min-w-0">Arrastrá una tarjeta/, 'la ayuda recorta en una línea sin empujar el ancho de la sección en mobile');
 assert.match(pipeline, /text-\[11px\] text-mute max-md:hidden" title="Arrastrá una tarjeta/, 'la ayuda es secundaria en mobile (el detalle queda en el title y en el anuncio accesible)');
 assert.match(pipeline, /flex flex-wrap items-center gap-2 max-md:ml-auto/, 'las acciones conservan su lugar en mobile');
 // Valor abierto: la moneda base en el valor y el resto en la explicación.
 assert.match(pipeline, /const openAmounts=Object\.entries\(overview\.amounts\)/, 'las monedas abiertas se leen una sola vez');
 assert.match(pipeline, /valor=\{openAmounts\.length\?<MoneyText valor=\{openAmounts\[0\]\[1\]\}/, 'el valor del KPI usa la moneda base');
 assert.match(pipeline, /openAmounts\.slice\(1\)/, 'las demás monedas van en la línea de explicación');
 // Totales por etapa: una franja de tarjetas compactas (una fila en ≥1280).
 assert.match(pipeline, /className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6" aria-label="Totales por etapa"/, 'los totales entran en una sola fila en desktop');
 assert.match(pipeline, /aria-label="Totales por etapa"[\s\S]{0,240}?rounded-xl border border-ink-600 bg-ink-800 p-3/, 'las tarjetas de totales usan padding compacto');
 // Títulos sin márgenes por defecto (preflight off).
 assert.match(pipeline, /<h3 className="m-0 truncate text-\[12px\] font-bold text-fore"/, 'el título del total queda en una línea');
 assert.match(pipeline, /<h3 className="m-0 text-sm font-bold text-fore">\{stage\.label\}/, 'el título de columna no trae márgenes del navegador');
});

test('resumen y métricas: títulos sin márgenes por defecto y gráfico al alto compacto',()=>{
 const resumen=read('app/sections/resumen.tsx');
 assert.match(resumen, /<h2 className="m-0 text-\[17px\] font-semibold tracking-tight text-fore">Piezas por etapa<\/h2>/, 'el panel de piezas no arrastra márgenes del navegador');
 assert.match(resumen, /<h2 className="m-0 text-\[17px\] font-semibold tracking-tight text-fore">Métricas operativas<\/h2>/, 'el bloque de métricas operativas tampoco');
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
