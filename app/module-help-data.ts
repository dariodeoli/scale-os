// Ayuda contextual por módulo (ADOPCION-V2 P2, Refs #135): textos puros que
// consume `AyudaModulo` de owncoding-ui. La app conserva el acceso a /status en
// todos los módulos y la guía de primeros pasos sigue viviendo en el shell.
export type ModuleHelp = {
  titulo: string;
  resumen: string;
  puntos: string[];
  enlaces: Array<{href: string; etiqueta: string}>;
};

const SYSTEM_LINKS: ModuleHelp['enlaces'] = [
  {href: '/status', etiqueta: 'Estado del sistema'},
  {href: '/privacidad', etiqueta: 'Privacidad y derechos'},
];

const HELP: Record<string, Omit<ModuleHelp, 'enlaces'>> = {
  Resumen: {
    titulo: 'Resumen',
    resumen: 'La foto del día: indicadores, alertas y accesos directos a lo que está pasando.',
    puntos: ['Los KPIs salen de los registros reales de la empresa; nunca se inventan.', 'Las alertas y los vencimientos abren la pieza o la factura que corresponde.', 'Usá ⌘/Ctrl + K para buscar clientes, proyectos, piezas o módulos.'],
  },
  Producción: {
    titulo: 'Producción',
    resumen: 'El tablero por etapas: qué está por grabar, editando, en revisión y aprobado.',
    puntos: ['Arrastrá una pieza entre columnas para cambiar su etapa.', 'Cada pieza guarda responsables, fecha de entrega, checklist y comentarios.', 'La ventana de trabajo diario muestra tus piezas y las entregas próximas.'],
  },
  Pipeline: {
    titulo: 'Pipeline',
    resumen: 'Las oportunidades comerciales con su próxima acción y su valor estimado.',
    puntos: ['Registrá cada oportunidad con cliente, etapa y próximo paso.', 'El resumen del pipeline separa monedas y no convierte importes.', 'Desde una oportunidad podés pasar a presupuesto sin recargar datos.'],
  },
  Clientes: {
    titulo: 'Clientes',
    resumen: 'El directorio completo: datos, estado del servicio y vínculos con trabajo y cobros.',
    puntos: ['La ficha reúne contactos, proyectos, presupuestos y cobros según tu rol.', 'Los datos sensibles se enmascaran para quien no tiene permiso.', 'Podés alternar entre lista y cuadrícula sin perder información.'],
  },
  Presupuestos: {
    titulo: 'Presupuestos',
    resumen: 'Propuestas armadas con ítems y planes, compartibles por enlace público.',
    puntos: ['Elegí un cliente y guardá el borrador antes de compartirlo.', 'Los planes reutilizables evitan rearmar el mismo detalle.', 'El estado de la propuesta se sigue desde la lista y la ficha del cliente.'],
  },
  Proyectos: {
    titulo: 'Proyectos',
    resumen: 'Los trabajos por cliente, con carpeta, piezas y responsables.',
    puntos: ['Cada proyecto agrupa sus piezas y su estado general.', 'El contador de piezas y avances sale de las órdenes reales.', 'Los responsables del proyecto no heredan permisos extra.'],
  },
  Inventario: {
    titulo: 'Inventario',
    resumen: 'Equipos con ubicación, reservas y verificación física.',
    puntos: ['Reservá equipos para una producción y registrá retiro y devolución.', 'La verificación deja sello con foto, responsable y fecha.', 'El valor y la depreciación se calculan por categoría.'],
  },
  Estudio: {
    titulo: 'Estudio',
    resumen: 'Espacios y agenda del estudio, con responsables por reserva.',
    puntos: ['Una reserva activa bloquea únicamente su espacio.', 'El calendario muestra la disponibilidad para planificar rodajes.', 'Cada reserva puede vincularse a un proyecto.'],
  },
  Finanzas: {
    titulo: 'Finanzas',
    resumen: 'Cuentas, facturas, cobros y movimientos, con cada moneda por separado.',
    puntos: ['Los cobros registran método y cuenta reales; el sistema no mueve dinero.', 'La mora muestra el saldo pendiente por cliente.', 'La previsión proyecta caja por moneda a 3, 6 o 12 meses.'],
  },
  Mora: {
    titulo: 'Mora',
    resumen: 'La cobranza pendiente, ordenada por vencimiento y responsable.',
    puntos: ['Los informes de mora salen de las facturas y cobros registrados.', 'Podés separar por moneda y por antigüedad.', 'Cada fila abre la factura o el cliente para gestionar el cobro.'],
  },
  Informes: {
    titulo: 'Informes',
    resumen: 'Resultados por período: facturación, cobros, clientes y ticket promedio.',
    puntos: ['Los números salen de los registros disponibles, hasta 24 meses.', 'Las monedas quedan separadas, sin conversiones forzadas.', 'Solo los roles con permiso financiero ven los importes.'],
  },
  Equipo: {
    titulo: 'Equipo',
    resumen: 'Personas, roles, accesos y salarios de la agencia.',
    puntos: ['Los permisos se administran por rol y capacidad.', 'Los salarios solo los ven owner, admin y finanzas.', 'Invitar a una persona no amplía los permisos de sus tareas.'],
  },
  Configuración: {
    titulo: 'Configuración',
    resumen: 'Datos de la empresa, moneda, integraciones y zonas sensibles.',
    puntos: ['Revisá la moneda predeterminada antes de cargar importes.', 'La papelera conserva lo archivado con su historial.', 'La eliminación de la cuenta vive en la Zona de peligro, con reautenticación.'],
  },
  Actividad: {
    titulo: 'Actividad',
    resumen: 'El historial de uso y los avisos de la empresa.',
    puntos: ['La actividad muestra quién hizo qué y cuándo, sin datos sensibles.', 'Las notificaciones de la campana siguen tu propia bandeja.', 'Podés filtrar por tipo y por período.'],
  },
};

export function moduleHelp(module: string): ModuleHelp {
  const help = HELP[module] || {
    titulo: module,
    resumen: `Este módulo forma parte de Scale OS. ${module === 'Métricas' ? 'Los indicadores se calculan con los registros reales.' : 'Lo que ves depende de tu rol y de los registros disponibles.'}`,
    puntos: ['Usá ⌘/Ctrl + K para buscar o abrir otro módulo.', 'Los permisos se aplican por rol: si una acción no corresponde, no se muestra.', 'Ante un problema, revisá el estado del sistema y avisá al equipo.'],
  };
  return {...help, enlaces: SYSTEM_LINKS};
}
