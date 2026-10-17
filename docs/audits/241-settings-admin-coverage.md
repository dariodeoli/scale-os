# #241 — cobertura manual de configuración, personas, administración y acceso

Snapshot: `11a71500` (17/10/2026). Fase de auditoría por lectura de fuentes; este
entregable modifica únicamente este documento. No se ejecutaron nuevas pruebas,
no se modificaron consumidores, contratos ni dependencias y no se consultó
OwnCoding UI externo. No acredita teclado/renderizado ni deploy de este snapshot.

Complementa el inventario global de componentes/JSX en
`241-ui-components.md` y `241-ui-consumers.md`, los formularios/campos inteligentes
en `241-forms-smart-fields.md` y los contratos en `241-field-contracts.md`. No replica sus recuentos: aquí se
comprueba que las superficies de empresa, usuario, equipo y administración
formen parte del plan y que su lógica sensible no termine dentro de un primitivo.

## Cobertura de entradas y consumidores

| Entrada / ubicación | Consumidores locales y bases observadas | Diferencias y riesgo que debe conservar la migración |
| --- | --- | --- |
| `app/sections/configuracion.tsx:39` | Monta `SettingsWorkspace`, `CompanyLegalProfile`, `NewCompany`, cotización, cupón, integración, suscripción, privacidad y zona de peligro. `SettingsBlock` organiza anclas/columnas. | No reducir Configuración a su primer formulario. Cada bloque conserva carga, permiso, servicio y guardado independientes. El layout por anclas es una composición válida, no otro motor de tabs. |
| `app/suite.tsx:166` · `SettingsWorkspace` | `Editor`, `ProfilePhoto`, `LoadingBlock`, `ErrorBlock`; Configuración → Mi empresa. | Datos generales por `/api/agency/settings`; logo se guarda aparte y emite `COMPANY_LOGO_EVENT`. Cambiar moneda actualiza el proveedor de moneda del espacio. No fusionar estos efectos con guardar datos legales. |
| `app/company-legal-profile.tsx:8` | `Editor` con procedencia por campo; Configuración lo remonta por organización/usuario. | `/api/agency/company-legal-profile`, revisión optimista, carga con generación y botón explícito de recarga que descarta edición. Mantener procedencia y 409; no convertirlo en un único PATCH con settings. |
| `app/workspace-guide.tsx:112` · `NewCompany` | `Dialog` + `Editor` + `CompanySettings`; tarjetas/ayuda propias. | Crear empresa, iniciar prueba y cambiar sesión son operaciones de Scale. No confundir creación explícita con resolver identidad en registro. |
| `app/company-settings.tsx:17` y `app/operations.tsx:371` | Lista de empresas con `ListGrid/ListRow` y selector de empresa del header (`CompanySelector`, `Dialog`). También se usa en pantalla de suscripción suspendida. | Presentan la misma fuente `/auth/organizations` de modo distinto. Abrir empresa cambia sesión/navega; estrella cambia preferencia; excluir demos, conservar lock y evento de refresco. No son un select de valor simple. |
| `app/suite.tsx:154,186,198` | Cupón y cotización usan `Editor`; integraciones es una lista informativa manual. | Cupón normaliza código; cotización es referencia fechada, no conversión de caja. Integraciones tiene textos/estados estáticos: no deducir conectividad real de ese badge ni introducir consultas externas al unificar. |
| `app/subscription-panel.tsx` | Montado en Configuración, dialog del shell y bloqueo por suscripción; `LoadingBlock`, botones/enlaces nativos. | `canManage`, disponibilidad de checkout/portal, verificación de retorno, estados servidor y transferencia asistida son de negocio. No tratar clic/retorno como evidencia de pago. No trasladar precios/datos de transferencia al Button/Card compartido. |
| `app/sections/preferencias.tsx:22` | `SelectCustom`, `ListPage`, `StateChip`, `Aviso`; `use-workspace-preferences.ts`. | Preferencia local por usuario/empresa, no default de login guardado en API. Unificar aspecto sin unir dos persistencias ni alterar prioridad de enlaces/retornos de auth. |
| `app/sections/equipo.tsx`, `app/team-workspace.tsx` | Directorio, `ListGrid`, `PersonContainer`, menú de acciones, confirmación de retirada/purga, `TeamPersonSheet`. | Ficha de colaborador y membresía no equivalen: existen miembros sin ficha y perfiles sin acceso. La marca «vos» y protección de propio acceso se resuelven por ID, no por nombre/correo mostrado. |
| `app/team-person-sheet.tsx:76,118,166` | Perfil y remuneración por `Editor`; acceso por estado manual + `SelectCustom`; foto por `PersonPhotoField`; carcasa `PersonSheet`. | Tres guardados independientes. El perfil laboral activo no habilita/suspende acceso. Acceso envía `expected_role/expected_active`; salario requiere permiso específico. No enviar campos de una pestaña desde otra. |
| `app/team-access.tsx:20` | `ChipEstado` de paquete, `Dialog` y `Editor` de invitación; se compone en ficha de equipo. | Estado derivado de membresía/retirada, correo ambiguo y opción de invitar dueño dependen del actor. Consolidar chip visual con `StateChip` sin mover reglas ni inferir autorización por color. |
| `app/my-profile.tsx:26` y `app/person-sheet.tsx:35` | `PersonSheet`, `Editor`, `PersonPhotoField`, `FotoPerfil`, `AccountSecurity`, `MyDataPanel`. | Misma carcasa que Equipo; modo propio no monta remuneración. Identidad personal compartida entre empresas; identidad demo o sólo lectura conserva alcance diferente. Foto guarda aparte; un fallo de refresco posterior no vuelve fallido un guardado ya persistido. |
| `app/account-security.tsx:14`, `app/my-data.tsx:56` | Sesiones manuales; Mis datos usa `Dialog`, `ConfirmDialog`, `Editor`, estados comunes. | Cerrar la sesión actual cierra el panel; exportaciones/consentimientos/derechos no son edición de perfil. Conservar expiración, descarga, SLA y mensajes de backend. |
| `app/invite-links.tsx:29`, `app/sections/invitaciones.tsx` | `Editor`, `SearchField`, actores, `ListGrid`, `StateChip`, copiado y acciones manuales. | Enlace single/approval, vigente/usado/revocado y solicitud aprobada son estados distintos. Una lista vacía no equivale a error; conservar paginado/permiso y confirmación donde exista. |
| `app/sections/permisos.tsx` → `app/permissions-matrix.tsx:114` | `MatrixView`, `RoleExplorer`, `ModulePermissions`, `Dialog`, `StateChip`, estados comunes; panel y popup. | Editor de matriz, no formulario plano ni selector multivalor. Dueño conserva capacidades; overrides por empresa, default/efectivo y restablecer global deben seguir fuera de UI genérica. Restablecer hoy es una acción directa: añadir confirmación sería otra decisión de flujo. |
| `app/privacy-panel.tsx:85` | Configuración; `Editor` para alta/resolver/rechazar, `Dialog`, listas/KPIs/estados comunes; filtro `<select>` nativo. | Gestión PDP por `privacy.manage`, finalidades, consentimientos, retención y datos sensibles. Reutilizar campos/tabla sin convertir acciones legales en CRUD visual genérico. |
| `app/deletion-danger-zone.tsx:147,306` | Formas manuales con refs de foco, preview, contraseña/código/Google y confirmación; Configuración y helper de preflight reutilizado en superadmin. | Flujo irreversible de varios pasos. TTL, prueba de identidad, alcance de preview, espera, challenge y bloqueo obsoleto son contratos de seguridad; no reemplazar por una confirmación genérica de un clic. |
| `app/scale-workspace.tsx:875` y `app/registro/page.tsx` | Login del shell y alta por pasos; `AccessLayout`, `ProviderSignIn`, `EmailField`, `PasswordField`, `TextField`, `SelectCustom`, consentimientos. | Formularios manuales con estado de identidad/agencia. Registro tiene ref contra doble submit, comprobación de sesión, resolve y redirección allowlist. Identidad existente nunca debe crear otra agencia; login legacy no hereda mínimo de contraseña nueva. |
| `app/invitacion/page.tsx`, `app/verificar-correo/page.tsx`, `app/recuperar-cuenta/page.tsx`, `app/password-panel.tsx`, `app/acceso-pendiente/page.tsx` | Páginas `AccessLayout`, campos comunes y estados manuales; `PasswordPanel` usa `Dialog/Editor`. | Invitación, verificación de correo, reset de contraseña, cancelación de cierre y solicitud pendiente son procesos distintos. Reutilizar controles sin compartir tokens, expiración, sesión o consentimientos por parecido visual. |
| `app/cliente/ingresar/page.tsx`, `app/cliente/invitacion/page.tsx`, `app/cliente/recuperar/page.tsx` | Portal: `EmailField`, `PasswordField`, `GoogleSignIn`, formulario manual y `portal.css`. | Identidad/grants/sesión y `client-portal-api.ts` separados del panel interno. Compartir presentación no autoriza intercambiar endpoints ni elevar a miembro de una agencia. |
| `app/superadmin/page.tsx`, `app/superadmin/sections.tsx` | Orquestador y registro de vistas: overview, consultas, agencias, accesos, cupones, auditoría, uso, errores, reportes, tráfico, comunicados, mantenimiento. | `writable` depende de rol global, distinto del rol en una empresa. Bootstrap, redirección, colecciones/paginado y `platformApi` permanecen en Scale. No omitir vistas por estar extraídas de page.tsx. |
| `app/superadmin/agencies.tsx`, `access.tsx`, `audit.tsx`, `usage.tsx`, `traffic.tsx` | `ListGrid/ListRow`, `PersonContainer`, `SearchField`, filtros `Select` del paquete, `ActionMenu`, `EdgeAwareMenu`, KPIs y `PlatformMore`. | Colecciones globales, cursor/hasMore, estado vacío/error y permisos de lectura/escritura. `EdgeAwareMenu` sólo adapta alineación; no es otro motor de menú. Métricas/globalidad no pertenecen a una tabla compartida. |
| `app/superadmin/catalog.tsx`, `subscription-dialog.tsx`, `apply-coupon-dialog.tsx` | Forms manuales, `SelectCustom`, inputs monetarios/porcentaje/días, `Dialog/ConfirmDialog`; funciones de page/model/api. | Valores comerciales y vigencia idempotente. Los tres modelos de descuento no deben colapsar a un AmountInput ni perder moneda. Se reutiliza carcasa; reglas/identificadores de solicitud siguen en consumidor. |
| `app/superadmin/confirm.tsx` | `PlatformConfirmDialog` **ya envuelve `ConfirmDialog` compartido**. | No es un duplicado de modal: añade reauth/preview/texto autorizado desde el backend. Puede migrar controles internos conservando la composición de dominio. |
| `app/superadmin/announcements.tsx`, `maintenance.tsx`, `inquiries.tsx`, `reports.tsx`, `errors.tsx` | Manual + `SelectCustom`/`Select`, `Dialog/ConfirmDialog`, `notify`, bloques comunes y fechas; comunicado reutiliza `AnnouncementBannerView`. | Publicar, audiencias, rangos temporales, mantenimiento, notas y transiciones distintas. Mantener borrador tras fallo, IDs y límites; no extraer endpoints o permisos en el componente de alerta compartido. |

