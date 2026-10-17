# Propuesta de localidad trazable de empresa (#208)

Estado: diseño para revisión, sin implementación ni validación de instalación de producción. Base main193 `2ecdc7f3`. Alcance exclusivo de empresa y contratos; el perfil legal del cliente queda en #184/fase posterior.

## Fuente y límites

OwnCoding ya publica `LOCALITIES_PARAGUAY` y `resolveLocality` por el export público `owncoding-ui/utils`. Hay263 registros con identificador interno y procedencia `inherited-catalog`; la fuente declara catálogo compartido con MobOS, no registro oficial universal. Scale no copia datos ni resolver y no añade reglas gubernamentales de CI/RUC.

La política distingue:

- **Selección de catálogo**: el usuario elige un ID y confirma su pareja ciudad/departamento, validada contra la versión fijada de OwnCoding. Esto acredita integridad de la selección, no oficialidad.
- **Ingreso manual**: sin ID asociado, permite ciudad/departamento libres, incluidos nombres extranjeros, incompletos y valores legados. La procedencia de una modificación manual se registra como manual.
- **Legado sin procedencia**: conserva texto y ausencia de fuente; no se reclasifica automáticamente como catálogo ni se atribuye a un actor desconocido.

El catálogo no se resuelve automáticamente al cargar o guardar textos existentes. Por ejemplo, una denominación histórica de departamento no se sustituye por otra a espaldas del usuario.

## Persistencia sin migración

`agency_company_legal_profiles` guarda ciudad/departamento en columnas reales; no hay un JSON genérico de perfil. Se propone usar su `provenance jsonb` existente para una entrada reservada `locality`, con `id`, `catalog_version`, `identifier_scheme`, `status`, `source` y actor/fecha de selección. Los campos `provenance.city/department` conservan su contrato de origen. El servidor construye estos metadatos; el cliente no puede enviar `provenance`, `verified_at` ni fuentes supuestamente oficiales.

El GET deriva `locality_id` y el modo de procedencia de ese JSON; no requiere columna ni backfill. Contratos emitidos y sus versiones no se actualizan. Autocompletados futuros siguen leyendo las columnas, con origen de catálogo versionado y no oficial cuando corresponda; no se sobrescriben variables corregidas manualmente.

## API propuesta

Extender únicamente `/api/agency/company-legal-profile`, bajo el mismo `settings.manage`, sesión, organización, transacción, bloqueo y `expected_revision` actuales.

GET conserva `{profile}` y añade `locality_catalog` con versión fijada, procedencia y registros mínimos `{id,city,department}`. La procedencia común se transmite una sola vez, sin duplicarla263 veces ni exponer cuentas bancarias.

PATCH añade `locality_id: string | null` y `locality_catalog_version: string` opcionales:

1. ID seleccionado: `resolveLocality(id)` debe resolver por ID. `resolveLocality(city,department)` debe resolver el mismo ID; se rechaza desconocido, ambiguo, pareja distinta o versión obsoleta con400 y `fieldErrors` de localidad/ciudad/departamento. El servidor no completa ni reemplaza valores silenciosamente.
2. ID explícitamente null: elimina asociación y registra manual para la pareja enviada/conservada.
3. Sin ID y pareja modificada: limpia un vínculo previo y registra manual; mantiene clientes API legados operativos.
4. Sin ID y pareja igual: preserva procedencia existente, incluso si un editor legado reenvía las mismas cadenas. Cambios de otros campos no alteran localidad.
5. Ningún dato de procedencia suministrado por el cliente se acepta. La revisión obsoleta mantiene409 y el borrador de interfaz no se borra.

El catch de contratos debe devolver únicamente los `fieldErrors` generados y validados para estos errores400, conservando la sanitización de errores internos. No exponer mensajes SQL.

## Interfaz

`CompanyLegalProfile` mantiene el Editor canónico. Añade un SelectCustom mediante `Field.choices` alimentado por el GET, con opción «Ingreso manual» y etiqueta explícita de catálogo de Paraguay no oficial. Al seleccionar un ID, `valueFrom` completa sólo el borrador y deshabilita la pareja mientras esté vinculada; volver a manual conserva el último texto para corregirlo. El guardado valida la pareja en el cliente con los datos recibidos y el servidor revalida con OwnCoding.

El frontend no importa `owncoding-ui/utils`, el entry raíz ni el catálogo: evita reincorporar assets bancarios al bundle inicial. El save usa `api()` canónico para que Editor conserve `fieldErrors`; `contractRequest` actual descarta esos detalles y no se modifica para otros consumidores.

Rutas previstas: `app/company-legal-profile.tsx`, helper de tipos/metadata si conviene, `backend/contracts.js`, adaptador backend pequeño que importa sólo `owncoding-ui/utils`, tests y documentación. Sin `agency-core`, editores de cliente, widgets revisados, versiones ni deploy.

## Gate de dependencia antes de implementar

El integrador fija dependencia directa de backend a OwnCoding19 y su lock; no depender del node_modules de frontend18 que Node puede resolver por accidente en el monorepo. No modificar root package/lock desde este lote.

Antes de activar un import estático en contratos:

- Instalar en copia aislada de backend con `npm ci --omit=dev`, sin acceso a node_modules ascendentes de Scale.
- Probar import público `owncoding-ui/utils` sin window/document/React entry; comprobar el paquete resuelto y tag exactos.
- Validar build Docker backend: la git-dependency puede requerir git, red, CA y `prepare: npm run build` con devDependencies durante preparación; también declara peers React/react-dom. Una instalación local que sólo reutiliza frontend18 no cuenta como prueba.
- Si no hay instalación reproducible, detener la activación del consumidor y entregar esta propuesta; no copiar catálogo ni importar rutas internas para sortear el problema.

## Pruebas y criterio de cierre

Backend: ID/pareja correcta, ID desconocido, mismatch, ambigüedad, versión obsoleta, manual extranjero/incompleto, legado intacto, cambio manual que limpia ID, reenviar mismo texto que conserva fuente, cliente sin permiso, tenant, revisión concurrente, documentos emitidos inmutables y rollback en fallo.

Frontend: selección/retorno a manual sin perder borrador, errores inline del servidor, conflicto409, catálogo no oficial legible, datos incompletos y ausencia de imports/artefactos de catálogo en cliente. Browser390/1440 y build con instalación backend aislada.

La política permite acreditar la relación **seleccionada y validada / manual identificada**. No acredita un catálogo universal oficial ni proveedor RUC real. El cierre global de208 exige revisar sus demás criterios y documentar límites expresamente; no se cierra sólo por añadir este selector.
