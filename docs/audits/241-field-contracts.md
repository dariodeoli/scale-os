# #241 · Contratos de campos de Scale OS

Auditoría estática de la aplicación local en `17fb189e`, con revisión puntual de importes enteros en `11a71500` (candidato de entrega191). Complementa [el inventario de componentes](241-ui-components.md). Este documento registra el comportamiento encontrado; **no introduce reglas nuevas ni declara completada la unificación**. No se consultó el repositorio, web ni código distribuido de OwnCoding UI: sus imports locales se describen como dependencias existentes, sin inferir su implementación.

## 1. Fuentes y alcance

Se contrastaron frontend, handlers y migraciones, porque `backend/schema.sql` es una base histórica y no representa por sí sola el esquema actual. Se inspeccionaron alta/edición de clientes, Mi empresa, perfil/equipo, registro/acceso/portal, contratos, presupuestos/planes, finanzas, tareas y reservas.

Fuentes primarias:

- [Validación API compartida](../../backend/suite-validation.js), [campos frontend](../../app/field-rules.ts), [Editor](../../app/operations.tsx), [controles adaptados](../../app/profile-controls.tsx).
- [Alta de clientes](../../backend/agency-core.js), [PATCH/settings/presupuestos](../../backend/agency-suite.js), [campos/payloads de cliente](../../app/client-editor-data.ts), [formulario de empresa](../../app/suite.tsx).
- [Perfil/equipo API](../../backend/operations.js), [identidad personal](../../backend/productivity.js), [identidad global DB](../../backend/migrations/20260910_global_identity.sql).
- [Registro email](../../backend/email-password-auth.js), [política de contraseña](../../backend/password-access.js), [cuentas existentes](../../backend/existing-account.js), [registro de agencia](../../backend/trial-registration.js), [portal](../../backend/client-portal.js).
- [RUC API y adaptadores](../../backend/ruc-lookup.js), [consulta/confirmación cliente](../../app/client-ruc.tsx).
- [Datos legales de cliente DB](../../backend/migrations/20261017_client_legal_profile.sql), [contratos DB](../../backend/migrations/20261017_contract_documents.sql), [representante vinculado](../../backend/migrations/20261017_client_representative_link.sql), [contratos API](../../backend/contracts.js).
- [Tesorería](../../backend/finance-treasury.js), [gastos reales](../../backend/finance-controls.js), [historial salarial](../../backend/economic-history.js), [previsión](../../backend/forecast.js), [condiciones comerciales](../../backend/reports.js).

No hay recuentos de JSX en este informe: pertenecen al inventario UI complementario.

## 2. Matriz de contrato por campo

Los máximos JS/HTML se expresan en unidades de `String.length`/`maxlength`, no en bytes. En SQL, `text` no implica un máximo de longitud; cuando no existe `CHECK`, el límite reside en el API, no en la columna.

