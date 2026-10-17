// Reusable models adapted from the owner's documents. Actual party identities,
// commercial terms and bank instructions always come from the selected records
// or explicit manual review, never from a previously signed customer's example.
const parties = `En la ciudad de {{agreement.signing_city}}, República del Paraguay, en fecha {{agreement.signed_on}}, se celebra el presente contrato entre:

{{company.legal_name}}, RUC {{company.tax_id}}, con domicilio en {{company.address}}, {{company.city}}, {{company.department}}, representada por {{company.legal_representative_name}}, documento N° {{company.legal_representative_document}}, en adelante «LA PRESTADORA»; y

{{counterparty.legal_name}}, {{counterparty.document_type}} N° {{counterparty.document}}, con domicilio en {{counterparty.address}}, {{counterparty.city}}, {{counterparty.department}}, en adelante «EL CLIENTE».

Las partes, reconociéndose capacidad para contratar, acuerdan las siguientes cláusulas.`;

const rights = `PROPIEDAD INTELECTUAL
EL CLIENTE recibe las piezas finales para su uso en sus canales de comunicación, una vez cumplidas las condiciones de pago pactadas. Los archivos fuente, el material en bruto y los proyectos de edición son propiedad de LA PRESTADORA, salvo cesión (buyout) acordada por escrito. Las estrategias, metodologías y procesos de trabajo son propiedad de LA PRESTADORA; se entregan los resultados contratados, no el método.

USO EN PORTAFOLIO
{{agreement.portfolio_terms}}

CONFIDENCIALIDAD
Ambas partes mantendrán reservada la información comercial a la que accedan con motivo de este contrato.

JURISDICCIÓN
{{agreement.jurisdiction}}

FIRMAS
En prueba de conformidad, las partes firman dos ejemplares de un mismo tenor, en el lugar y fecha indicados al inicio. Quienes firman declaran actuar en nombre propio o contar con facultades suficientes para representar a la parte indicada.

Por {{company.legal_name}}
{{company.legal_representative_name}}
Documento N° {{company.legal_representative_document}}
Firma: ______________________________

Por EL CLIENTE: {{counterparty.legal_name}}
{{counterparty.signer_name}}
Documento N° {{counterparty.signer_document}}
Firma: ______________________________`;

const scope = `OBJETO Y ALCANCE
{{agreement.scope}}

CONTENIDOS Y ENTREGABLES
{{agreement.deliverables}}

EXCLUSIONES
{{agreement.exclusions}}`;

const price = `PRECIO Y TRATAMIENTO IMPOSITIVO
El precio pactado es {{agreement.currency}} {{agreement.amount}}.
{{agreement.tax_terms}}

FORMA DE PAGO
{{agreement.payment_terms}}`;

const obligations = `CORRECCIONES
{{agreement.corrections_terms}}

OBLIGACIONES DEL CLIENTE Y COORDINACIÓN
{{agreement.client_obligations}}

CANCELACIÓN
{{agreement.cancellation_terms}}`;

function model(key, name, agreement_type, body) {
  return Object.freeze({key, name, agreement_type, body,
    required_fields: [...new Set([...body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)].map(match => match[1]))]});
}

export const BUILTIN_CONTRACT_MODELS = Object.freeze([
  model('marketing-monthly', 'Marketing digital y contenido mensual', 'Servicios mensuales',
`CONTRATO DE PRESTACIÓN DE SERVICIOS DE MARKETING DIGITAL Y PRODUCCIÓN DE CONTENIDO

${parties}

ANTECEDENTES
LA PRESTADORA desarrolla estrategia, producción audiovisual y edición profesional para la comunicación de marcas. El alcance y las condiciones de este servicio mensual son exclusivamente los detallados en este documento.

${scope}

PLAZO, CALENDARIO Y ENTREGAS
Inicio: {{agreement.starts_on}}.
{{agreement.delivery_terms}}

${price}

VIGENCIA Y RENOVACIÓN
{{agreement.renewal_terms}}

${obligations}

${rights}`),
  model('marketing-preferential', 'Contenido mensual con condición preferencial', 'Servicios mensuales con condición preferencial',
`CONTRATO DE MARKETING DIGITAL Y PRODUCCIÓN DE CONTENIDO CON CONDICIONES PREFERENCIALES

${parties}

ANTECEDENTES Y CONDICIÓN COMERCIAL
Las partes acuerdan la condición preferencial siguiente. Sus importes, comparación con la tarifa de lista, duración y consecuencias del incumplimiento requieren acuerdo expreso; no se presumen descuentos ni penalidades de contratos anteriores.
{{agreement.notes}}

${scope}

PLAZO Y ENTREGAS
Inicio: {{agreement.starts_on}}.
{{agreement.delivery_terms}}

${price}

VIGENCIA DE LA CONDICIÓN PREFERENCIAL Y RENOVACIÓN
{{agreement.renewal_terms}}

${obligations}

${rights}`),
  model('audiovisual-package', 'Producción audiovisual · paquete único', 'Paquete audiovisual único',
`CONTRATO DE PRESTACIÓN DE SERVICIOS DE PRODUCCIÓN AUDIOVISUAL

${parties}

${scope}

PLAZO Y ENTREGAS
El servicio se presta entre {{agreement.starts_on}} y {{agreement.ends_on}}.
{{agreement.delivery_terms}}
Este contrato corresponde a un paquete único, no a un plan mensual, y no se renueva automáticamente.

${price}

INICIO DE PRODUCCIÓN Y ENTREGA FINAL
Las condiciones de acreditación de pagos, inicio de producción y liberación de entregas son las pactadas en la forma de pago anterior. No se presume anticipo, retención ni cronograma de otro contrato.

${obligations}

${rights}`),
  model('project-services', 'Servicios por proyecto', 'Proyecto de servicios',
`CONTRATO DE PRESTACIÓN DE SERVICIOS POR PROYECTO

${parties}

${scope}

PLAZO Y ENTREGAS
Inicio: {{agreement.starts_on}}. Finalización: {{agreement.ends_on}}.
{{agreement.delivery_terms}}

${price}

VIGENCIA Y EVENTUALES PRÓRROGAS
{{agreement.renewal_terms}}

${obligations}

${rights}`),
]);