No se encontró en `app/` un formulario dedicado de configuración de dominios
SSO/OIDC en este snapshot. El login sí monta proveedores Google/Microsoft/Apple
según `/auth/providers`. La existencia de APIs SSO no prueba cobertura de una
pantalla; no crear una pantalla nueva como parte de una consolidación visual.

## Inventario de diferencias y elección local de base

Las bases siguientes son candidatas sustentadas por los consumidores existentes;
la decisión transversal de #241 se consolida con el inventario global antes de
migrar. No implica que ya se haya creado una biblioteca ni que todos los estados
estén validados en navegador.

| Modelo | Base local que conviene conservar | Duplicados/diferencias y migración posterior |
| --- | --- | --- |
| Botón/enlace/acción con icono | Tokens y comportamiento actualmente usados por `primary/secondary/text-button`, `ui-v2` y acciones de Dialog; decisión Button transversal en inventario global. | Native buttons en settings, acceso, auth, portal y superadmin mezclan clases CSS y Tailwind. Una base tipada debe conservar `type`, ref, disabled, loading, foco y semántica de enlace. `ProviderSignIn` aporta marca/navegación, no autentica desde el Button. |
| Formularios habituales | `Editor` (`operations.tsx:93`), basado en RHF/Zod, y sus `Field`. | Ya usado por empresa, legal, perfil, equipo, cupones, invitaciones y privacidad. Los formularios manuales de auth/destrucción/publicación necesitan composición con los mismos controles; no meter sus máquinas de estado dentro de Editor. |
| Texto/email/teléfono/contraseña | `TextField`, `EmailField`, `PhoneField`, `PasswordField`; wrapper/renderer de Editor. | Editor todavía renderiza texto/textarea nativos; invitación usa nombre nativo y superadmin/destrucción contraseñas nativas. Migrar mediante API de campo que preserve ref, ARIA, límite, autocomplete y error; no forzar el default120 a todo texto. |
| Select de valor vs menú de acciones | `SelectCustom` para selección configurable; `ActionMenu`/menú subyacente para acciones. | Filtros de admin usan `Select` del paquete y privacidad select nativo. Documentar si nativo simple sigue como variante justificada o migra; conservar teclado/value y filtros vacíos. `CompanySelector` es una composición de navegación+preferencia; sólo su presentación es reutilizable. |
| Avatar/logo/foto editable | `FotoPerfil`; `PersonContainer` y `ActorIdentity`; `ProfilePhoto`/`PersonPhotoField` como editores de imagen. | Equipo y Mi perfil ya comparten foto. Logo de empresa en `CompanyMark` pide cuadrado/Building2; persona pide círculo. Son variantes explícitas existentes, no dos formatos para igual entidad. La directiva circular necesita decisión antes de cambiar logo corporativo. |
| Modal/drawer/confirmación | `dialog.tsx` y reexport de `operations.tsx`; `ConfirmDialog`, `FormActions`, `SaveActions`; `PersonSheet` para carcasa de persona. | Imports distintos no significan motores distintos. Preservar `PersonSheet` con pestañas visitadas montadas y paneles no autorizados sin montar. Wrappers de reauth son dominio, no nuevos overlays. |
| Listas/tablas/estados | `ListPage`, `ListGrid/ListRow`, `StateChip`, `LoadingBlock`, `ErrorBlock`, `EmptyBlock`; `PlatformMore` como adaptador de colección. | `TeamAccess` aún usa `ChipEstado`, sesiones usa filas propias y algunos errores son `<p role=alert>`. Unificar superficie sin eliminar diferencias entre error de campo, error de carga, resultado inline y toast. |
| Card/container/secciones | Tokens de `ui-v2`, panel y contenedores actuales; `SettingsBlock`/`PersonSheet` como composiciones. | Settings/MyProfile/Preferencias/superadmin repiten radios, padding y headers en CSS/Tailwind. Elegir tokens/variantes, no un nuevo componente por acción o bloque de negocio. |
| Tabs/filtros | `ViewTabs`, `SelectCustom`, `SearchField`, period chips sobre `SegmentedField`. | Anclas de Configuración y steps de registro tienen semántica de navegación/progreso distinta: no convertirlos en tabs sólo por forma. |
| Feedback | `notify`/centro de notificaciones para resultados globales; `Aviso`, error inline y bloques comunes según contexto. | Muchos `setNotice/setError` manuales; deben mantener `role=status/alert` y borrador. Mensaje de correo aceptado, guardado persistido y fallo de refresco no son el mismo estado. |