| Campo/modelo | API y normalización encontrada | Modelo DB y vacío | Frontend y diferencia que debe conservarse o resolverse |
| --- | --- | --- | --- |
| Nombre de cliente | `agency-core` alta y `agency-suite` PATCH: `text(...,120)`, mínimo 2 tras `trim` | `agency_clients.name text NOT NULL`; sin límite SQL de 120 | `clientFields`: `maxLength:120`, `nameError` mínimo 2. No imponer reglas de nombres de persona a una empresa |
| Nombre de empresa | `trialDetailsFromInput`: 2–160 tras trim, rechaza controles U+0000–001F/007F; settings: `text(...,160)` y mínimo 2 | `organizations.name text NOT NULL`; no dividir en persona/nombre/apellido | Settings usa HTML120; registro y API permiten160. Moneda del alta de agencia sólo PYG/USD; settings permite las seis |
| Nombre completo de persona | Perfil/productividad y colaborador: `text(...,120)`, mínimo2. Registro email `nameOf`: opcional, trim, colapsa espacios, máximo160 y rechaza controles. `registerTrial` recorta nombre externo a120 y usa correo como fallback | `agency_collaborators.full_name text NOT NULL`; `user_personal_identities.full_name` tiene CHECK de longitud trim2–120. El perfil local y la identidad global se sincronizan por triggers | Registro muestra «Nombre y apellido» en **un único** `full_name`, HTML120. Mi perfil/equipo no siempre declaran `maxLength` en su configuración `Editor`. No convertir el recorte160→120 en una regla de UI sin revisar el flujo |
| Nombre/apellido separados | No se localizaron `first_name`, `last_name` o `surname` persistidos ni contratos de API separados. El `firstName` del saludo se deriva con `split` y es sólo presentación | No hay modelo separado identificado en el alcance inspeccionado | No deducir apellidos desde el último token ni crear persistencia nueva durante la consolidación. `normalizarNombre(...,{apellidosPrimero:'sifen'})` se usa específicamente para resultado RUC, no para todo nombre escrito |
| Razón social / representante | Cliente `legal_name`:160; representante cliente:160 en `clientLegalProfile`; representante de Mi empresa:160 vía `contracts.clean` | `legal_name` cliente nullable; representante cliente/empresa `text NOT NULL DEFAULT ''`. El checkbox de representante vincula nombres según `legal_name || name`, **no documentos ni cargo** | Cliente permite160 para ambos. Empresa limita representante120. Mantener representante manual independiente cuando checkbox está desmarcado; no aplicar title-case universal a razones sociales |
| Email | `suite-validation.email`: vacío falsy→null, texto máximo254 antes de trim, lowercase, regex `^\S+@\S+\.\S+$`. Registro `emailOf` hace trim/lowercase antes de medir254 y exige valor. Recuperación no comparte exactamente ese máximo | `users.email UNIQUE NOT NULL`; email cliente/colaborador nullable; portal usa también `email_normalized`. Un correo de contacto de cliente no es por sí mismo una identidad autenticada | `emailValid` mide trim≤254, pero **EmailField tiene HTML maxLength200**. Sugiere dominios mediante datalist; sugerencia no verifica existencia ni autoridad de la cuenta. El regex compartido no equivale a validación RFC ni garantiza un único `@` (sus grupos `\S+` también lo admiten). `.invalid` de demos se oculta para presentación mediante `technicalEmail` |
| Contraseña nueva | `validatePassword`: string8–128; rechaza lista de comunes y contraseña que contiene local-part del email si éste mide≥4. No exige mayúscula/número/símbolo. No hace trim ni cambia mayúsculas del secreto | Se persiste `password_hash`, no contraseña en claro; bcrypt con coste12 en alta/reset. No interpretar longitud del hash como límite de entrada | `PasswordField`: máximo128 por defecto, mínimo configurable; registro exige confirmación. **Login/comparación no debe heredar automáticamente validación de contraseña nueva**, porque verifica credenciales existentes. Invitación administrativa en `agency-core` tiene validación local distinta (mínimo8 si password presente) |
| Teléfono | `phone`: null/undefined/''→null; raw string≤50, extrae dígitos, elimina ceros iniciales de parte nacional; default595; guarda `+<código> <nacional>`. PY:8 o9; otros:6–12. Códigos API:595/598/54/55/56/57/51/52/591/1/34/351 | Columnas de contacto son `text` nullable, sin restricción SQL de longitud/formato. PATCH de teléfono sólo normaliza cuando viene la clave; preserva valor previo si se omite | UI selector sólo595/55/54/1/34; `phoneNational` recorta a12 y elimina ceros; input HTML18. `PhoneField` cambia código no ofrecido a595 al representarlo: riesgo de alterar números API válidos al abrir/guardar. No unificar ocultando países o normalizando silenciosamente legados |
| RUC | Ficha cliente: texto≤60 + detección de duplicados por dígitos en tenant. Lookup general normaliza puntos/espacios y acepta base3–12 con DV opcional de un dígito. Adaptador OwnData tiene otra validación, detallada abajo | `tax_id text` nullable en cliente, sin CHECK general de formato. Comparación de duplicados quita no-dígitos; no hay una regla universal de DV en la columna | Cliente `maxLength14`, valida con imports `normalizeTaxId/taxIdValid`; comentario local declara base5–8 y DV opcional. Payload normaliza antes de enviar. Mi empresa usa texto60 y no este validador ni lookup. **No tratar esas tres reglas como equivalentes** |
| Dirección | Cliente legal y settings empresa: `text(...,400)` | Cliente `address text NOT NULL DEFAULT ''`; settings dirección `text` opcional | Ambos formularios400. No hay validación postal/geocodificación ni campos calle/número separados acreditados |
| Ciudad / departamento | Cliente: `text(...,120)`, null explícito→'' en perfil legal. Empresa `contracts.clean`:160 cada uno | Texto no nulo con default''; sin FK ciudad→departamento y sin catálogo en migraciones inspeccionadas | Ambos formularios HTML120. Son **texto libre**, no selectores conectados ni autocompletado geográfico. No hay país asociado a esos campos de domicilio ni evidencia local de relación para rellenar departamento |
| Documento personal / representante | Cliente `document_number` y `legal_representative_document`:80; documento representante empresa:60 vía `contracts.clean`. Tipo cliente enum `''/ci/ruc/passport/other`; party_type `''/person/company` | Textos no nulos/default'' y CHECK de enums. Tipo de parte/documento es declaración, no inferencia del RUC | Cliente documento80 coincide; **empresa input80/API60**:61–80 se pueden escribir pero el API los rechaza. No reutilizar `tax_id` como documento genérico ni deducir persona física/jurídica desde el número |
| Fecha civil | `date`: falsy→null; exige YYYY-MM-DD y round-trip ISO exacto; rechaza día inexistente. ForecastMonth: YYYY-MM y años1900–9998. Otros handlers imponen límites propios de negocio | `date`, nullable según entidad: inicio/fin de proyecto/empleo opcionales, fecha de cobro efectiva obligatoria o default de negocio. Un mes se representa como día01 en varios modelos | `Editor` renderiza `type=date`, sin validador de fecha compartido en su schema Zod; `client-editor-data.isDate` verifica regex+Date.parse, menos estricto que round-trip API. No convertir automáticamente fecha civil en instante UTC |
| Hora / fecha-hora | `taskTime`: null/''→null; HH:mm con00–23/00–59. `studioTimestamp`: ISO con zona Z/offset obligatoria, segundos opcionales, milisegundos1–3, valida día real y devuelve UTC ISO; reserva exige fin>inicio y duración≤366días | Hora de tarea y fechas civiles son conceptos distintos de `timestamptz` de reservas. Distinguir hora local sin fecha de instante absoluto | `Editor` tiene `type=time`; OPS usa `opsUtcTime`/`opsLocalTime` y zona America/Asuncion,24h. No hay en `Field.type` un control genérico datetime-local; reservas usan su propio flujo. No reemplazarlo por parseo en zona del navegador |
| Dinero / moneda | Véase matriz monetaria específica. No hay un único contrato numérico en todos los endpoints | `numeric(14,2)` en cuentas/facturas/cobros; gastos reales y mensual explícito actuales `numeric(22,2)`; previsiones/recurrencia y ajustes conservan enteros en sus modelos | PYG sin decimales y otras monedas2 en dinero real; existen transportes **enteros para todas las monedas** en previsión. No migrarlos a decimal por cambiar el input visual |
| Porcentaje | Probabilidad lead: entero0–100; stage won/lost fuerza100/0. Comisión reporting: entero positivo≤100. Descuento lifecycle: decimal>0 y≤100, tipo none implica0; IVA presupuesto: ratio `0/.05/.1`, no porcentaje0/5/10 en transporte | Probabilidad `smallint`; tasas/valores de descuento son columnas numéricas con CHECKs por modelo | No existe una sola semántica de `PercentageField`: distinguir entero, decimal y ratio, cero permitido y modalidad. `decimalInput` limpia/trunca a2 decimales; no representa límite de100 ni precisión de toda tasa |
| Código postal | No se localizó campo persistido, DTO, validación o endpoint postal en app/backend inspeccionados | **Sin contrato acreditado**; ausencia de evidencia no habilita agregar columna ni declarar máximo5/8/10 | No crear ZIP obligatorio o máscara de otro país como parte de la consolidación. Requiere definir entidad, país, fuente y contrato antes de implementación |
| Notas / observaciones | General `text` máximo2000 y trim; gastos planificados `note`≤1000; motivos de cierre/reversión≤500 y mínimo5; motivo salarial/comercial≤1000 y mínimo5; comentarios de tareas≤2000 | Varias columnas text nullable; perfiles legales usan''; comments de tareas CHECK trim1–2000. Los vacíos no se almacenan igual en todas las entidades | Cliente textarea2000; varios formularios genéricos no declaran maxLength; atributos HTML no son schema Zod. No imponer2000 a motivos de500, ni truncar texto legal/plantilla a tamaño de observación |

