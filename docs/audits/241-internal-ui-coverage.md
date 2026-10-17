# Cobertura interna y guard de arquitectura — #241

Alcance: código local de Scale, base `0c801fcb` más esta entrega. No se inspeccionaron fuentes externas de OwnCoding ni se evaluó su catálogo. La cobertura interna **no equivale a una migración completa de todos los objetos del producto**. Este documento complementa `241-field-contracts.md`, `241-ui-components.md` y el inventario de acciones de su agente dueño; no reemplaza ni duplica ese manifiesto.

## Fronteras que comprueba el guard

`node build-tools/check-ui-architecture.mjs` recorre con TypeScript AST los módulos locales de `app`, sus imports/exports y su grafo de dependencias runtime. No usa coincidencias de JSX para decidir el origen de un objeto.

- Las primitivas ya unificadas deben importarse de sus módulos locales. Reconoce nombres originales aunque el consumidor les ponga alias; tampoco admite namespace/default, `require` o import dinámico literal de OwnCoding como escape opaco.
- Permite por símbolo y archivo las fachadas explícitas `surface`, `collection`, `notice`, `navigation`, `amount` y `choice`. `ui-v2` conserva sus renderers legítimos `EmptyState`/`ErrorState`. Una fachada permitida no puede importar otra primitiva arbitraria.
- Las implementaciones no importan/reexportan el barrel `app/ui/index`, incluso mediante `@/app/ui` o imports de tipos. Los consumidores pueden usar la entrada selectiva; los componentes se componen por paths directos.
- Las bases de `app/ui`, excepto el barrel, y sus adaptadores de campos, Dialog/SaveActions, profile-controls y ui-v2 no importan los módulos de API/negocio identificados ni funciones de request explícitas y no ejecutan `fetch`, XHR, WebSocket o sendBeacon. Las consultas y autorizaciones se delegan a callbacks del consumidor.
- El barrel no usa wildcard ni exporta requests. El entry puro no importa ni reexporta `operations`, tampoco sus tipos. El editor de dominio vive en el entry separado `app/scale-ui.ts`, que sólo puede exponer `Editor` en runtime y sus tipos explícitos.
- Tarjan detecta componentes fuertemente conexas con al menos un módulo `app/ui`, incluidas las referencias a sí mismo. Los imports exclusivamente de tipos no generan ciclos runtime. No impone una reparación masiva de ciclos históricos sólo de negocio.

Los helpers públicos puros de OwnCoding y los imports de estilos existentes permanecen permitidos. El guard es una regla de arquitectura comprobable sobre módulos y llamadas reconocibles; **no es un sandbox ni un análisis completo de flujo dinámico**. Una dependencia nueva o un acceso indeterminado requiere revisión, no una afirmación de que el AST demuestra toda posible ausencia de I/O.

Las pruebas negativas de `tests/ui-architecture.test.mjs` cubren aliases, reexports, permisos de fachada por símbolo, accesos opacos, barrel con alias/tipos, imports API, llamadas de red, separación de entry puro/Scale y ciclos indirectos/tipos. El fragmento propio `95-ui-architecture-241.list` registra fixtures y guard vivo.

## Estado por familia

