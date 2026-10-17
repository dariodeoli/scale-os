# Demo: efectos externos del tenant (#232)

La política compartida `backend/demo-effects.js` reconoce las marcas explícitas
de demo: dueño de demo, origen de demo, plantilla histórica o visitante demo.
El servidor la ejecuta antes de montar handlers que antes podían anticiparse
al guard tardío. Portal, IA, contratos, RUC, invitaciones y verificación DNS
también aplican la misma política dentro de sus handlers.

La empresa demo no envía invitaciones, habilita accesos/publicaciones externas,
consume IA/RUC ni verifica dominios mediante DNS. Los trabajos de notificación
omiten también demos por origen o plantilla, además del dueño de demo. Crear
una ficha de colaborador sigue funcionando sin invitarlo a una cuenta real.

Se mantienen los contratos manuales, plantillas, revisión/versión, PDF local,
tareas, cobros sintéticos y creación manual de clientes. La configuración de
IA en demo devuelve `demoRestricted: true`, sin modelo; la interfaz presenta
el camino manual y no pide claves, cambios de rol ni configuración técnica.
La asistencia de contratos aparece deshabilitada para la demo.

## Conversión y flujos públicos

Crear una cuenta real desde «Crear cuenta» en el Demo es una solicitud pública
explícita del visitante. Registro, verificación, recuperación de cuenta y
contacto público mantienen sus validaciones, límites y envíos habituales,
aunque el navegador conserve una cookie demo. No son operaciones de la
empresa demo y el nuevo guard no los bloquea. Cambiar de empresa y salir
también mantienen su funcionamiento.

## Evidencia

- `node backend/test-demo-effects.mjs`: PASS con las migraciones reales en
  PGlite y proveedores/correo/DNS inyectados. Los cuatro marcadores demo
  produjeron cero invocaciones de correo del portal, IA, RUC y DNS. Una cola
  de notificaciones demo con relay configurado tampoco invocó el envío;
  una notificación de empresa normal sí lo hizo mediante el stub.
- El mismo test acredita las integraciones de usuarios normales, permisos
  locales de contratos/tareas/cobros y el registro público real: con cookie
  demo atraviesa el gate, alcanza el handler de registro, devuelve 202 y
  solicita una verificación al stub de correo. No se envió correo real.
- El PDF local se validó con renderer inyectado: demuestra que el acceso y
  la delegación siguen habilitados; no representa una nueva revisión visual
  de los PDF ni una llamada a un servicio externo.
- Compatibilidad: suites de portal, contratos, carga IA, RUC, invitaciones,
  notificaciones, estados de correo, SSO y operaciones: PASS.
- Interfaz IA: render real con React, mensaje demo sin formulario de análisis
  y formulario normal conservado: PASS. Pruebas IA 118/120/128/132: PASS.
- TypeScript: PASS.

El fragmento `90-demo-effects.list` registra la prueba de interfaz. El
integrador debe agregar `node test-demo-effects.mjs` a la cadena backend de
release. Estas pruebas no usan proveedores pagos ni credenciales reales.
