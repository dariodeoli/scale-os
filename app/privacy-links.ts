// Transparencia de datos personales (Ley 7593/2025, Refs #113/#114/#118).
// Punto único donde se declaran la política, el canal de derechos y las
// finalidades que usan las superficies de captura de la app: leads, clientes,
// accesos del portal y «Carga con IA».
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

/** Finalidad declarada al usar «Carga con IA» (Refs #118): sólo viaja el texto pegado. */
export const PRIVACY_IA_FINALITY = 'Usamos el texto que pegás sólo para detectar los registros y armar la vista previa: nada se crea sin tu confirmación y el texto no se guarda en Scale OS.';
export const PRIVACY_IA_DETAIL = 'El análisis lo hace el proveedor de IA configurado como encargado y se envía únicamente ese texto, nunca la base de datos.';
