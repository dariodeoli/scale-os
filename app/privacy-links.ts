// Transparencia de datos personales en Comercial (Ley 7593/2025, Refs #114).
// Punto único donde se declaran la política y el canal de derechos que usan las
// superficies de captura de Comercial: leads, clientes y accesos del portal.
// La página pública y el procedimiento los publica Diseño (#113); si cambia la
// ruta, se cambia acá y ninguna pantalla escribe enlaces a mano.
export const PRIVACY_POLICY_URL = '/privacidad';
export const PRIVACY_RIGHTS_URL = '/privacidad#derechos';

/** Finalidad declarada al cargar una oportunidad (lead) o sus datos de contacto. */
export const PRIVACY_LEAD_FINALITY = 'Usamos estos datos para gestionar la oportunidad comercial y responderte; no los usamos para otro fin.';
export const PRIVACY_LEAD_DETAIL = 'Podés pedir acceso, corrección, supresión u oposición al tratamiento desde «Tus derechos», incluso después de que no quieras que te contactemos.';

/** Finalidad declarada al cargar la ficha de un cliente (empresa o persona). */
export const PRIVACY_CLIENT_FINALITY = 'Usamos los datos del cliente para la relación comercial, la facturación y el contacto operativo.';
export const PRIVACY_CLIENT_DETAIL = 'Los comprobantes y datos fiscales se conservan por obligación contable; el resto podés pedir corregirlo o suprimirlo desde «Tus derechos».';

/** Finalidad declarada al habilitar el acceso de una persona al portal del cliente. */
export const PRIVACY_PORTAL_FINALITY = 'Usamos este correo para dar acceso al portal del cliente y avisarle de sus entregas.';