## Validaciones y contratos: divergencias verificadas

Estos valores describen el snapshot, no definen reglas nuevas. El anexo de
contratos coordina la resolución; una migración puramente visual no debe elegir
silenciosamente el mayor, el menor ni la máscara de otro flujo.

| Campo / fuente | UI observada | API / diferencia |
| --- | --- | --- |
| Empresa general, `suite.tsx:173` | Nombre120; razón social160; RUC60 texto libre; domicilio400; teléfono por `PhoneField`. | `backend/agency-suite.js:279` acepta nombre160, razón160, tax_id60, dirección400 y teléfono normalizado. UI corta nombres que API permite. RUC de empresa no usa el lookup/confirmación del cliente. |
| Perfil legal, `company-legal-profile.tsx:8` | Ciudad/departamento/representante/cargo120; documento80. | `backend/contracts.js:99`: textos160 y documento60. El documento puede pasar el HTML y fallar al guardar; los demás campos restringen más que API. Confirmado con auditor de contratos. |
| Email compartido, `email-field.tsx:24` | HTML `maxLength=200`; sugerencias por dominio. | `field-rules.ts:15` y APIs auth/portal admiten254. No ampliar automáticamente todos los endpoints, pero no describir200 como regla backend. |
| Sugerencias email | `listId` depende de `id`; varias páginas auth usan `EmailField` sin id. | Si hay sugerencias y falta id, se genera `id=""`/`list=""`. Revisar asociación datalist y unicidad al consolidar; no atribuir selección/autocompletado confiable a una sugerencia de dominio. |
| Nombre en Mi perfil/Equipo | `Field` sin límite explícito en `my-profile.tsx:75` y `team-person-sheet.tsx:45`. | `backend/productivity.js:76` valida nombre2..120. Editor genérico no agrega ese máximo al esquema; `maxLength` ausente tampoco lo impone al input. Error puede aparecer sólo como resumen del API. |
| Nueva empresa/registro | NewCompany omite límites explícitos de nombre/slug; registro usa TextField160 para agencia y120 para nombre personal. | Son contratos de creación y no la edición del perfil. No inventar apellido obligatorio, separar nombre por palabras ni deducir slug/RUC como identidad personal. |
| Contraseña | `PasswordField` máximo128, mínimo configurable; alta nueva mínimo8, login/resolve legacy no lo fuerza. Destrucción tiene password nativo con ref. | `password-access.js` valida8..128 para **nueva** contraseña; login compara credencial existente. Reutilizar input no autoriza imponer política nueva al login o reauth. |
| Fechas/instantes | Perfil usa date, admin usa date y datetime-local; `asuncionInput/subscriptionExpiry` convierten hora civil de Asunción. | Fecha civil de empleo no es instante UTC ni fecha de facturación. Mantener conversión del consumidor, rangos/vigencias e inválidos sin convertir por un Date genérico en la UI. |
| Cotización y economía | Cotización valida entero1000..100000 en `suite.tsx:186`; remuneración usa amount+currency; cupones cambian entre fijo/porcentaje/días. | Son magnitudes distintas. Historial económico con motivo, vigencia, revisión e idempotencia vive en su contrato propio, no en AmountInput ni en un parser de porcentaje. |

