# Inventario y navegación — preparación #309/#311

Menú único para cuadrícula, lista y ubicaciones con detalle/trazabilidad, imprimir, verificar, editar y archivar según permisos. Las ubicaciones reciben los callbacks reales de edición/verificación/archivo en vez de redirigir todo al detalle. El adaptador compartido conserva el motor de menú/teclado de owncoding-ui y usa un portal real de owncoding-ui v0.68.20 para evitar clipping por contenedores con overflow/transform; mantiene posición dentro del viewport y foco al cerrar.

Propietario externo opcional con nombre, independiente del custodio; propietario integrante conserva selector e identidad existentes. API valida pertenencia interna, nulabilidad, longitud y auditoría; cambiar a empresa limpia propietario anterior sin cambiar custodia. Migración aditiva e idempotente registrada en cadena/fixtures.

Clientes queda como enlace principal entre Resumen y Flujo, sin duplicarlo en el submenú. /clientes?client=ID abre la ficha existente y conserva permisos del API, para completar datos legales desde contratos.

## Pruebas ejecutadas

- Chromium real:9 casos (320/390/1440 ×3 temas), menú dentro de tarjeta transformada con overflowhidden, todas las acciones alcanzables, End/Escape/foco y editar. [Resultados](menu-results.json).
- Control negativo con menú original: falla esperado en hit-test de última acción recortada; log /tmp/scale311-menu-negative.log. No es una falla del gate final.
- InventarioReact: mismas acciones en las tres vistas y edición real en ubicaciones; formulario de propietario externo separado del custodio.
- API/PGlite: inventario valor/propiedad +236casos reservas/verificación/fotos y aislamiento, incluyendo creación/edición/batch externo/auditoría/proyección. TypeScript y navegación/controlcenter/mobile PASS.

- Paquete publicado v0.68.20, tag resuelto a7bb248a8082a33e1f9584912fc459504ac61606b. CI de PR64 y main de OwnCoding PASS; galería no desplegada (manual).
- Integración real del paquete:9 casos adicionales sin showPopover PASS; ancla fuera del viewport cierra el menú PASS; Dialog real con errores y ventana hija,10 casos PASS. React15 casos Dialog PASS. Tests de inventario conservan el motor y doblan únicamente el host de portal ausente en react-test-renderer.
- PostgreSQL17 real: carreras de pagos/transferencias y7 escenarios de reservas HTTP/constraint PASS. No se afirma impresión física. Guardar columnas usa el adaptador compartido #310; prueba de encabezados/celdas y ocultar acciones PASS.

Regresión local284 entradas y build PASS; CI y producción de Scale se acreditan al cerrar la integración.
