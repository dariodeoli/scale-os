/*
 * Fixtures v2 de Acceso (issue #46): marco único `AccessLayout` y estados de
 * registro, invitación, verificación, acceso pendiente y estado del servicio.
 *
 * Replica las clases de `app/access-layout.tsx` y de las páginas
 * `app/registro/page.tsx`, `app/invitacion/page.tsx`, `app/verificar-correo/page.tsx`,
 * `app/acceso-pendiente/page.tsx` y `app/status/page.tsx`. Objetos compartidos por
 * `renderToStaticMarkup`; datos de ejemplo, sin campos inventados.
 */
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Badge, Button, Skeleton} from 'owncoding-ui';

const h = React.createElement;
const CHIP = {ok: 'green', warn: 'orange', bad: 'red', info: 'blue', mute: 'slate'};
const StateChip = ({tone = 'mute', children}) => h(Badge, {color: CHIP[tone], className: 'whitespace-nowrap'}, children);

const Frame = ({children, wide = false, eyebrow}) => h('main', {className: 'flex min-h-screen items-center justify-center bg-paper px-4 py-10'},
  h('div', {className: `w-full min-w-0 ${wide ? 'max-w-3xl' : 'max-w-[30rem]'}`},
    h('section', {className: 'grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5 rounded-2xl border border-ink-600 bg-ink-800 p-6 md:p-7'},
      h('header', {className: 'flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3'},
        h('span', {className: 'inline-flex items-center gap-2 text-lg font-bold tracking-tight text-fore'}, 'ScaleOS'),
        eyebrow ? h('p', {className: 'font-mono text-[10px] uppercase tracking-[.13em] text-mute'}, eyebrow) : null),
      children,
      h('p', {className: 'text-center text-[11px] text-mute'}, 'Scale OS · v1.0.104'))));

const INPUT = 'h-11 rounded-lg border border-ink-500 bg-ink-800 px-3 text-base text-fore outline-none transition md:h-9 md:text-sm';
const LABEL = 'grid gap-1.5 text-xs text-mute';
const Field = (label, value) => h('label', {key: label, className: LABEL}, label, h('span', {className: `${INPUT} flex min-w-0 items-center`}, h('span', {className: 'min-w-0 break-words'}, value)));



/* Registro: paso 1 (identidad) con el progreso v2. */
const registro = h(Frame, {eyebrow: 'Tu agencia, tu espacio'},
  h('ol', {className: 'grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-3'},
    [['Identidad', 1, 'current'], ['Agencia', 2, 'todo'], ['Acceso', 3, 'todo']].map(([label, value, state]) =>
      h('li', {key: label, 'aria-current': state === 'current' ? 'step' : undefined, className: `flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] ${state === 'current' ? 'border-fono text-fore' : 'border-ink-600 text-mute'}`},
        h('span', {className: 'grid size-5 place-items-center rounded-full border border-current text-[10px] font-bold tabular-nums'}, String(value)),
        h('b', {className: 'font-semibold'}, label)))),
  h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, 'Empecemos con tu identidad.'),
  h('p', {className: 'text-sm text-mute'}, 'Primero verificamos cómo querés identificarte. Después configurás tu agencia.'),
  h(Button, {variant: 'outline'}, 'Continuar con Google'),
  h('small', {className: 'text-[11.5px] text-mute'}, 'Google confirma tu correo antes de que creemos la agencia.'),
  Field('Correo de trabajo', h('span', {className: 'min-w-0 break-words text-mute'}, 'facturacion@estudiodecomunicacion.com.py')),
  h(Button, null, 'Continuar con correo'));

/* Invitación: enlace activo con vencimiento y estado no disponible. */
const invitacion = h(Frame, {eyebrow: 'Scale OS · Acceso de equipo'},
  h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, 'Invitación al equipo'),
  h('p', {className: 'flex flex-wrap items-center gap-2 text-xs text-mute'},
    h(StateChip, {tone: 'ok'}, 'Enlace activo'),
    h('span', {className: 'whitespace-nowrap'}, 'Vence: 20 sept 26 · 11:00 · hora de Asunción')),
  h('p', {className: 'text-sm text-mute'}, 'Te invitaron a trabajar en este espacio.'),
  h('div', {className: 'grid gap-1 rounded-lg border border-ink-600 px-3 py-2'},
    h('strong', {className: 'break-words text-sm text-fore'}, 'Estudio de Comunicación y Producción Audiovisual del Paraguay S.A.'),
    h('span', {className: 'text-xs text-mute'}, 'Permiso asignado: ', h('b', {className: 'text-fore'}, 'Solo lectura'))),
  h(Button, null, 'Continuar con Google'),
  h(Button, {variant: 'outline'}, 'Crear cuenta con correo'),
  h('p', {className: 'flex flex-wrap items-center gap-2 text-xs text-mute'}, h(StateChip, {tone: 'bad'}, 'Enlace vencido'), h('span', null, 'Terminó el plazo para usar esta invitación. Pedí un nuevo enlace al equipo.')));

