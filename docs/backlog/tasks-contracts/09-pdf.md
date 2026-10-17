<!-- scale-plan-20261017:pdf -->

## Objetivo y estado

Reutilizar Puppeteer/Chromium para generar PDF desde el snapshot emitido, conservando exactamente su versión.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Exportar el snapshot autorizado, sin reconstruirlo desde datos actuales cambiantes.
- [ ] Deshabilitar JavaScript y acceso de red; escapar contenido y no admitir recursos arbitrarios.
- [ ] Mantener permisos de contratos y datos bancarios en descarga, con rechazo claro de acceso.
- [ ] Probar documento largo, saltos de página, caracteres españoles, datos incompletos y ausencia de desbordes; PDF legible y estable.
- [ ] Adjuntar evidencia y prueba de que cambios posteriores de empresa/plantilla no alteran PDF histórico.

## Alcance y coordinación

Renderizador PDF existente, backend/contracts.js, UI de historial/exportación, pruebas PDF. SOS-PLT/SOS-DSN.

## Dependencias

contracts

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.
