# OwnData → Scale: adaptador RUC opt-in (Refs #213)

Estado: código y mocks implementados; integración empresarial **sin activar**.
El proveedor predeterminado de Scale sigue siendo `https://ruc.sun.com.py/api/ruc`.
No se crearon claves, cuentas, planes ni consultas reales para esta entrega.

## Fuente verificada

Repositorio accesible: <https://github.com/dariodeoli/owndata>. Se revisaron
`README.md`, `docs/COMMERCIAL-API.md`, `docs/PERSONAL-APP-API-KEYS.md`,
`src/lib/commercial-api-contract.ts`, `src/lib/server/commercial-api.ts`,
`src/lib/server/dnit-ruc.ts` y `src/lib/pricing.ts` (main, 17 octubre 2026).

Contrato 1.4.0: `GET https://app.controlaria.online/api/v1/ruc/{ruc}`, header
secreto de servidor `X-API-Key`, alcance `ruc:read`, entorno de clave `test/live`
coincidente con el despliegue OwnData. La respuesta exitosa contiene `data.ruc`,
`fullRuc`, `dv`, `nameOfficial`, `stateRaw` y `meta.provenance`. Son datos de un
**snapshot de publicaciones DNIT**, no de una consulta viva. No contiene domicilio,
ciudad, departamento ni catálogo bancario. No se encontraron referencias a Ocoin
para reutilizar catálogos; no se asumieron accesos ni credenciales compartidos.

## Dependencias de habilitación empresarial

La documentación de OwnData mantiene su API comercial deshabilitada por defecto
(`503 COMMERCIAL_API_DISABLED`) hasta contar con autorización escrita para
redistribución DNIT. La habilitación y el plan empresarial los controla OwnData.
Scale requiere además una clave empresarial autorizada con `ruc:read`, guardada
como secreto del servidor. Esas condiciones siguen pendientes; disponer de código
compatible no demuestra autorización ni disponibilidad real del servicio.

Free100 es personal, gratis, 100 consultas por día de Paraguay compartidas por
cuenta entre web, claves y lotes. Su contrato dice que no habilita uso comercial
ni redistribución. **No se activa Free100 en Scale como alternativa a la API
empresarial.** El adaptador no crea claves ni modifica el gate de OwnData, y no
puede determinar el titular/tipo de clave por su texto: el operador debe aportar
la vinculación empresarial autorizada.

Precios publicados como previstos, no contratación activa: Starter300
Gs. 79.000/mes, Growth1000 Gs. 199.000/mes; personalizado a cotizar. El código
publica promoción de 50% hasta 14 enero 2027. No hay checkout/cobros activos ni SLA
confirmado. Ninguno de esos importes establece un costo aprobado para Scale.

## Configuración futura, sin activarla en esta entrega

Son necesarias las tres vinculaciones explícitas en el servidor:

```text
RUC_LOOKUP_PROVIDER_KIND=owndata
RUC_LOOKUP_PROVIDER_URL=https://app.controlaria.online/api/v1/ruc
OWNDATA_API_KEY=<secreto empresarial autorizado, inyectado por configuración>
```

La selección omisa equivale a `legacy`; una selección desconocida falla. OwnData
sin URL exacta documentada o sin clave falla cerrado. Se rechazan claves
publicables `pk_` y saltos de línea. No poner claves en Git, frontend, URLs,
logs, capturas ni variables `NEXT_PUBLIC_*`. No imprimir el objeto de configuración,
que contiene la vinculación secreta. Usar la inyección normal del entorno; no
sustituir identidades ni copiar credenciales de otro producto.

La URL configurada ya incorpora el host en `outboundAllowlist` de Scale; si el
entorno administrado tiene otra lista de red, debe permitir expresamente
`app.controlaria.online`. `safeFetch` conserva HTTPS/TLS y rechaza redirecciones,
URLs con credenciales, IPs y destinos no permitidos. Nunca se envía la clave a
una URL alternativa suministrada por un usuario. No hay cambio de proveedores
automático ante fallos ni reintentos que puedan duplicar consumo.

