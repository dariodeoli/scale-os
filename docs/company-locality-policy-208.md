# Localidad trazable de empresa (#208)

Estado: implementación en rama, pendiente de integración/CI/deploy194. Base main193 `2ecdc7f3`. Alcance exclusivo de empresa y contratos; el perfil legal del cliente queda en #184/fase posterior.

## Fuente y límites

OwnCoding ya publica `LOCALITIES_PARAGUAY` y `resolveLocality` por el export público `owncoding-ui/utils`. Hay 263 registros con identificador interno y procedencia `inherited-catalog`; la fuente declara catálogo compartido con MobOS, no registro oficial universal. Scale no copia datos ni resolver y no añade reglas gubernamentales de CI/RUC.

La política distingue:

- **Selección de catálogo**: el usuario elige un ID y confirma su pareja ciudad/departamento, validada contra la versión fijada de OwnCoding. Esto acredita integridad de la selección, no oficialidad.
- **Ingreso manual**: sin ID asociado, permite ciudad/departamento libres, incluidos nombres extranjeros, incompletos y valores legados. La procedencia de una modificación manual se registra como manual.
- **Legado sin procedencia**: conserva texto y ausencia de fuente; no se reclasifica automáticamente como catálogo ni se atribuye a un actor desconocido.

El catálogo no se resuelve automáticamente al cargar o guardar textos existentes. Por ejemplo, una denominación histórica de departamento no se sustituye por otra a espaldas del usuario.

## Persistencia sin migración

`agency_company_legal_profiles` guarda ciudad/departamento en columnas reales; no hay un JSON genérico de perfil. Se usa su `provenance jsonb` existente para una entrada reservada `locality`, con `id`, `catalog_version`, `identifier_scheme`, `status`, `source` y actor/fecha de selección. Los campos `provenance.city/department` conservan su contrato de origen. El servidor construye estos metadatos; el cliente no puede enviar `provenance`, `verified_at` ni fuentes supuestamente oficiales.

El GET deriva `locality_id` y el modo de procedencia de ese JSON; no requiere columna ni backfill. Contratos emitidos y sus versiones no se actualizan. Autocompletados futuros siguen leyendo las columnas, con origen de catálogo versionado y no oficial cuando corresponda; no se sobrescriben variables corregidas manualmente.

## API

Extender únicamente `/api/agency/company-legal-profile`, bajo el mismo `settings.manage`, sesión, organización, transacción, bloqueo y `expected_revision` actuales.

GET conserva `{profile}` y añade `locality_catalog` con versión fijada, procedencia y registros mínimos `{id,city,department}`. La procedencia común se transmite una sola vez, sin duplicarla 263 veces ni exponer cuentas bancarias.

PATCH añade `locality_id: string | null` y `locality_catalog_version: string` opcionales:

1. ID seleccionado: `resolveLocality(id)` debe resolver por ID. `resolveLocality(city,department)` debe resolver el mismo ID; se rechaza desconocido, ambiguo, pareja distinta o versión obsoleta con 400 y `fieldErrors` de localidad/ciudad/departamento. El servidor no completa ni reemplaza valores silenciosamente.
2. ID explícitamente null: elimina asociación y registra manual para la pareja enviada/conservada.
3. Sin ID y pareja modificada: limpia un vínculo previo y registra manual; mantiene clientes API legados operativos.
4. Sin ID y pareja igual: preserva procedencia existente, incluso si un editor legado reenvía las mismas cadenas. Cambios de otros campos no alteran localidad.
5. Ningún dato de procedencia suministrado por el cliente se acepta. La revisión obsoleta mantiene 409 y el borrador de interfaz no se borra.

El catch de contratos debe devolver únicamente los `fieldErrors` generados y validados para estos errores400, conservando la sanitización de errores internos. No exponer mensajes SQL.

## Interfaz

`CompanyLegalProfile` mantiene el Editor canónico. Añade un SelectCustom mediante `Field.choices` alimentado por el GET, con opción «Ingreso manual» y etiqueta explícita de catálogo de Paraguay no oficial. Al seleccionar un ID, `onValuesChange` y el handle canónico completan sólo el borrador tras un cambio explícito de selección y deshabilita la pareja mientras esté vinculada; volver a manual conserva el último texto para corregirlo. El guardado valida la pareja en el cliente con los datos recibidos y el servidor revalida con OwnCoding.

El frontend no importa `owncoding-ui/utils`, el entry raíz ni el catálogo: evita reincorporar assets bancarios al bundle inicial. El save usa `api()` canónico para que Editor conserve `fieldErrors`; `contractRequest` actual descarta esos detalles y no se modifica para otros consumidores.