`Editor` genera esquema con requerido, email/teléfono, entero y validador
específico (`operations.tsx:124`); no aplica automáticamente `Field.maxLength`
al esquema Zod. Su renderer sí pasa maxLength a inputs nativos. La diferencia
entre límite HTML y validación del esquema debe figurar en el contrato tipado.
El catch del guardado (`operations.tsx:219`) coloca mensaje general, sin mapear
un objeto de errores backend por campo: eso queda pendiente de diseño con los
DTO de error existentes, no de adivinar el campo desde el texto del mensaje.

## Estado/borrador/foco: diferencias que requieren aceptación explícita

- Editor tiene lock sincrónico `saving.current`, conserva valores en catch,
  abre la sección con errores y se integra con dirty/pending del Dialog.
  `CompanyLegalProfile` añade un botón de recarga que avisa que descarta edición;
  no reemplazarlo por reset automático al recibir cualquier fetch.
- `PersonSheet` conserva pestañas ya visitadas montadas/ocultas; no monta salario
  no autorizado. Un render de sólo la pestaña activa perdería borradores.
- `TeamPersonSheet.AccessTab` guarda draft manual y envía compare-and-set; un 409
  no debe vaciar selectores. No traducir active laboral a active de membresía.
- Registro tiene ref contra submit repetido; recuperación de cierre y login del
  portal usan `setBusy`/disabled sin el mismo guard sincrónico visible. Es una
  diferencia pendiente de probar, no un doble envío ya reproducido en esta auditoría.
