/**
 * Aviso de Privacidad — fuente única de la app (Ley N° 7593/2025).
 *
 * Acá viven la versión vigente, la estructura del documento público y el
 * catálogo de finalidades que consumen el registro, el perfil («Mis datos») y
 * los avisos contextuales. Ninguna superficie escribe la versión ni el texto a
 * mano: se importa de este módulo.
 *
 * Texto y estado: la plantilla es la estructura mínima de la ley; el texto
 * final lo aprueba el responsable (dueño). Mientras eso no ocurra el documento
 * se publica con `estado: 'revision'`, visible en la página, para no presentar
 * como aprobado algo que el responsable todavía no revisó.
 *
 * Puente documentado (Refs #113 → #112, criterio ADOPCION-V2): cuando el API
 * publique el aviso versionado (`GET /api/privacy/notice`), `privacyNotice()`
 * debe hidratar versión/fecha/estado desde ahí y este módulo queda como
 * fallback tipado. La UI no cambia de ruta: sólo cambia la fuente del dato.
 */

export type PrivacyNoticeState = 'revision' | 'aprobado';

export type PrivacyNotice = {
  /** Versión corta visible en las aceptaciones («v1»). */
  version: string;
  /** Fecha de publicación de esta versión (ISO, día calendario). */
  fecha: string;
  /** La misma fecha escrita para mostrar (sin ambigüedad de zona horaria). */
  fechaLabel: string;
  estado: PrivacyNoticeState;
  responsable: string;
  producto: string;
};

export const PRIVACY_NOTICE: PrivacyNotice = {
  version: 'v1',
  fecha: '2026-09-30',
  fechaLabel: '30 de septiembre de 2026',
  estado: 'revision',
  responsable: 'Scale Strategy Group',
  producto: 'Scale OS',
};

/** Etiqueta canónica «Aviso de Privacidad vX · fecha visible» para aceptaciones. */
export function privacyNoticeLabel(): string {
  return `Aviso de Privacidad ${PRIVACY_NOTICE.version}`;
}

/** Ruta pública permanente del aviso (misma en app, portal, acceso y landing). */
export const PRIVACY_NOTICE_PATH = '/privacidad';
/** URL absoluta para documentos standalone (landing) que no comparten host. */
export const PRIVACY_NOTICE_URL = 'https://sistema.scaleparaguay.com/privacidad';

/**
 * Canal de derechos (Ley 7593/2025 §12.4): visible, gratuito y con respuesta
 * dentro de 30 días corridos. El WhatsApp es el canal publicado por el
 * responsable; el formulario del sitio es el alternativo para quien no puede
 * entrar al panel. El correo queda como campo pendiente de decisión del dueño:
 * mientras sea `null`, la UI no lo muestra (nunca un buzón inventado).
 */
export const PRIVACY_RIGHTS_CHANNEL = {
  whatsappUrl: 'https://wa.me/595993391354?text=Hola%2C%20quiero%20ejercer%20un%20derecho%20sobre%20mis%20datos%20personales.',
  whatsappLabel: 'WhatsApp +595 993 391 354',
  contactFormUrl: 'https://sistema.scaleparaguay.com/#contacto',
  contactFormLabel: 'Formulario de contacto',
  email: null as string | null,
  slaDias: 30,
};

export type PrivacySection = {
  id: string;
  title: string;
  paragraphs: string[];
  items?: string[];
};

/**
 * Estructura mínima del aviso: quién trata los datos y cómo contactarlo, para
 * qué, con quién se comparten, cuánto se conservan, derechos y cómo ejercerlos,
 * seguridad, menores, cambios de versión y autoridad de control.
 */