### Semántica transversal de texto y vacío

[`text(v,max)`](../../backend/suite-validation.js#L3) primero comprueba tipo/longitud **antes** de trim. No colapsa espacios internos, no normaliza mayúsculas, no prohíbe controles por sí sola. Por eso `nombre120 + espacio` puede rechazarse antes de recortar. `nameOf` de registro sí colapsa espacios y prohíbe controles. No son normalizadores intercambiables. `contracts.clean` añade rechazo de controles (permite tab/saltos de línea), y los cuerpos de plantilla tienen máximo60000 frente a4000 por variable; no heredan el límite de2000 de notas.

`undefined` en PATCH suele significar «conservar», `null` puede significar borrar, y `''` es un valor persistido en perfiles legales. No transformar indiscriminadamente las tres representaciones. Ejemplos:

- [ClientPatchPayload](../../app/client-editor-data.ts) emite sólo claves cambiadas; los legales convierten null a''; nombre/razón social se trimmean.
- Settings y teléfono preservan claves omitidas. Sin embargo [PATCH cliente](../../backend/agency-suite.js) vuelve a validar nombre/email/RUC/razón social del objeto combinado; la conservación de un legado inválido **no es uniforme** aunque no se haya editado ese campo.
- Enmascarado por rol puede devolver null aunque haya dato reservado en DB. Nunca interpretar ese null como orden de borrado al guardar otro campo.

## 3. RUC: fuentes y comportamiento acreditado

### Tres fronteras distintas

1. **Componente consumidor local**: `app/client-ruc.tsx` y `client-editor-data.ts` llaman imports ya existentes de OwnCoding (`normalizeTaxId`, `taxIdValid`, `MENSAJE_RUC`). La regla5–8 es un comentario local, no una verificación nueva de la implementación externa. Los tests locales acreditan pegado `80.168.807-8`→`80168807-8`, consulta sin DV `80168807` y bloqueo antes de enviar un RUC inválido. No se consultó OwnCoding para ampliar esa evidencia.
2. **Lookup general / backend de fichas**: `normalizeRuc` elimina puntos/espacios y usa `^\d{3,12}(?:-\d)?$`. No calcula ni exige DV para toda consulta. `assertUniqueClientRuc` compara dígitos dentro de la empresa y devuelve409 si ya existe. El handler pasa el RUC original ya validado a INSERT/PATCH: **el API no garantiza guardar normalizado en todos los caminos**, aunque el frontend canónico sí envía normalizado.
3. **Adaptador OwnData**: `validateOwnDataRuc` exige base1–9, sin cero inicial, DV opcional; si llega DV calcula módulo11 con pesos2–11. Es una restricción del adaptador existente, no una nueva regla universal de Scale. La validación general previa todavía limita la consulta efectiva; no equiparar los regex de cada capa.

### Proveedores y procedencia

[`rucLookupConfig`](../../backend/ruc-lookup.js) conserva `RUC_LOOKUP_PROVIDER_KIND=legacy` como valor predeterminado. El proveedor legacy predeterminado es `https://ruc.sun.com.py/api/ruc`. OwnData sólo se selecciona mediante configuración explícita; exige endpoint `https://app.controlaria.online/api/v1/ruc`, credencial de servidor y autorización empresarial. No se inspeccionaron valores de variables, credenciales ni disponibilidad de proveedores; **no se afirma cuál está habilitado o probado en producción**.

El adaptador OwnData comprueba `meta.provenance.source='dnit_official_snapshot'`, fecha de publicación, fullRuc/base/DV y coincidencia con la consulta. El registro interno marca procedencia `owndata:dnit_official_snapshot`; legacy marca `ruc-provider`. La respuesta normalizada de Scale contiene **name, tax_id, tax_state, source, publication_date**. No contiene dirección, ciudad, departamento, teléfono ni email: no hay evidencia para prometer su autocompletado desde esta integración.

### Aplicación, errores y cupos

- Consulta de cliente es de lectura; `RucConfirmCard` pide **Aplicar/Descartar**. Aplicar modifica RUC y razón social del borrador, sin sustituir nombre comercial ni estado/saldo. El proveedor puede entregar nombre en mayúsculas/apellidos primero; sólo este adaptador aplica normalización específica SIFEN del nombre.
- `ruc-refresh` exige `apply:true` para persistir `ruc_legal_name/ruc_tax_state/ruc_source/ruc_refreshed_at`. Eso es distinto de sobreescribir `legal_name` manual.
- Consulta sin resultado entrega `{record:null}` y la UI ofrece carga manual. Formato inválido400, duplicado409, límite429, indisponibilidad/procedencia inválida503; el proveedor externo también puede rechazar DV o autorización. No convertir «sin resultado» en fallo general ni borrar el valor escrito.
- API protege por rol y demo; límite local40 por usuario/15min antes de caché para consulta/refresh normales (`from-ruc` tiene una rama propia), límite mensual configurado (default100, máximo100), caché positiva default24h y negativa1h. Son políticas de integración/API, no props de una biblioteca visual.

## 4. Ciudad, departamento y código postal

La búsqueda local de `city/cities/department/postal_code/zip_code/ciudades/código postal` encontró domicilios legales y texto manual; no identificó catálogo de ciudades, ruta de consulta, identificador geográfico, FK departamento-ciudad ni fuente de autocompletado geográfico. Nombres en semillas de demo son ejemplos sintéticos, **no un catálogo**.

Una futura UI puede compartir el control visual de selección/búsqueda, pero necesita primero una fuente real y un contrato propio para identificar ciudad/país/departamento y gestionar selección manual. No deducir departamento desde un string de ciudad ni prometer esa relación basándose en una biblioteca externa no auditada.

## 5. Dinero: contratos que no deben mezclarse

| Contexto | Transporte/regla existente | Evidencia y consecuencia para la biblioteca |
| --- | --- | --- |
| Valor real y presentación | Seis monedas: PYG/USD/EUR/BRL/ARS/MXN; PYG0 decimales, otras2. `finance-money.ts` suma/resta con BigInt y valida escala por moneda. `money-format.ts` preserva strings monetarios válidos con BigInt, mantiene fallback Number para otras entradas | [Frontend exacto](../../app/finance-money.ts), [formato](../../app/money-format.ts). El componente recibe string normalizado; no hacer aritmética ni convertir monedas |
| Gasto real | `expenseAmount`: string/number positivo, máximo999999999999, hasta2 decimales; PYG exige centavos0; rechaza3 decimales. DB actualnumeric22,2 preserva bigint históricos | [API](../../backend/finance-controls.js), [migración](../../backend/migrations/20261017_expense_currency_precision.sql). Crear/revertir conserva importe; UI gasto real difiere de gasto planificado |
| Salario mensual explícito | Nueva API salary-history acepta cero, máximo999999999999, hasta2 decimales y PYG entero; monto mensual explícito tiene prioridad sobre fee/modalidad. Desde `de455f7e`, el tipo fixed sincroniza importe/moneda de compensación y mensual al cambiar desde Balance; variable/hourly/per_project mantienen fee independiente. PATCH de Equipo fixed sincroniza mensual existente ante cambio económico sin claves mensuales explícitas; contacto-only no crea evento. Otra ruta histórica de ficha (`monthlySalary`) sigue validando enteros; null borra mensual opcional | [Historial](../../backend/economic-history.js), [ficha](../../backend/operations.js), [migración](../../backend/migrations/20261018_economic_history.sql). No unificar ignorando diferencias de endpoint ni alterar fee al cambiar mensual |
| Cobro/deuda/apertura/aplicación | `finance-treasury.positive` usa `amount` compartido y luego exige>0; ese helper convierte con Number y redondea2; no recibe currency. Sus guards concilian cuenta/deuda/tenant pero no aportan una regla global de enteroPYG | [Tesorería](../../backend/finance-treasury.js), [guards DB](../../backend/migrations/20261017_finance_periods_receipts.sql). La UI es más estricta por moneda; no afirmar que todos los API monetarios rechazan fracciónPYG o más de2 antes de redondear |
| Plan/previsión/gasto planificado | `reports.wholeAmount` exige entero positivo seguro≤999999999999 para todas las monedas. `forecast.wholeMoney` proyecta y redondea fuentes decimales para transporte entero, sin cambiar el registro fuente | [Reporting](../../backend/reports.js), [forecast](../../backend/forecast.js), [transporte entero frontend](../../app/amount-format.ts). Una variante `integerOnly` aquí es de dominio, no una inferencia desde USD/PYG |
| Ajuste salarial mensual | Entero **con signo**, distinto0, valor absoluto≤999999999999; nota≤1000 | [Operations](../../backend/operations.js), [DB firmado](../../backend/migrations/20260915_salary_override_signed.sql). Reutilizar sólo input positivo rompería descuentos |
| Presupuesto/ítems | Helper `amount` admite0; quantity>0 y≤999999; máximo100 ítems, descripción500; producto total también pasa por amount. IVA ratio0/.05/.1 | [Validadores](../../backend/suite-validation.js), [presupuestos](../../backend/agency-suite.js). Cantidad no es dinero ni porcentaje |

`AmountInput` local es adaptador ya existente sobre `MoneyInput`. `integerOnly` existe como prop local; Editor todavía no pasa esa bandera a AmountInput. En `17fb189e`, `Field.integer` sólo validaba regex de dígitos; **`11a71500` corrige específicamente dinero entero**: acepta ceros decimales de presentación y normaliza antes del `save`, conservando el rechazo de centavos reales. No debe diagnosticarse ya `1000.00` como fracción inválida en ese flujo. Cantidades/porcentajes enteros siguen usando su regla de dígitos.

`app/amount-format.ts` conserva funciones de normalización locales con heurísticas de separadores (`1.234`/`1,234` se interpretan como miles); el adaptador visible delega a un control importado. No asumir que esos helpers y el control tienen idéntica semántica sólo por el nombre. Los tests existentes de pegado/caret son la evidencia reutilizable.

La revisión funcional posterior de #238 detectó divergencia entre Equipo (`compensation_amount`) y Balance (`monthly_salary_amount`) para fijos. El fix `de455f7e` resuelve ambos caminos en backend y conserva acuerdos anteriores/futuros; no agrega una normalización visual que oculte valores distintos. También ordena revisiones de ambos historiales por id bigint, evitando que un alias textual coloque9 antes de10. Esta corrección puntual pertenece a #238, no a la unificación de controles #241.

### Revisión puntual de dinero entero · `11a71500`

[El helper `normalizeWholeMoney`](../../app/amount-format.ts) distingue un importe entero de su presentación con ceros decimales. Acepta string/number no negativo representable como entero seguro y únicamente sufijo `.0` o `.00`: `1000`, `1000.0` y `1000.00` producen el string canónico `1000`. `1000.25`, `1000.000`, negativos, notación exponencial en el string, espacios y ceros iniciales no canónicos se rechazan; no se redondean ni se eliminan centavos reales. Requerido/cero/positivo siguen dependiendo del consumidor.

Cambios de consumidores en ese commit:

- `Editor`: usa el helper sólo si `type='money' && integer`; normaliza el valor antes de entregar `save`. `type='number' && integer` mantiene regex de dígitos y los campos monetarios decimales no pasan por este helper.
- [ClientEditor](../../app/client-editor-data.ts): normaliza defaults del plan y `planTermsPayload` antes de enviar `recurringAmount`; conserva inválidos reales para que se rechacen, en vez de truncarlos.
- [ClientReporting](../../app/client-reporting-data.ts): aplica el mismo helper para defaults/payload del plan, evitando diferencias entre los dos editores.
- Los contratos backend de importe recurrente y gasto planificado siguen siendo enteros. Esto no habilita `1000.25` en planes/previsión ni altera cobros/gastos reales USD con centavos.

Evidencia de código: commit `11a71500df5063adfff92b6c21855b07a897226e`, archivos anteriores y casos existentes ampliados en `tests/shared-editor.test.tsx`, `tests/client-editor-184.test.tsx` y `tests/client-reporting.test.tsx`. Esta actualización documental se verificó leyendo el diff; no repitió esas suites.

## 6. Fechas, horas y errores de formulario

- [`business-time`](../../backend/business-time.js) distingue `zoneDate/zoneToday` de `civilDate` y usa America/Asuncion. Convertir `date` por `new Date(...).toISOString()` indiscriminadamente puede cambiar el día con otro driver/zona.
- [`ops-time`](../../app/ops-time.ts) convierte hora civil a UTC con IANA y verifica round-trip; conserva24h. Reservas API exigen zona y calendario válido. `type=time` de tareas acepta hora sola, no un instante UTC.
- Pagos retroactivos, cierres/reaperturas, edición salarial y condiciones comerciales tienen reglas de vigencia y revisiones. El input de fecha comparte presentación; su `min/max` y errores de negocio provienen del consumidor. Fecha de vencimiento, promesa de cobro, fecha de caja e inicio/vigencia contractual **son campos diferentes**, no defaults intercambiables.
- `Editor` crea Zod con requerido mínimo1, validación contextual de enteros (dinero con `normalizeWholeMoney` desde11a), email, teléfono y callbacks por campo. No aplica `.max(f.maxLength)`, trim general ni validación genérica de date/time. El `<form noValidate>` impide confiar en restricciones nativas como validación final; `maxLength` restringe escritura, no todos los valores programáticos.
- En error de `save`, conserva valores y muestra un error general; no implementa un mapa universal `backend.fieldErrors`→`setError(campo)`. El API suele entregar `{error:string}`; conflictos409 y cupos429 no son errores de formato de un input.
- La guardia `saving.current` previene doble submit local; formularios específicos conservan requestId/revisión para el API. No reemplazar esa idempotencia de negocio por un botón disabled. `form.reset` ocurre tras éxito, con opciones `resetOnSave`/«crear otro»; lookup genérico sí parchea valores, mientras el adaptador RUC agrega confirmación explícita.
- Los campos disabled siguen presentes en el schema del Editor. Un legado inválido o dato reservado podría validarse al guardar otra sección; requiere comprobar el caso de consumidor antes de migrar, no cambiar silenciosamente reglas.

## 7. Decisiones para una consolidación segura

1. Compartir controles y estados de error/foco/loading, pero recibir política de campo explícita: límite, requerido, valor vacío, parser/formatter y validador del dominio. No elegir el menor máximo observado para todas las entidades.
2. Mantener separados nombre de persona, nombre comercial, razón social y nombre de representante como conceptos; pueden compartir el mismo control base de texto.
3. Conservar PATCH de claves modificadas y no sobrescribir datos ocultos, provenientes de consulta o editados manualmente. Los resultados externos necesitan procedencia y confirmación del consumidor.
4. Resolver primero divergencias acreditadas: email200/254; países UI/API; representante/documento empresa; maxLength HTML sin schema; RUC de ficha/consulta/proveedor; formatos enteros frente a dinero real; validación de fecha parcial frente a API estricta.
5. Mantener en Scale roles, tenant, campos reservados, catálogos autorizados, cupos, endpoints, vigencias, CAS, fuentes RUC y cálculo monetario. La biblioteca interna sólo recibe valores/errores/callbacks y adaptadores explícitos.
6. Código postal y catálogo de ciudades quedan **sin regla definida**. No se recomiendan dependencias nuevas ni una integración geográfica supuesta.

## 8. Pruebas existentes reutilizables

Inventario de evidencia y rutas; **no se ejecutaron estas suites para esta auditoría documental** y no se agregaron tests.

| Prueba existente | Contrato que conviene conservar al migrar |
| --- | --- |
| [field-rules.test.ts](../../tests/field-rules.test.ts) | Teléfono PY fijo/móvil, normalización, países, nombres visibles, correos técnicos y limpieza decimal |
| [field-adoption.test.ts](../../tests/field-adoption.test.ts) | Consumidores de controles y normalización de nombres RUC; varios checks son de fuente y no sustituyen interacción real |
| [money-input.test.tsx](../../tests/money-input.test.tsx) | Campo monetario real, pegado, vacíos, separadores/caret y monedas |
| [client-editor-184.test.tsx](../../tests/client-editor-184.test.tsx) | Payloads alta/PATCH, RUC sinDV, confirmación Aplicar/Descartar, errores, representante vinculado |
| [registration-consent-e2e.test.tsx](../../tests/registration-consent-e2e.test.tsx), [registration-flow.test.mjs](../../tests/registration-flow.test.mjs), [password-panel.test.tsx](../../tests/password-panel.test.tsx) | Alta/acceso, consentimiento, preservación de estado y contraseñas |
| [test-ruc.mjs](../../backend/test-ruc.mjs) | Proveedores inyectados, caché/cupos, tenant, procedencia, DV OwnData y no sobrescritura manual |
| [test-agency-core-alta.mjs](../../backend/test-agency-core-alta.mjs), [test-operations.mjs](../../backend/test-operations.mjs), [test-contracts.mjs](../../backend/test-contracts.mjs) | Límites/API de cliente/persona, permisos/legados, perfiles legales y contratos inmutables |
| [test-email-password-auth.mjs](../../backend/test-email-password-auth.mjs), [test-trial-registration.mjs](../../backend/test-trial-registration.mjs), [test-existing-account.mjs](../../backend/test-existing-account.mjs) | Normalización de identidad, validación contextual, misma cuenta y límites de registro |
| [test-studio-reservations.mjs](../../backend/test-studio-reservations.mjs), [test-employee-tasks.mjs](../../backend/test-employee-tasks.mjs), [test-forecast.mjs](../../backend/test-forecast.mjs) | Horas/fechas, calendario civil, meses y validación monetaria de previsión |
| [test-expense-currency.mjs](../../backend/test-expense-currency.mjs), [test-expense-currency-postgres.mjs](../../backend/test-expense-currency-postgres.mjs), [test-economic-history.mjs](../../backend/test-economic-history.mjs) | Centavos, enterosPYG, valores históricos, revisión/idempotencia y vigencias |

Comandos reutilizables (requieren dependencias ya instaladas; no ejecutados en este trabajo):

```sh
./node_modules/.bin/tsx --test tests/field-rules.test.ts tests/money-input.test.tsx tests/client-editor-184.test.tsx
node backend/test-ruc.mjs
node backend/test-agency-core-alta.mjs
node backend/test-operations.mjs
node backend/test-contracts.mjs
node backend/test-economic-history.mjs
```

Antes de una implementación, ampliar casos sólo donde exista riesgo no cubierto: límites exactos200/254 y60/80; teléfono guardado con código permitido sólo por API; valores legados/ocultos al editar otro campo; fecha imposible y cambio de zona; porcentaje como ratio; RUC por proveedor; campo monetario enteroUSD frente a USD con centavos. Pruebas de foco/teclado/errores y browser siguen siendo necesarias en la fase de implementación; la lectura de código no las acredita.

## 9. Estado de esta entrega

Se entrega documentación basada en fuentes locales. No cambió producto, API, esquema, migraciones, dependencias ni datos; no se invocaron proveedores externos ni se probó producción. Queda para la siguiente fase acordar los contratos divergentes con sus consumidores y sólo después consolidar controles/biblioteca interna. La comparación o publicación en OwnCoding pertenece a una etapa posterior del pedido.