- CompanySettings/CompanySelector bloquean mutaciones y completan navegación
  tras cambiar sesión incluso si el componente se desmonta. No abortar ese paso
  porque el contenedor visual haya cerrado.
- Forms manuales en dialogs de admin no muestran todos el registro dirty/pending
  de Editor/SaveActions. Antes de migrar, verificar Escape/backdrop/cerrar con nota,
  motivo o cambio sin guardar; usar Dialog común no prueba por sí solo ese contrato.
- MyProfile diferencia guardado persistido y fallo posterior de refresco; copiar
  un patrón `save→reload` que transforma todo en error duplicaría intentos ya guardados.
- Destrucción posee refs explícitos de password/código/Google/challenge/refresh y
  expiración. El campo base debe admitir ese foco; sustituirlo por un wrapper sin
  ref o limpiar estado por un cambio visual rompería la recuperación segura.

## Lógica que queda obligatoriamente en Scale

1. Capabilities/roles de empresa y rol global, matrices de overrides, dueños,
   último dueño, propio acceso, revocación de sesiones y validación por API.
2. Organizaciones elegibles/default/cambio de sesión, exclusión de demos,
   identidad global versus ficha laboral y portal versus panel interno.
3. Login, resolución de identidad existente, verificación de correo, invitaciones,
   OAuth, reauth, recuperación, tickets y presupuestos antiabuso.
