# Demo privada y retención temporal — #232

Los datos de la demo viven en un tenant temporal de la base del servidor. El navegador conserva una cookie de sesión opaca, `HttpOnly`, `Secure` y `SameSite=Lax`; el conjunto de datos no vive exclusivamente en `localStorage` ni se comparte mediante una cuenta de demostración común.

La entrada pública `/demo` crea un visitante sin contraseña utilizable, una sesión y una organización nuevos para cada inicio. Dos contextos de navegador independientes reciben identidades y organizaciones distintas. Recargar una pantalla del panel conserva los cambios de esa sesión; volver a `/demo` inicia otra demo. Las pestañas del mismo contexto comparten la cookie.

La demo pública vence a las 24 horas. La demo privada que abre un dueño autenticado dura siete días y se vincula con `(demo_key, user_id)`. Cerrar el navegador no equivale al borrado físico de la base. Al vencer, el servidor deja de aceptar la sesión de demo. Los usuarios globales y la auditoría operativa central se conservan; sus cuentas reales y accesos a otras empresas permanecen separados.

## Expiración y borrado físico

El mantenedor existente puede borrar exclusivamente organizaciones generadas como demo y vencidas, con una gracia adicional mínima de 24 horas. Verifica el UUID y los marcadores completos de origen, propietario y sesión privada o visitante público. No elimina candidatos con sesiones todavía vigentes, presencia reciente, integrantes reales adicionales o una organización protegida por configuración.

El borrado calcula el orden por claves foráneas sobre una lista explícita de tablas. Las referencias desconocidas o de otra empresa bloquean ese candidato. Contratos, versiones emitidas, auditoría ficticia de esos contratos, tareas, cierres, aplicaciones, reversos y saldos de apertura de la demo se eliminan juntos. La suspensión de sus guardas queda dentro de una transacción y bajo bloqueos; el rollback también restablece las guardas. La auditoría operativa central permanece y registra los conteos del borrado.

Un mapping privado retirado continúa identificando al tenant viejo para su limpieza. El nuevo mapping y las sesiones del mismo dueño en otra demo o empresa se conservan: el alcance siempre es `organization_id`, no `user_id`.

## Activación del mismo mantenedor

La ejecución programada permanece optativa. Para habilitar el borrado de demos, el operador configura en el servicio API:

```text
MAINTENANCE_ENABLED=true
DEMO_CLEANUP_ENABLED=true
DEMO_CLEANUP_BACKUP_EVIDENCE_FILE=/run/scale/verified-restore.json
```

`DATABASE_URL` debe conservar la configuración normal del API. La ruta corresponde a un recibo real, legible por el servicio, de la verificación externa de backup/restore ya soportada. No es una declaración manual de respaldo: el mantenedor valida el evento `r2_restore_verified`, la identidad de la base, el identificador y que tanto la verificación como el backup tengan menos de 24 horas. Relee el recibo en cada ciclo.

Sin opt-in de demo, o si falta un recibo válido y vigente, el barrido de demos queda en simulación (`demoDryRun:true`). Un recibo ausente, inválido o vencido produce `demo_cleanup_simulation` con un motivo estable, sin volcar su contenido, rutas ni credenciales a los logs. La retención ordinaria de sesiones/presencia continúa. El soporte de configuración no acredita que esté habilitado en producción.

Se reutiliza un único scheduler: intervalo predeterminado de una hora, hasta tres demos y 10.000 filas por candidato; los límites son configurables. La ejecución tiene plazo y espera de bloqueos acotados. La expiración de acceso es independiente de esta configuración; la fecha de borrado físico depende también de la gracia, del scheduler, del recibo vigente y de que no existan guardas o referencias pendientes.

## Evidencia local

```bash
cd backend
node test-maintenance.mjs
SCALE_TEST_PG_BIN=/ruta/postgresql/17/bin node test-maintenance-postgres.mjs
```

La segunda prueba crea y destruye su propio clúster por socket Unix sin TCP. Nunca usa `DATABASE_URL`, `PGHOST` ni una base de desarrollo o producción para conectarse. Repite los mismos casos que PGlite: 16 tablas modernas con documentos emitidos y período cerrado, borrado completo del demo, identidad y filas de otro tenant preservadas, rollback de DDL/guardas, referencias cruzadas o desconocidas rechazadas, sesiones activas preservadas, límites temporales y configuración programada con recibos sintéticos exclusivamente de prueba. Ningún backup real se considera verificado por esas pruebas.