/* Acceso pendiente: comprobando y aprobado. */
const pendiente = h(Frame, {eyebrow: 'Acceso de equipo'},
  h('h2', {className: 'text-[17px] font-semibold tracking-tight text-fore'}, 'Estudio de Comunicación Audiovisual'),
  h('div', {role: 'status', 'aria-live': 'polite'}, h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, 'Acceso pendiente de aprobación')),
  h('p', {className: 'break-words text-sm text-mute'}, 'persona.con.correo.largo@estudiodecomunicacion.com.py', h('br'), 'Permiso solicitado: ', h('strong', {className: 'text-fore'}, 'Colaborador')),
  h('p', {className: 'text-sm text-mute'}, 'Una vez que la administración apruebe tu solicitud, podrás utilizar Scale OS según el permiso autorizado. Esta pantalla comprueba el estado automáticamente.'),
  h(Button, {variant: 'outline'}, 'Cerrar sesión'));

/* Estado del servicio: lista de componentes con un solo chip. */
const estado = h(Frame, {wide: true, eyebrow: 'Comunicación de respaldo'},
  h('div', {className: 'grid gap-2'},
    h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, 'Estado de Scale OS'),
    h('p', {className: 'flex flex-wrap items-center gap-2 text-sm text-mute'},
      h(StateChip, {tone: 'ok'}, 'API y base de datos disponibles'),
      h(Button, {variant: 'outline'}, 'Volver a comprobar'))),
  h('ul', {className: 'grid', 'aria-label': 'Componentes supervisados'},
    [['Aplicación', 'Disponible por HTTPS', 'Operativo'], ['Autenticación', 'Protegida por sesión', 'Configurado'], ['Correo transaccional', 'Supervisado mediante WEEM', 'Supervisado'], ['API y base de datos', 'Responde a la comprobación en vivo', 'Operativo']].map(([name, detail, chip]) =>
      h('li', {key: name, className: 'flex flex-wrap items-center gap-3 border-b border-ink-600/60 py-3 last:border-0'},
        h('span', {className: 'grid size-9 shrink-0 place-items-center rounded-lg border border-ink-600 text-mute'}, '·'),
        h('div', {className: 'min-w-0 flex-1'}, h('b', {className: 'block text-[13.5px] font-semibold text-fore'}, name), h('small', {className: 'block text-[11.5px] text-mute'}, detail)),
        h(StateChip, {tone: 'ok'}, chip)))),
  h('p', {className: 'text-[11.5px] text-mute'}, 'El estado de la API se comprueba en este momento. Los demás componentes se indican por configuración; esta pantalla se mantiene disponible como comunicación de respaldo.'),
  h('div', {className: 'flex flex-wrap items-center gap-2'},
    h('a', {className: 'secondary', href: 'https://sistema.scaleparaguay.com/'}, 'Landing'),
    h('a', {className: 'secondary', href: '/'}, 'Abrir Scale OS')));

/* Verificación: enlace inválido con reenvío. */
const verificacion = h(Frame, {eyebrow: 'Scale OS · acceso seguro'},
  h('h1', {className: 'text-2xl font-bold tracking-tight text-fore'}, 'Verificación de correo'),
  h('p', {role: 'status', className: 'text-sm text-bad'}, 'Este enlace no es válido o ya venció. Pedí uno nuevo con tu correo acá abajo.'),
  h('form', {className: 'grid gap-3'},
    Field('Correo de la cuenta', h('span', {className: 'min-w-0 break-words text-mute'}, 'persona@estudiocomunicacion.com.py')),
    h(Button, null, 'Reenviar correo de verificación')));

export default [
  {id: 'v2-acceso-registro', section: 'Acceso', surface: 'Registro v2 (paso 1)', kind: 'plain', body: renderToStaticMarkup(registro)},
  {id: 'v2-acceso-invitacion', section: 'Acceso', surface: 'Invitación v2 (activa y vencida)', kind: 'plain', body: renderToStaticMarkup(invitacion)},
  {id: 'v2-acceso-pendiente', section: 'Acceso', surface: 'Acceso pendiente v2', kind: 'plain', body: renderToStaticMarkup(pendiente)},
  {id: 'v2-acceso-estado', section: 'Acceso', surface: 'Estado del servicio v2', kind: 'plain', body: renderToStaticMarkup(estado)},
  {id: 'v2-acceso-verificacion', section: 'Acceso', surface: 'Verificación v2', kind: 'plain', body: renderToStaticMarkup(verificacion)},
];
