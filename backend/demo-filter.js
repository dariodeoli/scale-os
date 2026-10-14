// Separación de demo (fuente única del API): el panel global nunca mezcla datos de
// demos con datos reales. Cada consulta del superadmin filtra con estos fragmentos
// SQL; la actividad demo solo se lee a propósito, en el bloque «Demos» de Tráfico.
import {realOrganization} from './platform-subscription-service.js';
import {realUser} from './platform-admin.js';

/** Organizaciones reales: sin demos públicas, privadas, plantilla ni agencias de prueba. */
export const filtroSinDemo=alias=>realOrganization(alias);
/** Personas reales: sin invitados demo ni correos de demo. */
export const usuarioSinDemo=alias=>realUser(alias);
/** Analítica pública sin la superficie demo (landing y web pública). */
export const analiticaSinDemo=alias=>`${alias}.surface<>'demo'`;
/** Solo la superficie demo: se usa únicamente en el bloque aparte de demos. */
export const analiticaSoloDemo=alias=>`${alias}.surface='demo'`;
