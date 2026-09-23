# Concurrencia de PostgreSQL real (inventario y tesorería)

Desde un checkout **Git** de `scale-os`, dentro de `backend/`, con Node, dependencias
locales (`npm ci`) y PostgreSQL 16 o 17 ya instalados (`.git` accesible; también admite
worktrees). Los binarios `initdb`, `pg_ctl` y `postgres` deben ser ejecutables.

```sh
npm run test:postgres              # inventario + tesorería, en serie
node test-treasury-concurrency.mjs # solo tesorería
node test-inventory-postgres.mjs   # solo inventario
```

Resolución de los binarios de PostgreSQL (en este orden):

1. `SCALE_TEST_PG_BIN=/ruta/al/bin` (explícita; no es una base de datos).
2. El `PATH` del proceso (Homebrew enlaza `initdb`/`pg_ctl` al instalar el keg).
3. Los kegs de Homebrew/Linux: `postgresql@16` y `postgresql@17` en
   `/opt/homebrew/opt/`, `/usr/local/opt/` y `/usr/lib/postgresql/`.

```sh
brew install postgresql@16         # o postgresql@17; no hace falta iniciar el servicio
SCALE_TEST_PG_BIN=/opt/homebrew/opt/postgresql@17/bin node test-inventory-postgres.mjs
```

**Runner del export limpio sin `.git`: excluir `test-inventory-postgres.mjs` y
`test-treasury-concurrency.mjs` del glob `test-*.mjs`.** Ejecutar estas pruebas aparte en
el checkout Git original. No son tests portables al export ni hacen fallback al schema del
filesystem: esa restricción evita incluir silenciosamente cambios ajenos o mezclar
versiones. Tampoco entran en `npm run test:release` (ni en CI ni en el deploy): requieren
binarios de PostgreSQL reales.

Los scripts no instalan nada ni usan servicios de Homebrew. Ejecutan `initdb` y `pg_ctl`
en un directorio aleatorio propio bajo el temporal del sistema (`scale-inventory-pg-*` /
`scale-treasury-pg-*`), modo 700 (inventario). Inventario deshabilita TCP
(`listen_addresses=''`) y usa solo un socket Unix privado, también modo 700, con
autenticación local `trust` y rol exclusivo de la fixture; tesorería usa `127.0.0.1` en un
puerto fijo de fixture. Ninguno usa `DATABASE_URL`, configuraciones `PG*`, archivos
`.env`, HTTP ni UI. Las variables `PG*`/`DATABASE_URL` se descartan solo dentro del
proceso de prueba, sin leer ni imprimir sus valores. Referencias oficiales de las opciones:
[initdb](https://www.postgresql.org/docs/current/app-initdb.html) y
[pg_ctl](https://www.postgresql.org/docs/current/app-pg-ctl.html).

Los scripts leen `schema.sql`, `server.js` y las migraciones del mismo commit `HEAD`; en el
monorepo (scale-os#34) el API vive en `backend/`, así que resuelven el prefijo del worktree
(`git rev-parse --show-prefix`) antes de pedir los archivos por `git show`. Inventario
respeta el orden de registro del servidor y excluye Dadoo; no lee el `schema.sql` sucio del
working tree. Importa el handler real `inventoryReservations` del checkout, sin arrancar
`server.js`. La salida identifica el commit de SQL y la versión PG.

## Inventario — evidencia que debe producir

- Pool de seis conexiones. Cada carrera registra dos `pg_backend_pid()` distintos.
- Barrera antes del primer bloqueo de escritura del handler; una tercera conexión
  comprueba la espera real mediante `pg_blocking_pids()`. No simula locks ni SQL.
- Reservas solapadas: un 201 y un 409. Intervalos adyacentes: dos 201.
- Edición con la misma versión: un 200 y un 409, un solo incremento de versión.
- Checkout y devolución simultáneos: dos 200, uno `alreadyRecorded`, sin duplicar
  la transición. Devolver otra vez conserva versión y fechas; comprueba custodios,
  ubicaciones y estados disponible/mantenimiento.
- Empresas independientes y rechazo de IDs, proyectos, responsables o membresías
  ajenos; los intentos no modifican ni exponen registros del otro tenant.
- Carrera SQL directa sin org lock: una inserción confirma; otra espera y falla
  con `23P01` por `inventory_no_overlapping_reservations`.

En la carrera SQL directa, ambas transacciones alcanzan la barrera; se inserta
primero una tupla sin confirmar y después se lanza la segunda inserción. Se
comprueba su espera antes de confirmar la primera: no se depende de una carrera
de planificación que pudiera generar un deadlock mutuo de inserción GiST.

Las barreras, consultas y esperas tienen límites. Una aserción fallida devuelve
código no cero. `finally` detiene PostgreSQL antes de borrar únicamente la ruta
temporal exacta; SIGINT/SIGTERM tienen además limpieza síncrona de salida. Si no
puede confirmar la parada, conserva la carpeta y avisa. SIGKILL o un apagado del
sistema no pueden interceptarse: conservar la ruta `TEMP` impresa para revisar
ese clúster concreto; nunca usar borrados amplios ni detener otros servicios PG.

## Tesorería — evidencia que debe producir

Levanta su propio clúster efímero (puerto `55433`, usuario `scale_treasury_fixture`),
aplica el schema y las migraciones *committed* de `HEAD` y llama a los handlers reales de
`finance-controls.js` con sesión y empresa de fixture:

- Dos cobros concurrentes de 60 contra una factura de 100: exactamente uno gana
  (`201` + `400`); la factura nunca queda sobrepagada.
- Dos transferencias concurrentes de 40 desde una cuenta con 50: una gana y la otra se
  rechaza por fondos (`201` + `409`); la cuenta de origen nunca queda negativa y el
  destino recibe exactamente una transferencia.

## Validación local

- **2026-09-23 — PostgreSQL 17.11 (Homebrew), monorepo `scale-os`**: PASS de
  `test-treasury-concurrency.mjs` y de `test-inventory-postgres.mjs`; SQL HEAD
  `5c05154` (v1.0.107, 86 migraciones registradas), pares PID `52017/52016` con esperas
  reales, `201/409` en solapes, `23P01` directo y ambos clústeres temporales detenidos y
  eliminados. Se corrigió la resolución de rutas `git show` para el prefijo `backend/`.
- **Histórico — PostgreSQL 16.15, repo API standalone**: dos ejecuciones PASS, SQL
  `0555520e` (28 migraciones), pares PID `49937/49938` y `50157/50158`.

Esto complementa PGlite: solo un resultado PASS de estos scripts constituye evidencia de
concurrencia multiconexión PostgreSQL real.
