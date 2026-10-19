# Impresión térmica de 80 mm — contrato API

Refs #278, #279. Esta API encola documentos ESC/POS no fiscales. No se conecta a
impresoras, no recibe bytes arbitrarios del navegador y no afirma impresión física.
Sólo admite rollo térmico de 80 mm; USB directo no está implementado. Una impresora
USB puede utilizar una cola CUPS instalada por el sistema operativo.

## Sesión y permisos

`/api/agency/printing` usa la sesión habitual de Scale, control de origen para
mutaciones, membresía vigente y suscripción. `printing.manage` requiere además rol
owner/admin; `printing.print` permite encolar/confirmar/cancelar/reimprimir según la
matriz de capacidades y sus overrides. Las consultas y escrituras están filtradas
por organización. Los puentes vuelven a comprobar el acceso y capacidad del dueño
que los creó en cada llamada. La demo no habilita impresoras reales.

`branch_id` es una etiqueta local de ámbito (predeterminado `main`), no un
catálogo ni una administración de sucursales de Scale.

## Interfaz autenticada

Todas las rutas siguientes parten de `/api/agency/printing`:

| Método y ruta | Cuerpo / respuesta |
| --- | --- |
| GET `/` | `{can_manage,can_print,printers,bridges,templates,jobs,audit}` |
| POST `/printers` | `{name,model?,branch_id?,connection,destination,width_mm:80,copies?:1,auto_cut?:true,enabled?:true}` → `{printer}` |
| PATCH `/printers/:id` | Cambios de esos campos → `{printer}` |
| POST `/bridges` | `{name,branch_id?}` → `{bridge,pairing_code,expires_at}` |
| POST `/bridges/:id/revoke` | `{}` → `{ok:true}` |
| POST `/templates` | `{name,kind,definition}` → `{template}` |
| PATCH `/templates/:id` | `{name?,definition?,expected_version}` → `{template}` con versión incrementada |
| POST `/jobs` | `{printer_id,template_id,reference,copies?,data,idempotency_key}` → `{job,duplicate}` |
| POST `/jobs/:id/confirm` | `{suffix}` → `{job}` |
| POST `/jobs/:id/cancel` | `{}` → `{job}` |
| POST `/jobs/:id/reprint` | `{confirm:true,idempotency_key,data}` → nuevo `{job,duplicate}` |

IDs de impresoras, plantillas, puentes y trabajos: UUID. Destinos válidos:
`lan:192.168.1.23:9100` (IPv4 privada literal, puerto 9100) o
`cups:QUEUE_NAME` (nombre ASCII alfanumérico inicial, luego letras, números, `_`
o `-`, máximo 64 caracteres). No URL, DNS, IP pública, shell ni dirección remota
aportada por un trabajo.

`kind`: `test`, `receipt`, `quote`, `inventory-label`.
`definition`: configuración normalizada del renderer compartido
(`widthMm:80`, orientación vertical, márgenes y tamaño de fuente admitidos).
`data`: `{title?,companyName?,companyRuc?,customerName?,issuedAt?,lines?:[{label,value?}],total?,notes?,inventoryCode?}`.
La referencia proviene del campo `reference` del trabajo. El servidor añade un
sufijo criptográfico de ocho caracteres; el navegador no puede establecerlo.
Los datos son manuales; no se atribuyen a cobros/clientes existentes ni se crean
números de inventario automáticamente.

La respuesta segura de trabajo incluye `template_snapshot` (sólo configuración),
versión, estado, referencia, copias, fechas y transporte/error. Omite documento,
payload, hash/secreto de confirmación y credenciales. Listas limitadas a los 100
trabajos y eventos más recientes. `bridges.online` usa heartbeat de hasta 45 s.
El código de emparejamiento se entrega una vez y vence a los diez minutos.

## Puente sin cookies ni Origin

`POST /api/print/bridges/pair {code}` devuelve `{bridge,token}` una sola vez.
El código aleatorio se consume atómicamente; límite de doce intentos por cliente
en quince minutos. El token tiene 256 bits; sólo su SHA-256 persiste en la API.
Las demás llamadas requieren `Authorization: Bearer <token>`:

