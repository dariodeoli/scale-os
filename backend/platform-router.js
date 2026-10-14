import {actor,platformAdmin,PLATFORM_GATE_MESSAGE,PLATFORM_GATE_STATUS} from './platform-admin.js';
import {platformUsage} from './platform-usage.js';
import {platformInquiries} from './platform-inquiries.js';
import {platformMetrics} from './platform-metrics.js';
import {platformAnnouncements} from './platform-announcements.js';
import {platformMaintenance} from './platform-maintenance.js';
import {platformTraffic} from './platform-traffic.js';

// Única entrada de /api/platform/* (guía §1). server.js no despacha ninguna ruta
// global por su cuenta: llama a `platformRouter`, que corre el guard (`actor`) ANTES
// de cualquier handler y responde un 404 genérico a quien no es admin global, aunque
// la ruta no exista. Un módulo nuevo del panel (Comunicados, Mantenimiento, Errores,
// Reportes…) se registra agregando su handler a esta lista; `test-platform-guard.mjs`
// enumera las rutas de cada módulo registrado y verifica que ninguna se salte el guard.
// El orden importa: `platformAdmin` responde 404 a lo que no reconoce, va al final.
export const PLATFORM_HANDLERS=[platformUsage,platformInquiries,platformMetrics,platformAnnouncements,platformMaintenance,platformTraffic,platformAdmin];

export async function platformRouter(context){
 const {req,res,url,db,session,send}=context;
 if(url.pathname!=='/api/platform'&&!url.pathname.startsWith('/api/platform/'))return false;
 try{await actor(db,session,req);}
 catch{send(res,PLATFORM_GATE_STATUS,{error:PLATFORM_GATE_MESSAGE});return true;}
 for(const handler of PLATFORM_HANDLERS)if(await handler(context))return true;
 send(res,PLATFORM_GATE_STATUS,{error:PLATFORM_GATE_MESSAGE});return true;
}
