/**
 * Capa de datos del estudio (dominio OPS, issue #44).
 *
 * Tipos reales del API y funciones puras del calendario y las reservas; sin
 * React y sin JSX. Fuentes: `GET /api/agency/studio-context`, `-spaces`,
 * `-reservations` y el formulario de reserva (`backend/studio-reservations.js`).
 */
import {opsMonthRange,opsUtcTime} from './ops-time';

export type StudioPerson={id:string;name:string;photo_url?:string|null};
export type StudioProject={id:string;name:string;client_name?:string};
export type StudioSpace={
 id:string;name:string;scenario:string;notes:string;active:boolean;
 created_by_user_id?:string|null;created_at?:string;updated_at?:string;
};
export type StudioProductionType='video'|'podcast'|'ads'|'fotografia'|'streaming'|'otro';
export type StudioReservationStatus='reserved'|'cancelled';
export type StudioReservation={
 id:string;space_id:string;space_name:string;space_scenario?:string;
 project_id:string|null;project_name:string|null;title:string;
 production_type:StudioProductionType;starts_at:string;ends_at:string;
 status:StudioReservationStatus;notes:string;created_by_user_id:string;
 responsible_members:StudioPerson[];version:number;
 cancelled_at?:string|null;cancelled_by_user_id?:string|null;
 actor_name?:string;actor_photo_url?:string;actor_verified?:boolean;actor_user_id?:string;
 created_at?:string;updated_at?:string;
};
export type StudioContext={
 user_id:string;role:string;time_zone:string;can_manage:boolean;can_reserve:boolean;
 members:StudioPerson[];projects:StudioProject[];
};

export const STUDIO_PRODUCTION_TYPES:{value:StudioProductionType;label:string}[]=[
 {value:'video',label:'Video / Reels'},
 {value:'podcast',label:'Podcast'},
 {value:'ads',label:'Ads'},
 {value:'fotografia',label:'Foto'},
 {value:'streaming',label:'Streaming'},
 {value:'otro',label:'Otro'},
];
export const studioProductionTypeLabel=(value:string)=>STUDIO_PRODUCTION_TYPES.find(type=>type.value===value)?.label||value;

/** Rango [desde, hasta) del mes civil que pide el calendario. */
export const studioMonthRange=opsMonthRange;

/** El API habilita editar/cancelar a quien gestiona el estudio o a quien creó la reserva. */
export function studioCanManageReservation(context:Pick<StudioContext,'user_id'|'can_manage'|'can_reserve'>,row:StudioReservation){
 return context.can_manage||context.can_reserve&&String(row.created_by_user_id)===String(context.user_id);
}
export const studioReservationIsActive=(row:StudioReservation)=>row.status==='reserved';

/**
 * Reserva activa que se superpone con una franja en el mismo espacio.
 * Rangos semiabiertos (`[starts_at, ends_at)`): una sesión puede empezar justo
 * cuando termina la anterior, igual que la restricción del API.
 */
export function studioReservationsOverlap(
 reservations:StudioReservation[],
 slot:{spaceId:string;startsAt:string;endsAt:string;ignoreId?:string|null},
){
 return reservations.find(row=>
  studioReservationIsActive(row)
  &&String(row.space_id)===String(slot.spaceId)
  &&String(row.id)!==String(slot.ignoreId||'')
  &&row.starts_at<slot.endsAt
  &&row.ends_at>slot.startsAt,
 )||null;
}
export type StudioCalendarDay={date:string;day:number;reservations:StudioReservation[]};
export type StudioCalendarMonth={blanks:number;days:StudioCalendarDay[]};
const gridOffset=(year:number,month:number)=>(new Date(Date.UTC(year,month-1,1)).getUTCDay()+6)%7;
const daysInMonth=(year:number,month:number)=>new Date(Date.UTC(year,month,0)).getUTCDate();
/**
 * Días del mes con las reservas activas que ocupan cada jornada (lunes primero).
 * Cada jornada es el rango semiabierto `[00:00, 00:00 del día siguiente)` en la
 * zona operativa: una reserva que termina a medianoche ocupa sólo su día.
 */
export function studioMonthGrid(month:string,reservations:StudioReservation[]):StudioCalendarMonth{
 const [year,m]=month.split('-').map(Number);
 const days=daysInMonth(year,m);
 const starts=Array.from({length:days+1},(_,index)=>opsUtcTime(`${new Date(Date.UTC(year,m-1,index+1)).toISOString().slice(0,10)}T00:00`));
 return {
  blanks:gridOffset(year,m),
  days:Array.from({length:days},(_,index)=>{
   const day=index+1,date=`${month}-${String(day).padStart(2,'0')}`,start=starts[index],end=starts[index+1];
   return {date,day,reservations:reservations.filter(row=>studioReservationIsActive(row)&&row.starts_at<end&&row.ends_at>start)};
  }),
 };
}
