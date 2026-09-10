export const clientStatuses=[{value:'active',label:'Activo'},{value:'paused',label:'Pausado'},{value:'cancelled',label:'Cancelado'},{value:'expired',label:'Servicio vencido'},{value:'inactive',label:'Inactivo'}];
export function clientState(client:{lifecycle_status?:string;active:boolean}){return clientStatuses.find(s=>s.value===client.lifecycle_status)||clientStatuses[client.active?0:4];}