## Mapeo y conservación de fuentes

- `nameOfficial` → `record.name`; `stateRaw` → `tax_state`.
- `fullRuc` se valida contra la consulta y el DV numérico módulo 11; un DV
  incorrecto nunca se elimina para consultar por la base.
- `meta.provenance.source` debe ser `dnit_official_snapshot` y debe contener
  `publicationDate` ISO. Se conserva la fecha como `record.publication_date` y
  la fuente como `owndata:dnit_official_snapshot`.
- La caché JSON existente admite esos metadatos. OwnData usa claves
  `owndata:{ruc}`, separadas de resultados legacy. No hay migración nueva.
- El refresco aplicado conserva el nombre manual del cliente y actualiza
  únicamente `ruc_legal_name/ruc_tax_state/ruc_source/ruc_refreshed_at` existentes.
  La fecha de publicación está en la ficha de consulta/caché; el esquema del
  cliente no tiene una columna propia para ella. Hash de snapshot, importedAt,
  cuota y accounting completos no se persisten en esta entrega.
- Permisos `clients.manage`, exclusión de demo, throttle, cuota Scale y revisión
  explícita de aplicación siguen vigentes. La cuota de Scale continúa siendo
  su límite conservador mensual (máximo 100); no equivale al cupo OwnData. Los
  intentos externos consumen esa cuota de Scale según el comportamiento previo,
  incluso si el proveedor falla; no se cambió su contabilidad.

## Errores y validación

Sólo `404 REGISTERED_RUC_NOT_FOUND` representa ausencia válida y se cachea como
resultado negativo. `400 INVALID_RUC_FORMAT/INVALID_RUC_DV` responde 400 claro;
429 responde 429 sin cachear ausencia ni reintentar. Credenciales rechazadas,
permiso/plan ausente, API comercial deshabilitada, otros 404, 503, respuestas
inválidas y errores de red producen 503 con mensaje seguro. No se reenvía el
mensaje crudo del proveedor ni se registran cabeceras/payloads/claves. Un error
no sustituye un resultado por datos inventados; sigue disponible la carga manual.

Validación local: `cd backend && node test-ruc.mjs` (PGlite y fetch mock, cero
consultas externas). Incluye compatibilidad legacy, opt-in/configuración,
header de autenticación, envelope y procedencia, DV, errores, ausencia de
reintentos, aislamiento de caché y ausencia de caché negativa ante 429/503.

Reversión: quitar la selección OwnData y su URL para volver al default legacy;
no hay migraciones, sustitución de claves ni operación destructiva. Las fuentes
previamente verificadas en clientes y las versiones de contratos conservan su
historial. La caché de cada proveedor permanece aislada.

## Comentario exacto para issue #213

> Se auditó el repositorio real `dariodeoli/owndata` y se implementó un adaptador
> RUC **opt-in**, sin activar el servicio ni consultar datos reales. Se conserva
> el proveedor predeterminado y se reutilizan permisos, cuota, caché y `safeFetch`
> de Scale. El adaptador exige selección explícita, URL documentada y secreto
> `OWNDATA_API_KEY`; valida envelope, procedencia y DV, conserva fuente/fecha de
> publicación y evita reintentos o caché negativa ante errores. Pruebas locales
> PGlite/mock cubren auth, errores y compatibilidad legacy. **Pendiente externo:**
> habilitación comercial autorizada por OwnData, plan y clave empresarial con
> `ruc:read`. Su API comercial figura deshabilitada hasta autorización escrita de
> redistribución DNIT; Free100 es personal y no se habilita como workaround para
> Scale. No se confirmó un costo contratado. OwnData devuelve snapshot fiscal,
> no frescura viva ni domicilio/bancos; no se encontró integración Ocoin
> reutilizable. Detalle, configuración futura y reversión:
> `docs/owndata-scale-integration.md`.
