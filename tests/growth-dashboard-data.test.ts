import assert from 'node:assert/strict';
import {test} from 'node:test';
import {GROWTH_METRICS,growthDayKey,growthSeries,growthSum,growthVariation,growthWindow,metricSeries,type GrowthEvent} from '../app/growth-dashboard-data';

// Datos de estrés: 3 eventos conocidos por día en la ventana de 7 días.
const events:GrowthEvent[]=[
 {name:'page_view',event_date:'2026-09-20',count:10},
 {name:'page_view',event_date:'2026-09-21',count:20},
 {name:'page_view',event_date:'2026-09-22',count:30},
 {name:'mobile_view',event_date:'2026-09-22',count:5},
 {name:'whatsapp_click',event_date:'2026-09-22',count:2},
 {name:'page_view',event_date:'2026-09-15',count:100},
 {name:'other_event',event_date:'2026-09-22',count:999},
];
const today=new Date(2026,8,22); // 22-sep-2026 local

test('growth window covers the current period and the previous one',()=>{
 const window=growthWindow(7,today);
 assert.equal(window.dayKeys.length,7);
 assert.equal(window.dayKeys[0],'2026-09-16');
 assert.equal(window.dayKeys.at(-1),'2026-09-22');
 assert.equal(growthDayKey(window.previousStart),'2026-09-09');
 assert.equal(growthDayKey(window.currentStart),'2026-09-16');
});

test('growth sums stay inside each window',()=>{
 const window=growthWindow(7,today);
 assert.equal(growthSum(events,'page_view',window),60,'15-sep stays out of the current window');
 assert.equal(growthSum(events,'page_view',window,true),100);
 assert.equal(growthSum(events,'other_event',window),999,'unknown event names are still countable');
 assert.equal(growthSum([],'page_view',window),0);
});

test('daily series keep every day of the window in order',()=>{
 const window=growthWindow(7,today);
 const points=metricSeries(events,'page_view',window);
 assert.deepEqual(points.map(point=>point.count),[0,0,0,0,10,20,30]);
 assert.equal(metricSeries(events,'mobile_view',window).at(-1)?.count,5);
});

test('variation needs a previous base and keeps one decimal at the view',()=>{
 assert.equal(growthVariation(120,100),20);
 assert.equal(growthVariation(80,100),-20);
 assert.equal(growthVariation(10,0),null);
 assert.equal(growthVariation(0,0),null);
});

test('growthSeries returns the three canonical metrics with evolution',()=>{
 const series=growthSeries(events,7,today);
 assert.deepEqual(series.metrics.map(metric=>metric.name),['page_view','mobile_view','whatsapp_click']);
 assert.deepEqual(GROWTH_METRICS.map(metric=>metric.label),['Páginas vistas','Vistas desde móvil','Clics en WhatsApp']);
 assert.equal(series.metrics[0].current,60);
 assert.equal(series.metrics[0].previous,100);
 assert.equal(Math.round(series.metrics[0].variation!*10)/10,-40);
 assert.equal(series.metrics[2].variation,null,'sin base anterior');
 assert.deepEqual(series.points,metricSeries(events,'page_view',growthWindow(7,today)));
 assert.equal(series.sum('mobile_view'),5,'the compatibility sum keeps working');
});