export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'responsable',
    title: '1. Quién trata tus datos',
    paragraphs: [
      `${PRIVACY_NOTICE.responsable} es la empresa responsable del tratamiento de los datos personales que usás en ${PRIVACY_NOTICE.producto}. El proveedor de la plataforma (Owncoding) actúa como encargado y trata los datos únicamente para prestarte el servicio, siguiendo nuestras instrucciones.`,
      'Este aviso aplica al panel de agencias, al portal de clientes, a las páginas públicas y a los correos operativos del producto.',
    ],
  },
  {
    id: 'datos',
    title: '2. Qué datos tratamos',
    paragraphs: [
      'Tratamos los datos que nos das al crear la cuenta, los que cargás en tu espacio de trabajo y los que el sistema necesita para operar. No pedimos datos que no tengan una finalidad concreta.',
    ],
    items: [
      'Cuenta y acceso: correo, nombre y apellido, contraseña protegida, foto de perfil y datos de la agencia (nombre, moneda de la suscripción).',
      'Operación de la agencia: los datos de clientes, contactos, proyectos, piezas, presupuestos, cobros y archivos que el equipo carga o comparte en el espacio de trabajo.',
      'Portal del cliente: nombre, correo y las decisiones o comentarios que deja el cliente sobre las entregas publicadas.',
      'Uso del producto: registros técnicos y de actividad necesarios para seguridad, soporte y funcionamiento (por ejemplo, accesos y cambios auditados).',
    ],
  },
  {
    id: 'finalidades',
    title: '3. Para qué los tratamos y con qué base legal',
    paragraphs: [
      'Cada dato se trata para una finalidad determinada, informada en el punto de recolección y en este aviso. No se reutiliza para fines incompatibles sin tu consentimiento previo.',
      'La base legal principal es la ejecución del contrato o la prestación del servicio; para comunicaciones comerciales o finalidades no esenciales, la base es tu consentimiento, que podés revocar en cualquier momento.',
    ],
    items: [
      'Crear y administrar tu cuenta, autenticarte y prestarte soporte.',
      'Operar la agencia: clientes, proyectos, producción, finanzas y entregas.',
      'Habilitar el portal del cliente y avisos sobre las entregas que le compartiste.',
      'Responder consultas enviadas desde el sitio público.',
      'Seguridad: prevenir abuso, proteger accesos y mantener auditoría de operaciones sensibles.',
      'Cumplir obligaciones legales y contables cuando correspondan.',
    ],
  },
  {
    id: 'consentimiento',
    title: '4. Consentimiento y cómo revocarlo',
    paragraphs: [
      'El consentimiento se otorga con una acción explícita: nunca dejamos una casilla marcada por defecto, no se acepta por silencio y cada finalidad tiene su propia casilla cuando corresponde.',
      'Registramos qué aceptaste, con la versión de este aviso, la fecha y el canal. Podés revocarlo desde «Mis datos», en tu perfil, sin perder acceso al servicio por ello; dejamos de tratar el dato para esa finalidad y lo registramos igual que la aceptación.',
    ],
  },
  {
    id: 'destinatarios',
    title: '5. Con quién los compartimos',
    paragraphs: [
      'No vendemos datos personales. Los compartimos únicamente con proveedores que nos ayudan a operar el servicio (infraestructura, almacenamiento de archivos y envío de correo), que actúan como encargados y están obligados a tratarlos sólo para esa prestación.',
      'También podemos comunicarlos cuando una obligación legal o una autoridad competente lo exijan. Podés pedir el detalle de encargados y transferencias por el canal de derechos.',
    ],
  },
  {
    id: 'conservacion',
    title: '6. Cuánto tiempo los conservamos',
    paragraphs: [
      'Conservamos los datos mientras dure la relación y el tiempo necesario para cumplir las finalidades informadas. Cuando dejan de ser necesarios los eliminamos o anonimizamos de forma verificable, también en los respaldos.',
      'Excepción legal: el historial financiero y contable auditable se conserva por obligación fiscal, con acceso restringido y sin reutilizarse para otras finalidades.',
    ],
  },
  {
    id: 'derechos',
    title: '7. Tus derechos y cómo ejercerlos',
    paragraphs: [
      `Podés ejercer de forma gratuita tus derechos de acceso, rectificación, supresión (cancelación), oposición, portabilidad y revocación del consentimiento, sin justificar el pedido. La respuesta llega dentro de los ${PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos.`,
      'En el panel, «Mis datos» (Perfil) reúne el resumen, la descarga de una copia, los pedidos de rectificación, supresión y oposición, y la revocación de consentimientos. Si no podés entrar, usá el canal alternativo.',
    ],
    items: [
      'Acceso y portabilidad: copia de tus datos en un formato reutilizable.',
      'Rectificación: corregir datos inexactos o incompletos.',
      'Supresión: eliminar o anonimizar datos que ya no son necesarios, con la excepción del historial auditable.',
      'Oposición: oponerte a un tratamiento concreto y dejar de tratarlo para esa finalidad.',
      'Revocación: retirar un consentimiento en cualquier momento, con el mismo esfuerzo que costó otorgarlo.',
    ],
  },
  {
    id: 'seguridad',
    title: '8. Seguridad',
    paragraphs: [
      'Aplicamos medidas técnicas y organizativas razonables: acceso autenticado, aislamiento por empresa, permisos por rol, sesiones con vencimiento, cifrado en tránsito (HTTPS) y auditoría de operaciones sensibles.',
      'Ante una brecha de seguridad que afecte tus datos, la contenemos, la evaluamos y notificamos a las personas afectadas y a la autoridad cuando corresponde. Podés reportar un incidente por el canal de derechos.',
    ],
  },
  {
    id: 'menores',
    title: '9. Menores de edad',
    paragraphs: [
      'El servicio está dirigido a empresas y personas adultas. No recolectamos datos de menores de 16 años a sabiendas; si detectamos un tratamiento de ese tipo, lo eliminamos. Si sos tutor y creés que un menor nos dio datos, escribinos por el canal de derechos.',
    ],
  },
  {
    id: 'cambios',
    title: '10. Cambios de este aviso',
    paragraphs: [
      `Este aviso está versionado. La versión vigente es ${PRIVACY_NOTICE.version} (${PRIVACY_NOTICE.fechaLabel}). Si un cambio afecta las finalidades, volvemos a pedir tu consentimiento y te avisamos en el producto; las versiones anteriores quedan consultables.`,
    ],
  },
  {
    id: 'autoridad',
    title: '11. Autoridad de control',
    paragraphs: [
      'Si considerás que no tratamos tus datos conforme a la ley, podés reclamar ante la Agencia Nacional de Protección de Datos Personales (ANPDP, MITIC). Antes de eso te pedimos la oportunidad de resolverlo por el canal de derechos.',
    ],
  },
  {
    id: 'contacto',
    title: '12. Contacto',
    paragraphs: [
      `Para ejercer tus derechos o hacer consultas sobre este aviso, escribinos por el canal publicado en «Mis datos» y en el pie del portal. Respondemos dentro de los ${PRIVACY_RIGHTS_CHANNEL.slaDias} días corridos.`,
    ],
  },
];