4. Guardados separados de perfil/acceso/remuneración; salario visible sólo con
   permiso y sin consultas/valores salariales en un modo de ficha no autorizado.
5. Trial, suscripción, moneda acordada, cupones, gracia, pagos, cotización y
   auditoría; vigencia/revisión/requestId de cambios económicos.
6. Preview destructivo, prueba de identidad reciente, texto del servidor, TTL,
   retención fiscal, evidencia y borrado. El primitivo sólo controla presentación.
7. PDP/finalidad/consentimientos/SLA/supresión y restricciones de contacto.
8. Fuentes RUC/ciudades, confirmación de aplicación y prevención de duplicados;
   ninguna sugerencia visual obtiene autoridad para sobrescribir datos manuales.
9. Audiencias/publicación/mantenimiento, transiciones de reportes y métricas
   globales; datos bancarios y endpoints específicos fuera del catálogo UI.

## Migración posterior propuesta y excepciones

Primero acordar con los otros anexos la API de campo/errores, selección de valor,
acción, Button y tokens. Después migrar por consumidores completos: empresa y
legal; perfil/equipo; filtros y editores admin; finalmente auth/reauth/portal,
que conservan sus máquinas de estado. Ninguna fase empieza con buscar un
reemplazo externo. Preservar servicios/DTO, valores actuales y handlers de negocio.

Excepciones justificadas: carcasa PersonSheet por modo; preview/reauth destructivo;
marca/enlace de proveedor; selector que cambia de empresa; fecha civil frente a
instante; divulgaciones/anclas frente a tabs; logo corporativo frente a persona;
varios guardados de una ficha por permisos y contratos. La justificación permite
composición sobre bases comunes, no duplicar el estilo de controles internos.

Pendientes de aceptación para la fase de implementación: resolver divergencias
120/160, 60/80, 200/254 por endpoint; definir refs/ARIA/errores tipados; acordar
conservación de borrador en formularios manuales; consolidar CSS y tamaños sin
eliminar variantes justificadas. `company-legal-profile.css` usa padding/gap16 y
mínimo44; `company-settings.css` mezcla tokens con32/36/44 y fallback de color;
`settings-slice.css` repite radios14 y separaciones; MyProfile/Admin/Portal tienen
Tailwind/CSS propios. Son puntos de migración, no evidencia de contraste aprobado.

La siguiente fase debe ejecutar pruebas focales de permisos, borrador/foco,
error409/429, doble submit, campos con límites, calendarios/instantes, dinero,
selector/menú y evidencia claro/oscuro/contraste/responsive, además de gates del
integrador. Aquí sólo se ejecutaron búsquedas `rg`, lectura de imports/JSX,
contratos relevantes y revisión del diff documental; ningún test nuevo ni build.
