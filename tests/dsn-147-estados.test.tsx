import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';

// Contrato de los estados engañosos de #147: la vista previa no se ofrece como
// CTA, la guía no afirma vacíos que no leyó (cubierto en
// workspace-guide-loading/data), Mis datos no deja derechos activos sin base,
// la bandeja vacía tiene una sola acción y el panel global no dice «Solo
// lectura» con el acceso denegado.
const file=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('#147: la vista previa del cliente declara que no realiza acciones y no luce CTA primario',()=>{
 const controls=file('app/daily-controls.tsx');
 assert.match(controls,/data-preview="inert"/,'la réplica se marca inerte');
 assert.match(controls,/Vista previa: no realiza acciones/,'la etiqueta exacta vive en el diálogo y en el badge');
 assert.match(controls,/review-preview-badge/,'el badge viaja dentro de la réplica');
 assert.match(controls,/disabled aria-disabled="true">Aprobar esta versión/,'el CTA principal queda deshabilitado y anunciado');
 assert.match(controls,/<a className="secondary justify-self-start" href=\{assetUrl\}/,'el enlace de archivo baja de jerarquía');
 const css=file('app/productivity.css');
 assert.match(css,/\.client-review-preview\[data-preview="inert"\] \.review-preview-actions button\.primary:disabled\{[^}]*background:var\(--surface-subtle\)/,'el primario inerte pierde el relleno de marca');
 const manual=file('app/manual.tsx');
 assert.match(manual,/manual-portal-badge[^>]*>Vista previa: no realiza acciones/,'el manual repite la misma verdad para su réplica');
});

test('#147: Mis datos sin API marca los derechos como próximamente y deriva al canal real',()=>{
 const panel=file('app/my-data.tsx');
 assert.match(panel,/Derechos con registro en preparación/,'el puente declara el registro pendiente');
 assert.match(panel,/bridge\?<ul className="grid gap-2"[^>]*>[\s\S]{0,400}?Próximamente/,'los derechos no se ofrecen como botones activos');
 assert.doesNotMatch(panel,/bridge\?[\s\S]{0,200}?setRequestType/,'sin base no se abre el alta simulada');
 assert.match(panel,/estos pedidos se registran por el canal alternativo/,'el camino real queda visible');
});
