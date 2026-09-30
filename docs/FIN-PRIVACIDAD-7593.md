# Finanzas y Ley N° 7593/2025 — inventario, retención y derechos (FIN)

Sección del dominio **Finanzas** para el cumplimiento de la Ley N° 7593/2025
(protección de datos personales). Reglas canónicas: `owncoding-ui#8`; base
técnica y job: `#112` (PLT); aviso y superficies: `#113` (DSN). Este documento
es la fuente para el **RAT** y el handover del issue `#116`.

Fuentes ejecutables (no duplicar a mano):

- `app/finance-privacy.ts` — finalidades, datos, visibilidad y puntos de captura.
- `backend/finance-privacy.js` — retención, asientos que nunca se borran, export
  del titular y anonimización.
- Tests: `tests/finance-privacy.test.ts`, `backend/test-finance-privacy.mjs`,
  `backend/test-reports.mjs` (enmascarado por capacidad).

> Los plazos son un **borrador operativo**: el encuadre legal final de cada
> negocio lo valida su asesoría. Autoridad de control: ANPDP (MITIC).

## 1. Inventario de finalidades

| Dato personal (FIN) | Finalidad | Base legal | Retención | Quién lo ve | Captura |
| --- | --- | --- | --- | --- | --- |
| Nombre, correo y foto del colaborador; salario base; ajustes mensuales y su nota; día de pago; facturación del colaborador; egresos de pago | Previsión y pago de remuneraciones | Relación laboral/de servicios + obligación contable/fiscal | 10 años (borrador); la ficha se anonimiza al vencer | `salary.view` (montos por persona); `finance.view` ve solo agregados | Previsión · salario fijo y ajuste del mes |
| Importes, fechas y referencias de cobros/pagos; cuenta de salida; quién registró el movimiento | Cobros y pagos | Contrato + obligación contable/fiscal | 10 años; **cobros y egresos son asientos inmutables**: se conservan con acceso restringido y no se editan | `finance.view` (liquidación); `payments.manage` para registrar | Comisiones · registrar pago; Finanzas · cobros y transferencias |
| Beneficiario y colaborador vinculado a la comisión; importes, porcentaje y estado; notas del acuerdo; quién refirió (tercero); quién registró el egreso | Comisiones y referidos | Contrato de comisión + obligación contable/fiscal | 10 años; se anonimizan nombres y notas editables | `commissions.manage` | Comisiones · nueva comisión o referido; descuento por referido |
| Cliente facturado; montos, vencimientos y estado; notas del comprobante; referencia del cobro | Facturación y cobranza | Contrato + obligación fiscal/contable | 10 años; el comprobante no se borra y sus notas se anonimizan al vencer | `billing.view` (`invoices.manage` para emitir) | Ficha del cliente y términos comerciales; Finanzas · facturas |
| Indicadores agregados (sin identidad); gastos planificados por categoría | Informes y planificación | Interés legítimo de gestión; los informes se sirven agregados | 10 años los financieros; 5 años la planificación (no es registro contable) | `reports.view` | Informes · export CSV/PDF; Previsión · gastos planificados |
| Titular, institución y número de cuenta; custodio; referencias del extracto | Tesorería y conciliación | Contrato + obligación contable | 10 años las cuentas; 5 años los extractos (respaldo operativo) | `accounts.manage` | Finanzas · nueva cuenta y custodio; importar extracto |

## 2. Retención y anonimización (sin romper libros)

Política declarada en `backend/finance-privacy.js`
(`FINANCE_RETENTION_POLICY`, ventana fiscal/contable 10 años y respaldo 5):

1. **Nunca se borra** un asiento contable: `FINANCE_NEVER_DELETE` lista facturas,
   cobros y reversiones, egresos a personas, comisiones, gastos y reversiones,
   extractos conciliados, transferencias y términos comerciales. La supresión de
   un titular **bloquea o anonimiza**, jamás elimina.
2. `anonymizeFinanceSubject({organizationId, subjectType, subjectId})` —
   anonimización por titular (colaborador o cliente) para el procedimiento ARSOP:
   identificadores, notas y referencias editables fuera; importes, fechas y
   estados intactos. Idempotente.
3. `anonymizeExpiredFinanceData({asOf})` — barrido programado por antigüedad
   (lo consume el job de `#112`): notas de nómina, nombres/notas de comisiones,
   notas de facturas, referidos y referencias de extractos vencidos.
4. Casos especiales declarados:
   - **Cobros y egresos inmutables** (`sync_agency_payment` /
     `sync_agency_expense`): su referencia no se puede actualizar sin romper el
     guard contable; se conserva con acceso restringido y cualquier corrección
     exige una reversión autorizada.
   - **Extractos** sin vínculo a un titular: se anonimizan solo por antigüedad.