/**
 * Finalidades reales del producto que consumen las aceptaciones y «Mis datos».
 * No se inventan finalidades: si una función no existe, no aparece acá.
 */
export type PrivacyPurpose = {
  id: string;
  label: string;
  detalle: string;
  /** Esencial = necesaria para prestar el servicio; se muestra separada. */
  esencial: boolean;
};

export const PRIVACY_PURPOSES: PrivacyPurpose[] = [
  {
    id: 'cuenta-y-prestacion',
    label: 'Cuenta y prestación del servicio',
    detalle: 'Crear tu cuenta, autenticarte, darte soporte y enviarte avisos operativos de tu suscripción.',
    esencial: true,
  },
  {
    id: 'operacion-agencia',
    label: 'Operación de tu agencia',
    detalle: 'Tratar clientes, proyectos, producción, cobros y archivos que tu equipo carga en el espacio de trabajo.',
    esencial: true,
  },
  {
    id: 'portal-cliente',
    label: 'Portal del cliente',
    detalle: 'Habilitar que tu cliente vea las entregas que le compartís y deje su decisión o comentarios.',
    esencial: true,
  },
  {
    id: 'contacto-comercial',
    label: 'Respuesta a consultas del sitio',
    detalle: 'Contactarte para responder la consulta que enviaste desde la landing.',
    esencial: true,
  },
];

export function privacyPurpose(id: string): PrivacyPurpose | undefined {
  return PRIVACY_PURPOSES.find(purpose => purpose.id === id);
}