| Método y ruta | Contrato |
| --- | --- |
| GET `/api/print/bridge/config` | `{bridge,printers,heartbeat_seconds:15}` |
| POST `/api/print/bridge/heartbeat` | `{}` → `{ok:true}` |
| POST `/api/print/bridges/:id/claim` | `{}` → `{job:null}` o `{job,printer}` |
| POST `/api/print/jobs/:id/result` | `{lease_id,state,transport,error_code?}` → `{job}` |

El trabajo reclamado contiene `payload_base64`, `payload_bytes`, `lease_id`,
`leased_until`, `template_snapshot`, `copies`, `width_mm:80` y los identificadores.
**El payload contiene UNA copia.** El puente concatena exactamente `copies`
veces antes de un único intento de envío. El tamaño total no supera 64 KiB.
`payload_bytes` mide una copia. El corte configurado en la impresora se incorpora
al snapshot al encolar; no se cambia retroactivamente.

Lease de 120 segundos, claim atómico (`FOR UPDATE SKIP LOCKED`). Sólo el puente
propietario del lease y del ámbito puede reportar. Resultado `aceptado`, `incierto`
o `fallido`, transporte `cups`/`lan` correspondiente al destino reclamado; error
sólo código ASCII, sin datos del documento. `leaseId` y `errorCode` se admiten
como alias para compatibilidad. Una respuesta repetida idéntica se reconoce sin
reenviar papel. No hay endpoint de impresión TCP remoto.

## Estados y retención

- `pendiente`: todavía no reclamado; sólo entonces se permite cancelar.
- Un pendiente reclamado nunca se entrega a otro puente. Si vence el lease pasa
  a `incierto`; no se reintenta automáticamente.
- `aceptado`: transporte aceptó bytes, sin afirmar papel impreso.
- `confirmado`: una persona introdujo correctamente el sufijo del papel.
- `incierto`: pudo haber salida; reimpresión exige nueva acción explícita.
- `fallido`: fallo informado por el puente; no se reencola automáticamente.
- `cancelado`: cancelación anterior al envío o pendiente sin reclamar de 24 horas.

Tras resultado, cancelación, revocación o vencimiento de lease se eliminan bytes
y documento sensible. El hash de confirmación vence a los siete días y se borra
al confirmar; ocho intentos fallidos bloquean la confirmación. La limpieza se
aplica al atender consultas/acciones de impresión. El job de privacidad existente
declara además bytes/documentos de un día, hash de siete días y auditoría de cinco
años; su modo predeterminado es reporte y `execute` aplica esa política, sin
inventar un planificador externo.
La revocación de un puente invalida su token y convierte sus leases en inciertos.
Reimprimir requiere completar de nuevo los datos; conserva la versión/layout del
trabajo original y genera un nuevo sufijo, ID y registro de auditoría.

Idempotencia permanente por organización y clave: mismo contenido devuelve el
trabajo anterior; contenido diferente devuelve 409. La supresión de documentos
idénticos durante 60 segundos también guarda la clave alternativa, para que una
repetición posterior no genere otro papel. La reimpresión explícita usa otra
clave y omite únicamente la ventana de supresión, nunca la idempotencia.

La auditoría dedicada registra actor, entidad, acción y fecha, sin cuerpos,
bytes, códigos de emparejamiento, sufijos ni tokens. No usa los triggers genéricos
que capturan documentos completos.

## Validación reproducible

`node backend/test-printing.mjs`: DB embebida, permisos, tenant, pairing de un uso,
idempotencia, copias/corte, estados honestos, lease, confirmación y revocación.

`SCALE_TEST_PG_BIN=/ruta/postgresql/bin node backend/test-printing-postgres.mjs`:
misma matriz en PostgreSQL real: tres emparejamientos simultáneos consumen un solo código, cinco altas idempotentes crean un trabajo y cinco reclamos entre dos puentes independientes obtienen un único lease.
El clúster temporal propio se detiene y elimina al finalizar. No contacta producción,
LAN física, CUPS del usuario ni proveedores externos.

Evidencia focal: 66 aserciones PGlite y 72 PostgreSQL PASS; purge de demo cubre
24 tablas modernas, incluidas las seis nuevas de impresión. El upgrade
116→117 conserva cada fila previa y el reinicio no reaplica DDL. Export PDP
incluye metadatos propios sin bytes/hash/token; la supresión revoca los puentes
y minimiza documentos del usuario. Prueba física pendiente.
