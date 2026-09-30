// Datos de origen del tablero de producción, ANONIMIZADOS (Ley N° 7593/2025,
// issue #115): nombres de personas, clientes y URL reales fueron reemplazados
// por equivalentes de ejemplo. La importación real a la organización Scale ya
// se aplicó (10/09/2026); este archivo queda como fixture de demostración de
// `import-scale-sources.mjs` y no debe editarse con datos de producción.
export const board='https://trello.example.invalid/b/tablero-demo';
export const pricingSource='Documento interno de precios (fuente de ejemplo)';
const conditions='Precios mensuales + IVA 10%. Pago 100% adelantado del 1 al 5. Plazo mínimo sugerido: 3 meses. Incluye 2 rondas de corrección. Cancelación con 15 días de aviso. No incluye community management, pauta, stories, fotos de producto, garantía de seguidores ni revisiones ilimitadas.';
export const plans=[
 {name:'Silver',price:4000000,scope:'8 contenidos mensuales; 1 jornada de grabación; edición profesional con identidad visual; calendarización mensual; entrega por Drive; análisis previo del perfil y acompañamiento creativo.'},
 {name:'Gold',price:6000000,scope:'12 contenidos mensuales; 1 jornada de grabación; edición profesional con identidad visual y transiciones; calendarización estratégica; estrategia básica; Drive; reunión mensual de revisión de 30 minutos; acompañamiento creativo continuo.'},
 {name:'Diamond',price:9000000,scope:'15 contenidos mensuales; 2 jornadas de grabación; edición premium con motion graphics y color grading; estrategia mensual completa y documentada; reunión estratégica de 60 minutos; reporte mensual de métricas; prioridad de respuesta y ajustes en 24 horas.'},
].map(p=>({name:p.name,currency:'PYG',items:[{description:`Plan ${p.name} mensual · ${p.scope}`,quantity:1,unitPrice:p.price}],notes:`${conditions}\n\nFuente: ${pricingSource}.`}));
export const cards=[
 ['Aurora Café','Aurora Café — validación de preguntas con la profesional invitada','blocked','Checklist 0/6. Responsable en Trello: Editor Demo.'],
 ['Nube Software','Nube Software — esperando respuesta de la persona de contacto','blocked','Checklist 0/6.'],
 ['Bosque Hogar','Bosque Hogar — esperamos respuesta del cliente','blocked',''],
 ['Luna Moda','Luna Moda — esperamos respuesta del cliente','blocked',''],
 ['Órbita Fitness','Órbita Fitness — retocar guiones Tanda 2 (1 reel + 2 historias)','to_record','Checklist 0/6. Responsable en Trello: Dirección Demo. Vencimiento original 08/09/2026 10:00 marcado completado en Trello; la tarjeta sigue en Por grabar. Coordinación, 08/09 11:09: equipo en producción/grabación de 1 reel + 2 historias.'],
 ['Prisma Diseño','Prisma Diseño — contenido en conjunto (colab IG) sube el editor','to_record','Checklist 0/4. Responsable en Trello: Editor Demo. Vencimiento original 07/09/2026 18:00 marcado completado; la tarjeta sigue en Por grabar.'],
 ['Brisa Viajes','Brisa Viajes (editor) — subir contenido de la carpeta compartida','to_record','Checklist 0/4. Responsable en Trello: Editor Demo. No se proporcionó la URL de Drive.'],
 ['Prisma Diseño','Prisma Diseño — nueva tanda de contenidos + agendar día de producción','to_record',''],
 ['Pixel Academy','Pixel Academy — grabar 3 videos restantes con el editor','to_record','Responsable en Trello: Editor Demo. Coordinación, 08/09 11:09: producción/grabación de 3 videos con Dirección, confirmada por Producción.'],
 ['Prisma Diseño','Prisma Diseño — subir 5 videos ya editados al Drive','editing','Checklist 0/4. No se proporcionó la URL de Drive.'],
 ['Pixel Academy','Pixel Academy — 4/5 videos restantes del mes','editing','Checklist 0/3.'],
 ['Roble Muebles','Roble Muebles — resumen de cobertura atrasado','review','Checklist 0/3.'],
 ['Alma Cocina','Alma Cocina — publicar pieza editada','review','Checklist 0/2. Pendiente de revisión, no publicada.'],
 ['Cumbre Seguros','Cumbre Seguros — historia + reel pendientes, más promo de edición','review','Checklist 1/9. Coordinación, 07/09 16:50: estrategia de contenidos entregada a Producción. Resto de pasos no proporcionados.'],
];
export const internal=[
 ['Oferta 10% descuento por referidos — redactar y validar mensaje','Checklist 5/9. Coordinación completó 07/09 15:48: redactar, validar mensaje, armar y validar lista, envío a Nube Software, Pixel Academy, Contenidos, Alma Cocina, Prisma Diseño y Cumbre Seguros. No se aplicaron descuentos financieros.',''],
 ['Lista de servicios de la agencia (mensaje único para clientes/prospectos)','Checklist 0/4.',''],
 ['Investigar propuesta de un proveedor externo (@proveedor_demo)','Checklist 0/3.',''],
 ['Compartir manual de flujos de trabajo con Diseño, el editor y Cuentas','Checklist 0/4. Responsables en Trello: Coordinación y Editor Demo.',''],
 ['Coberturas — facturar (pago miércoles)','Título anterior: Coberturas — la persona de contacto necesita facturar (pago miércoles). Responsable en Trello: Coordinación. Fecha original relativa: «ayer a las 9:00» (registro 07/09). No se infiere una fecha exacta, factura ni cobro.',''],
 ['Editor Demo — retomar streams (Editor Dos pasa los clips primero)','Responsables en Trello: Editor Dos y Editor Demo. Valentina Sol de Prueba fue retirada el 07/09. Coordinación completó el paso «Editor Dos entrega los 7 clips del stream» el 07/09 17:22.',''],
 ['La agencia (contenido propio) — Diseño busca ideas y pasa al grupo','',''],
 ['Contenidos — reunión mañana 1pm','Fecha original 08/09/2026 13:00. Coordinación se unió a la tarjeta.','2026-09-08'],
 ['Prisma Diseño — conseguir acceso a la cuenta de TikTok','',''],
 ['Editor Dos — video de la agencia (contenido propio) sin entregar','Responsable en Trello: Editor Dos.',''],
 ['Cuentas — reunión con su cliente hoy 21:30','Fecha original 08/09/2026 21:30. Coordinación indicó que Cuentas no era miembro del tablero y avisaría por WhatsApp aparte.','2026-09-08'],
 ['Reunión Contenidos/TikTok — hoy 13:00 (confirmada)','Fecha original 08/09/2026 13:00. Responsable en Trello: Valentina Sol de Prueba. Se conserva como tarjeta distinta de «Contenidos — reunión mañana 1pm» porque ambas aparecen en la fuente.','2026-09-08'],
];