5. Fuera del alcance de FIN (pendiente `#112`): los snapshots PII de
   `agency_operation_audit` y la identidad de plataforma
   (`user_personal_identities`).

## 3. Acceso y minimización

- **Salarios**: ya enmascarados sin `salary.view` (API anula 5 campos y rechaza
  edición). Se mantiene.
- **Comisiones (nuevo)**: `/api/agency/clients/:id/commercial-terms` sirve
  destinatario, modo y valor en `null`/`none` —y sin el catálogo de
  destinatarios— a los roles sin `commissions.manage` (`management`, `sales`).
  Su PATCH de plan **preserva** la comisión vigente; un intento explícito de
  definirla o cambiarla responde 403. `owner`/`admin` (y `finance` para lectura)
  siguen viéndola.
- **Cuentas bancarias**: solo `accounts.manage` (owner/admin/finance), que es
  quienes operan transferencias y conciliación.
- **Documentos (RUC/CI)**: FIN no expone documentos de personas; el PDF de
  presupuesto lleva el RUC de la empresa, no del cliente.
- **Exportaciones**: el CSV/PDF de Informes es agregado y sin identidad
  (contrato fijado por tests); FIN no exporta listados de personas. Las listas
  con PII (cobros, pagos, comisiones, cuentas, mora) están gateadas por
  capacidad y auditadas al escribir.
- **Correos de operadores** en cobros/pagos: se mantienen como identidad de
  respaldo de quién registró el movimiento (necesidad operativa y de auditoría,
  mismo tenant).

## 4. Derechos del titular (parte financiera)

- **Acceso/portabilidad**: `financePersonalData` arma la parte financiera del
  export de `#112`: para un colaborador, ficha de remuneración, ajustes,
  comisiones y egresos; para un cliente, facturas, cobros (con reversión),
  términos vigentes y descuentos. Devuelve `null` si el titular no existe en la
  empresa. **No exporta** el nombre de quien refirió un descuento (dato de un
  tercero); la identidad de plataforma y la ficha comercial las aportan PLT y COM.
- **Supresión/bloqueo**: la vía es `anonymizeFinanceSubject` (por titular) o el
  barrido por antigüedad; nunca borra libros. SLA ≤30 días: lo gobierna la cola
  de solicitudes de `#112`.
- **Oposición**: FIN no envía comunicaciones automáticas a titulares; las
  notificaciones internas y la facturación son esenciales. El registro de
  oposición para mensajes no esenciales vive en la base de consentimientos de
  `#112` y aplica a las superficies de contacto (mora/WhatsApp del CRM).
- **Rectificación**: los montos y datos de contacto se corrigen en sus fichas
  (Equipo/Clientes) y quedan auditados; la corrección se propaga a previsión y
  facturación.

## 5. Transparencia en los puntos de captura

Cada diálogo de FIN que captura datos personales muestra la finalidad y enlaza
`/privacidad#<finalidad>` (ruta canónica que publica DSN en `#113`):

| Superficie | Finalidad | Ancla |
| --- | --- | --- |
| Previsión · salario fijo mensual | Previsión y pago de remuneraciones | `#payroll` |
| Previsión · ajuste del mes | Previsión y pago de remuneraciones | `#payroll` |
| Comisiones · nueva comisión o referido | Comisiones y referidos | `#commissions` |
| Comisiones · descuento por referido | Comisiones y referidos | `#commissions` |
| Comisiones · registrar pago | Cobros y pagos | `#payments` |
| Finanzas · nueva cuenta y custodio | Tesorería y conciliación | `#treasury` |
| Finanzas · registrar cobro | Cobros y pagos | `#payments` |

Evidencia visual: `docs/qa/fin-pdp-116/` (28 capturas claro/oscuro 1440/390,
generadas con `build-tools/visual-harness/capture-fin-pdp.mjs`).

## 6. Pendientes y decisiones abiertas

- Validar con asesoría los plazos (10/5 años) y la base legal de cada fila.
- `#112`: cablear `financePersonalData` en el export ARSOP,
  `anonymizeFinanceSubject`/`anonymizeExpiredFinanceData` en el job programado y
  resolver los snapshots PII de la auditoría.
- `#113`: publicar `/privacidad`; el ancla por finalidad ya está emitida.
- Comunicaciones no esenciales: registrar oposición en la base de
  consentimientos (PLT) y hacerla valer en mora/CRM.
- Evitar datos personales en campos libres de asientos inmutables
  (referencias de cobros/egresos): microcopy y revisión en `#112`/COM.
