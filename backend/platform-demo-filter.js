// Filtro único de datos de demo para TODO el panel global (guía §3, «filtroSinDemo»).
//
// Cada consulta de lectura de platform-*.js que toca usuarios, agencias o sesiones
// usa estas expresiones (y nada escrito a mano): `realUser`/`realOrganization` para
// las métricas y listas; `demoUser`/`demoOrganization` solo para el contador aparte
// de demos. `test-platform-guard.mjs` falla si una consulta las saltea.
//
// Demo = agencias de demo (privadas o fuente), la agencia canónica de controles y
// las cuentas de prueba internas; usuarios invitados de demo y los dominios
// reservados de demo. Lo eliminado nunca cuenta (ni como real ni como demo).
const DEMO_SLUGS=`'scale-demo-controles-20260908','agenciaprueba','agencia-prueba'`;
const isDemoOrganization=alias=>`(${alias}.demo_owner_user_id is not null or ${alias}.demo_source_id is not null or lower(${alias}.slug) in (${DEMO_SLUGS}) or lower(${alias}.name)='agenciaprueba')`;
const isDemoUser=alias=>`(${alias}.is_demo_guest or ${alias}.email ilike '%@demo.example.invalid' or ${alias}.email ilike '%@scale-demo.example.invalid')`;

/** Agencia real (administrable): sin demos ni agencias de prueba, no eliminada. */
export const realOrganization=alias=>`not ${isDemoOrganization(alias)} and ${alias}.deleted_at is null`;
/** Usuario real: sin invitados ni dominios de demo, no eliminado. */
export const realUser=alias=>`not ${isDemoUser(alias)} and ${alias}.deleted_at is null`;
/** Solo para el contador separado de demos: el complemento exacto (no eliminado). */
export const demoOrganization=alias=>`${isDemoOrganization(alias)} and ${alias}.deleted_at is null`;
export const demoUser=alias=>`${isDemoUser(alias)} and ${alias}.deleted_at is null`;
/** Nombre de la guía (`filtroSinDemo`): el mismo helper único, agrupado por entidad. */
export const filtroSinDemo=Object.freeze({usuario:realUser,empresa:realOrganization,usuarioDemo:demoUser,empresaDemo:demoOrganization});
/** Nombres que la prueba estática reconoce como uso del filtro. */
export const DEMO_FILTER_HELPERS=['realUser','realOrganization','demoUser','demoOrganization'];
/** Analítica pública (Tráfico y demos): la landing y la web nunca mezclan la superficie demo. */
export const analiticaSinDemo=alias=>`${alias}.surface<>'demo'`;
/** Solo la superficie demo: se usa únicamente en el bloque aparte de demos. */
export const analiticaSoloDemo=alias=>`${alias}.surface='demo'`;
