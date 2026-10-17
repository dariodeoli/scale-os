# Demo privada y completa · #232

La entrada pública conserva el flujo real de `/api/demo/start`: crea un usuario
invitado sin contraseña reutilizable, una empresa privada y una sesión temporal
de 24 horas. Dos navegadores independientes reciben usuarios, cookies y empresas
diferentes. La demo privada de un dueño conserva su clave por inicio de sesión y
su vigencia de siete días. Al reutilizar una clave vencida se crea otra copia;
la empresa anterior y su evidencia de limpieza se conservan hasta la caducidad.

`seedPrivateDemo` mantiene los clientes, proyectos, producción y el historial
existentes. El nuevo `seedDemoModules` completa sólo una empresa recién creada,
con savepoint y marcador de finalización; nunca vuelve a sembrar una demo editada
ni una empresa real. Se ejecuta antes de `seedDemoReports`, que sigue generando
58 facturas y 58 cobros históricos por los mecanismos normales del ledger.
No se crean cierres iniciales que impidan sembrar ese historial.

Los ejemplos incluyen:

- 20 clientes y proyectos, 80 piezas en todas las etapas y sus 240 subtareas;
- siete tareas propias, tres de hoy sin una hora que las oculte al pasar el día,
  más vencida, próxima, completada y sin fecha; comentarios y un brief estático;
- dos espacios de estudio y tres reservas con participantes, dos para hoy;
- cuatro modelos de contrato editables, cuatro borradores completos y una
  versión de ejemplo inmutable para recorrer la descarga PDF;
- ficha legal de empresa y de los 20 clientes con identidades ficticias;
- inventario con lugares, seriales de ejemplo, propiedad empresarial/personal,
  depreciación y mantenimiento, además de las reservas futuras existentes;
- tres cuentas PYG/USD, cobros, transferencias, honorarios, previsión de personal,
  gastos fijos/variables, un anticipo libre y una mora previa parcialmente pagada.

Los importes nuevos son explícitos: anticipo PYG 450.000, aplicación PYG 200.000
a una mora de PYG 800.000 y gastos reales ilustrativos por PYG 255.000. Quedan
PYG 250.000 disponibles en el anticipo y PYG 600.000 pendientes de mora; el cambio
neto en caja es PYG 195.000. La aplicación no genera una segunda entrada de dinero
ni una factura ficticia. Cada cuenta concilia exactamente con
`agency_cash_movements`, por moneda. La promesa de pago y el vencimiento original
se guardan por separado.

Todos los nombres, direcciones, documentos, contratos y movimientos son
ilustrativos. Las cuentas bancarias usan identificadores `DEMO-*`. No se hacen
solicitudes a proveedores al sembrar los ejemplos. Las restricciones de acciones
externas y la eliminación de empresas vencidas corresponden a los controles de
sesión y mantenimiento, no a un API alternativo de demostración.

Verificaciones focales:

```bash
cd backend
node test-demo-session.mjs
node test-demo-reports.mjs
node test-demo-complete.mjs
```

La última prueba utiliza los handlers reales de entrada pública, tareas,
contratos, estudio y tesorería sobre PGlite. Inicia dos sesiones, modifica un
checklist de hoy y acredita que la otra demo permanece igual. También verifica
las plantillas, la versión PDF con renderer de prueba, los saldos y la ausencia
de tráfico a proveedores. La prueba de sesión cubre la renovación de una copia
vencida sin borrar sus modificaciones anteriores. Una prueba adicional en
PostgreSQL 17 local confirmó dos entradas públicas concurrentes y el mismo
aislamiento y conciliación de cuentas; la QA de navegador acredita la interfaz
por separado.