| Familia | Entrada/implementación local | Cobertura y límites reales |
| --- | --- | --- |
| Campos básicos y semánticos | `ui/input`, `field`, `input-control`; Text/Email/Password/Phone/SearchField | Bases nativas con ref/eventos y adaptadores explícitos; contratos y límites documentados por entidad. No inventa un formato universal de nombre, RUC, dirección o código postal. |
| Montos y números | `ui/amount`, `number` | MoneyInput existente detrás de fachada; porcentajes/ratios con política explícita. Las reglas de moneda y de cada operación siguen en el dominio. |
| Temporales | `ui/temporal`, `temporal-value` | Texto RAW, validación civil, selector staged con Aplicar/Cancelar, reloj 24 h; sin conversión de zona horaria. Evidencia independiente en `docs/qa/ui-temporal-241`. |
| Selección de opciones | `ui/select`, `options-select`, `profile-controls`, `entity-picker` | Motor local; adaptadores de selección conservan sus callbacks. Fuentes, permisos y cargas pertenecen al consumidor. |
| Botones y acciones | `ui/button`, `icon-action`; manifiesto separado | Motor local. En esta base todavía existen **14 bindings Button y 8 IconAction** externos, identificados por el guard estricto; su migración pertenece al agente de acciones. No se agrega una baseline que normalice esos bypasses. |
| Superficies y colecciones | `ui/surface`, `collection` | Reexports exactos CardSurface/DataTable; conservan renderers y tipos, sin crear otro motor de tarjetas/tablas. |
| Avisos y navegación | `ui/notice`, `navigation`; `ui-v2` | Fachadas y patrones locales. Una pestaña de navegación y un filtro segmentado conservan semánticas diferentes. |
| Checkbox y switch | `ui/choice` | Esta entrega agrega reexports exactos Checkbox/Switch y migra los **tres bindings** de `ia-carga`, `quote-composer` y `superadmin/maintenance`. No copia renderers ni cambia booleanos/callbacks/ref. |
| Checkbox nativo compuesto | `InputControl`/`InputBase`; `ui/select`, listas y formularios | Las casillas de selección masiva, checklists y consentimiento no son switches. Su estado nativo `checked` y eventos permanecen en la base compartida; el componente de consentimiento mantiene su propia finalidad/versión. No se fuerza un renderer visual nuevo para toda casilla. |
| Radio | `client-identity.tsx` + base nativa | El color usa radios reales con nombre/grupo, estado controlado y label visual específico. No existe una necesidad local acreditada de otro motor RadioGroup genérico. La base nativa cubre el control; el grupo/paleta sigue como composición de dominio. |
| Upload y fotos | `profile-photo`, `person-photo`, `photo-cropper`, `equipment-photo`; base file nativa | Son composiciones: validación/preparación de imagen, recorte opcional y persistencia por callback. `PersonPhotoField` reutiliza helpers de `profile-photo`; no equivale a un uploader genérico para cualquier documento. Unificar todos los uploads exigiría auditar contratos de archivo por operación. |
| Avatar e identidad (internos de Scale, sin promesa de portabilidad externa) | `FotoPerfil`, `PersonContainer`, `ActorIdentity`; `ClientLogo`, `EquipmentPhoto` | FotoPerfil es el objeto canónico existente; las composiciones distinguen persona, logo, inventario y autoría. No se incorpora un segundo Avatar externo ni se presupone que todas las identidades tienen la misma forma/contexto. |
| Toast | `feedback.notify` → `NotificationCenter` → `toast.css` | Emisor y renderer transitorio existentes, un solo evento de feedback. `notification-inbox` es una bandeja de notificaciones persistidas y no un toast duplicado. Las mutaciones y sus mensajes pertenecen al consumidor/adaptador de negocio. |
| Ciclo de formulario | `useSingleFlightSubmit`, `ui/form-state`, `form-focus`, `SaveActions`, `Dialog`, `Editor` | Bloqueo antes de validar, PendingFields, foco diferido y registro de dirty/pending. Los formularios se migran por flujos con pruebas; disponer de los helpers no demuestra que cualquier formulario futuro o heredado ya los use correctamente. |
| Banco/institución | `BancoCombobox` en `workspace-forms` | Excepción de dominio que carga/presenta un catálogo bancario y admite institución libre. No es una base Input/Selector que deba copiarse sin revisar su contrato. |
| Serial y otras presentaciones | SerialField/SerialTexto, FilaDato, progreso, skeletons y objetos especializados restantes | Fuera de las primitivas prohibidas en esta etapa. No se añadieron parsers ni políticas nuevas para declarar cobertura total. Los usos pendientes requieren un lote propio y evidencia, no una sustitución por nombre. |

## Ciclo real corregido

El primer guard encontró `Dialog → InputControl → Temporal → Dialog`: la confirmación textual importaba el router temporal, aunque sólo necesitaba texto. Esta entrega usa `InputBase` directamente en ese punto y conserva sus props. Así desaparece el ciclo sin duplicar el motor Dialog ni introducir una excepción en el guard.

## Evidencia y cierre

En el árbol de esta rama, los fixtures del guard y los componentes modificados se prueban por separado. El guard vivo de esta base queda deliberadamente rojo por los 22 imports Button/IconAction que el integrador está migrando y por los dos reexports de `operations` que está retirando del entry puro y por el import histórico de money desde operations en ui-v2 (también retirado por el integrador); después de aplicar esa entrega debe arrojar cero violaciones. El integrador ejecuta el fragmento95 sobre el árbol final y agrega su resultado a la evidencia de release.

No se presentan como hechas: la auditoría externa de OwnCoding, una biblioteca genérica de documentos/subidas, una normalización universal de datos o la migración de cada componente especializado. No se modificaron backend, schemas, endpoints, estilos globales, versiones ni despliegues.
