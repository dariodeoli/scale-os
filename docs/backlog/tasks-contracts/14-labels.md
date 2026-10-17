<!-- scale-plan-20261017:labels -->

## Objetivo y estado

Auditar códigos/seriales existentes y realizar ensayo físico con la impresora actual. La evidencia inicial muestra Code 39 de 80×50 mm; no hay QR verificado.

Estado de seguimiento: solicitado / pendiente de verificación de entrega. El trabajo local o la auditoría inicial no equivalen a funcionalidad integrada ni pruebas aprobadas.

## Criterios de aceptación

- [ ] Confirmar cobertura de activos, seriales y formato real antes de afirmar QR o cambiar códigos.
- [ ] Reutilizar etiquetas y códigos existentes; no reconstruirlos ni generar identificadores incompatibles.
- [ ] Con papel compatible y hardware disponible, probar impresión mediana/grande y lectura; registrar tamaño, legibilidad y resultado.
- [ ] Separar evidencia local del ensayo físico; mantener bloqueo explícito cuando no haya acceso a impresora/lector.

## Alcance y coordinación

Inventario y etiquetas existentes; coordinación operativa con hardware. Desarrollo correctivo sólo si auditoría lo justifica.

## Dependencias

ops, paper

## Entrega

Registrar cambios y rutas, evidencia, pruebas realmente ejecutadas, riesgos, migraciones y reversión. No desplegar ni usar datos de producción sin autorización. No cerrar sólo por existencia de código local.
