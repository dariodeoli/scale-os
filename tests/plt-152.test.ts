import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(file:string)=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

// #152: el modelo de avisos queda explícito (in-app siempre; correo opt-in con
// dependientes deshabilitados) y los correos técnicos de demo no se muestran.
test('preferencias de correo: in-app vs correo y dependientes deshabilitados',()=>{
 const ui=read('app/notifications-ui.tsx');
 assert.match(ui,/Recibir avisos por correo/);
 assert.match(ui,/La campana de Scale OS siempre muestra los avisos in-app/);
 for(const label of ['Asignaciones por correo','Comentarios y menciones por correo','Entregas pendientes por correo'])assert.ok(ui.includes(label),label);
 assert.match(ui,/disabled:v=>v\.email_enabled!=='true'/, 'los dependientes se deshabilitan con el correo apagado');
 assert.match(ui,/El correo está apagado: las opciones de abajo no tienen efecto/);
});

test('Editor admite campos dependientes deshabilitados',()=>{
 const editor=read('app/operations.tsx');
 assert.match(editor,/disabled\?: boolean \| \(\(values: Record<string, ?string>\) => boolean\)/);
 assert.match(editor,/const fieldDisabled=pending\|\|/);
 assert.match(editor,/disabled=\{fieldDisabled\}/);
});

test('demo limpia: sin correos técnicos en identidad, menciones y custodias',()=>{
 assert.match(read('app/commenting.tsx'),/technicalEmail/);
 assert.match(read('app/comment-composer.tsx'),/technicalEmail/);
 assert.match(read('app/my-profile.tsx'),/Acceso de demostración/);
 assert.match(read('app/my-data.tsx'),/Cuenta de demostración/);
 assert.match(read('app/operations.tsx'),/personLabel\(entry\.member/);
 assert.match(read('app/sections/finanzas.tsx'),/account\.custodian_name/);
 assert.match(read('app/sections/finanzas.tsx'),/PersonContainer[^>]*name=\{account\.custodian_name/,'la UI prefiere el nombre al correo');
 const core=read('backend/agency-core.js');
 // FIN #149 resolvió la identidad de custodia en main (nombre/foto); PLT
 // conserva sus guardas de correos técnicos en identidad y menciones.
 assert.ok(core.includes('custodian_name'),'el API entrega el nombre de custodia');
 assert.ok(core.includes('custodian_photo_url'),'el API entrega la foto de custodia');
});

test('presencia: el contexto de workspace no afirma «este proyecto»',()=>{
 const presence=read('app/presence.tsx');
 assert.match(presence,/context\?:'project'\|'workspace'/);
 assert.match(presence,/Viendo un proyecto/);
 assert.match(presence,/En línea/);
 assert.match(presence,/<PresenceAvatars people=\{people\} alwaysGreen=\{exact\} context="workspace"\/>/);
});
