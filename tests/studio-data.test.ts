import assert from 'node:assert/strict';
import {studioCanManageReservation,studioMonthGrid,studioMonthRange,studioProductionTypeLabel,studioReservationsOverlap,STUDIO_PRODUCTION_TYPES,type StudioContext,type StudioReservation} from '../app/studio-data';
import {opsLocalTime,opsUtcTime} from '../app/ops-time';

// --- Rango del mes en la zona operativa (UTC-3 todo el año desde la ley de horario único).
assert.deepEqual(studioMonthRange('2026-09'),{from:'2026-09-01T03:00:00.000Z',to:'2026-10-01T03:00:00.000Z'});
assert.deepEqual(studioMonthRange('2026-12'),{from:'2026-12-01T03:00:00.000Z',to:'2027-01-01T03:00:00.000Z'},'diciembre cierra en enero del año siguiente');
assert.equal(opsLocalTime(studioMonthRange('2026-12').from),'2026-12-01T00:00','el rango arranca en la medianoche de Asunción');
assert.equal(opsUtcTime('2026-12-31T23:30'),'2027-01-01T02:30:00.000Z');

// --- Rótulos de tipo de producción (diccionario único).
assert.deepEqual(STUDIO_PRODUCTION_TYPES.map(type=>type.value),['video','podcast','ads','fotografia','streaming','otro']);
assert.equal(studioProductionTypeLabel('fotografia'),'Foto');
assert.equal(studioProductionTypeLabel('video'),'Video / Reels');
assert.equal(studioProductionTypeLabel('desconocido'),'desconocido','un valor nuevo se muestra crudo, no se inventa');

// --- Permisos de la reserva: gestiona el estudio o el autor con studio.manage.
const context:StudioContext={user_id:'10',role:'production',time_zone:'America/Asuncion',can_manage:false,can_reserve:true,members:[],projects:[]};
const reservation:StudioReservation={id:'1',space_id:'5',space_name:'Set A',title:'Grabación',project_id:null,project_name:null,production_type:'video',starts_at:'2026-09-10T12:00:00.000Z',ends_at:'2026-09-10T15:00:00.000Z',status:'reserved',notes:'',created_by_user_id:'10',responsible_members:[],version:0};
assert.equal(studioCanManageReservation(context,reservation),true,'el autor con estudio disponible gestiona su reserva');
assert.equal(studioCanManageReservation({...context,user_id:'11'},reservation),false,'otro sin manage no toca la reserva ajena');
assert.equal(studioCanManageReservation({...context,user_id:'11',can_manage:true},reservation),true);
assert.equal(studioCanManageReservation({...context,user_id:'10',can_reserve:false},reservation),false,'sin reservar no gestiona');

// --- Solapamiento: rangos semiabiertos dentro del mismo espacio.
const other:StudioReservation={...reservation,id:'2',created_by_user_id:'11',responsible_members:[]};
const cancelled:StudioReservation={...reservation,id:'4',status:'cancelled'};
const rows:StudioReservation[]=[reservation,other,{...reservation,id:'3',space_id:'9',starts_at:'2026-09-10T12:00:00.000Z',ends_at:'2026-09-10T13:00:00.000Z'},cancelled];
assert.equal(studioReservationsOverlap(rows,{spaceId:'5',startsAt:'2026-09-10T14:00:00.000Z',endsAt:'2026-09-10T16:00:00.000Z'})?.id,'1','una franja que se cruza bloquea el espacio');
assert.equal(studioReservationsOverlap(rows,{spaceId:'5',startsAt:'2026-09-10T15:00:00.000Z',endsAt:'2026-09-10T16:00:00.000Z'}),null,'empezar justo cuando termina la anterior no es conflicto');
assert.equal(studioReservationsOverlap(rows,{spaceId:'5',startsAt:'2026-09-10T11:00:00.000Z',endsAt:'2026-09-10T12:00:00.000Z'}),null,'terminar justo cuando empieza tampoco');
assert.equal(studioReservationsOverlap(rows,{spaceId:'7',startsAt:'2026-09-10T12:00:00.000Z',endsAt:'2026-09-10T13:00:00.000Z'}),null,'cada espacio bloquea sólo su franja');
assert.equal(studioReservationsOverlap(rows,{spaceId:'5',startsAt:'2026-09-10T12:00:00.000Z',endsAt:'2026-09-10T15:00:00.000Z',ignoreId:'1'})?.id,'2','al editar, la propia reserva no se considera conflicto');
assert.equal(studioReservationsOverlap([cancelled],{spaceId:'5',startsAt:'2026-09-10T12:00:00.000Z',endsAt:'2026-09-10T13:00:00.000Z'}),null,'una reserva cancelada libera el espacio');
assert.equal(studioReservationsOverlap([],{spaceId:'5',startsAt:'2026-09-10T12:00:00.000Z',endsAt:'2026-09-10T13:00:00.000Z'}),null);

// --- Grilla mensual: espacios en blanco, días y reservas de cada jornada.
const september=studioMonthGrid('2026-09',[reservation,other]);
assert.equal(september.blanks,1,'septiembre de 2026 arranca martes: un lugar libre del lunes');
assert.equal(september.days.length,30);
assert.equal(september.days[0].date,'2026-09-01');
assert.deepEqual(september.days.find(day=>day.date==='2026-09-10')?.reservations.map(row=>row.id),['1','2']);
assert.deepEqual(september.days.find(day=>day.date==='2026-09-11')?.reservations,[]);
// Una reserva que termina a la medianoche ocupa sólo su jornada (rango semiabierto).
const midnight=studioMonthGrid('2026-09',[{...reservation,id:'5',starts_at:'2026-09-10T23:00:00.000Z',ends_at:'2026-09-11T03:00:00.000Z'}]);
assert.deepEqual(midnight.days.find(day=>day.date==='2026-09-10')?.reservations.map(row=>row.id),['5']);
assert.deepEqual(midnight.days.find(day=>day.date==='2026-09-11')?.reservations,[]);
// Febrero bisiesto y cruce de año.
assert.equal(studioMonthGrid('2032-02',[]).days.length,29);
const yearBoundary=studioMonthGrid('2032-12',[{...reservation,id:'6',starts_at:'2033-01-01T01:00:00.000Z',ends_at:'2033-01-01T03:00:00.000Z'}]);
assert.deepEqual(yearBoundary.days.find(day=>day.date==='2032-12-31')?.reservations.map(row=>row.id),['6'],'la franja del 1 de enero de Asunción se ve en el 31 de diciembre');
assert.deepEqual(studioMonthGrid('2033-01',[{...reservation,id:'6',starts_at:'2033-01-01T01:00:00.000Z',ends_at:'2033-01-01T03:00:00.000Z'}]).days.find(day=>day.date==='2033-01-01')?.reservations,[]);

console.log('PASS: estudio — rango del mes, permisos, solapamiento semiabierto y grilla del calendario (medianoche, bisiesto y cruce de año).');