Rutas: `app/company-legal-profile.tsx`, helper de tipos/metadata si conviene, `backend/contracts.js`, adaptador backend pequeño que importa sólo `owncoding-ui/utils`, tests y documentación. Sin `agency-core`, editores de cliente, widgets revisados, versiones ni deploy.

## Dependencia de servidor

Backend fija dependencia directa a OwnCoding19 y su lock; no depender del node_modules de frontend18 que Node puede resolver por accidente en el monorepo. No modificar root package/lock desde este lote.

Antes de activar un import estático en contratos:

- Instalar en copia aislada de backend con `npm ci --omit=dev`, sin acceso a node_modules ascendentes de Scale.
- Probar import público `owncoding-ui/utils` sin window/document/React entry; comprobar el paquete resuelto y tag exactos.
- Validar build Docker backend: la git-dependency puede requerir git, red, CA y `prepare: npm run build` con devDependencies durante preparación; también declara peers React/react-dom. Una instalación local que sólo reutiliza frontend18 no cuenta como prueba.
- Si no hay instalación reproducible, detener la activación del consumidor y entregar esta propuesta; no copiar catálogo ni importar rutas internas para sortear el problema.

## Pruebas y criterio de cierre

Backend: ID/pareja correcta, ID desconocido, mismatch, versión obsoleta, manual extranjero/incompleto, legado intacto, cambio manual que limpia ID, reenviar mismo texto que conserva fuente, cliente sin permiso, tenant, revisión concurrente, documentos emitidos inmutables y rollback en fallo.

Frontend: selección/retorno a manual sin perder borrador, errores inline del servidor, conflicto 409, catálogo no oficial legible, datos incompletos y ausencia de imports/artefactos de catálogo en cliente. Browser 390/1440 y build con instalación backend aislada.

La política permite acreditar la relación **seleccionada y validada / manual identificada**. No acredita un catálogo universal oficial ni proveedor RUC real. El cierre global de 208 exige revisar sus demás criterios y documentar límites expresamente; no se cierra sólo por añadir este selector.

## Evidencia de esta entrega

- Dependencia backend `github:dariodeoli/owncoding-ui#v0.68.19`; versión instalada0.68.19 y lock resuelto al commit `7cf63ad530384b2887551ddb50c9261270762202`, sin resolver el paquete de frontend por accidente. Los paquetes ya fijados mantienen sus versiones.
- `backend/test-company-locality.mjs`: PGlite, migración real aplicada dos veces, rutas reales, permisos401/403, aislamiento por organización, CAS409, rechazos400 con campos y rollback, selección versionada, manual/legado intactos, auditoría y versiones emitidas intactas. El catálogo actual no presenta nombres idénticos en departamentos diferentes: no se inventa un caso ambiguo de producción; todo resultado diferente de `resolved` se rechaza.
- `tests/company-locality.test.tsx` + `tests/field-contract-limits.test.tsx`:5 PASS; Editor/SelectCustom reales, transición manual/selección, borrador y revisión preservados en400/409, guardado sin normalizar textos existentes. TSC PASS.
- `build-tools/qa-company-locality.mjs`: seis escenarios Chromium 390/1440 × claro/oscuro/contraste, selector44px, sin overflow de documento; OwnCoding19 resuelto por export público desde la instalación aislada de backend mediante plugin del harness (sin modificar dependencias compartidas de frontend); guardado manual y errores400/409 con borrador conservado. Datos/API/shell sintéticos; no equivale a sesión autenticada completa ni producción. Reporte durable en `docs/qa/company-locality-208/browser-report.json`; PNG regenerables locales `/tmp/scale208-company-locality`.
- Instalación aislada de producción: `npm ci --omit=dev` en `node:24-alpine`, con package/lock finales del backend y git. Runtime posterior `--network none` confirma0.68.19,263 registros y utilidades públicas sin DOM. El Dockerfile de producto sólo agrega git a apk. Proxy/configuración heredados conservados; CA pública montada únicamente como secret BuildKit para el entorno de prueba, TLS verificado, sin flags insecure ni cambios persistentes de certificados.
- `npm --prefix backend run test:release`:59 scripts PASS (exit0), incluido el nuevo test. La base193 registra114 migraciones; el integrador preserva los registros adicionales de194 al integrar. El integrador ejecuta los gates frontend/build sobre el conjunto194 consolidado para evitar afirmar equivalencia entre esta base193 y la release final.

No se añaden migraciones ni reglas legales de documento. La empresa puede seguir usando datos manuales sin ID, y ninguna selección se declara oficial o universal. No se cierran208 ni pendientes externos sin validación del integrador.
