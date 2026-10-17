import type {StudioContext,StudioReservation,StudioSpace} from '../../app/studio-data';
export const studioContext:StudioContext={user_id:'1',role:'owner',time_zone:'America/Asuncion',can_manage:true,can_reserve:true,members:[],projects:[]};
export const studioSpaces:StudioSpace[]=[{id:'1',name:'Estudio sintético A',scenario:'Fondo blanco',notes:'',active:true},{id:'2',name:'Estudio sintético B',scenario:'Fondo negro',notes:'',active:true}];
export const studioReservations:StudioReservation[]=[
 {id:'17',space_id:'1',space_name:'Estudio sintético A',project_id:null,project_name:null,title:'Reserva de hoy 17',production_type:'video',starts_at:'2026-10-17T13:00:00.000Z',ends_at:'2026-10-17T14:00:00.000Z',status:'reserved',notes:'',created_by_user_id:'1',responsible_members:[],version:1},
 {id:'18',space_id:'2',space_name:'Estudio sintético B',project_id:null,project_name:null,title:'Reserva de mañana 18',production_type:'fotografia',starts_at:'2026-10-18T13:00:00.000Z',ends_at:'2026-10-18T14:00:00.000Z',status:'reserved',notes:'',created_by_user_id:'2',responsible_members:[],version:1},
];
