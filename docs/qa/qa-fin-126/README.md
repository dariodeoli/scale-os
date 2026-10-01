# QA ola 2 — Finanzas (Refs #126)

Barrido móvil/tablet, oscuro, modales y formularios en **Finanzas, Previsión,
Informes, Mora y Comisiones** sobre el stack local real (API + demo + front
construido), con el harness `build-tools/visual-harness/qa-fin-126.mjs`.

- **Antes** (`antes/`): corrida previa a las correcciones, con las capturas del
  overflow y el log (`qa-antes.txt`).
- **Después** (`despues/`): corrida final; `qa-despues.txt` es la lista completa
  de chequeos (✓/✗) y `qa-despues.json` la misma en JSON.

## Correcciones (sin rediseñar)

1. **Comisiones · overflow horizontal** (390: 299 px; 768: 121 px).
   La sección raíz y las tarjetas usaban `grid` implícito (`auto`), que toma el
   min-content del encabezado largo; la grilla se estiraba a 673 px aunque el
   viewport fuera 390. Fix: `grid-cols-1` (`minmax(0,1fr)`) en la raíz y en las
   4 tarjetas (`app/sections/comisiones.tsx`). Evidencia: `despues/comisiones-390-*.jpg`
   y `despues/comisiones-768-*.jpg` (antes: `antes/comisiones-*`).
2. **Informes · Producción semanal** (768: 254 px de overflow).
   El `Card` de la tabla automática expandía su columna con el `min-w` de la
   tabla y empujaba el documento. Fix: `grid-cols-1` en el `Card`
   (`app/weekly-automatic.tsx`). Evidencia: `despues/informes-768-*.jpg`.
3. **Cobro de clientes · validación invisible**.
   Al enviar vacío, el formulario no mostraba nada (ni mensaje ni estado
   inválido) y no escribía. Fix: aviso `role="alert"` con el mismo patrón de
   Transferencias (`app/workspace-forms.tsx`). Evidencia: `despues/validacion-cobro.jpg`.

## Verificado OK (390×844 y 768×1024, claro y oscuro)

- **Sin scroll horizontal del documento** en las 5 pantallas y ambos anchos; los
  rieles internos de tabla quedan etiquetados (`Transferencias entre cuentas`,
  `Cobros pendientes`, `Cobros registrados`, `Cobranza por cliente`, `Comisiones
  del mes por colaborador`).
- **Targets ≥44 px** en 390 (botones, inputs, selects, summaries).
- **Filas de lista 44–52 px**; encabezados y acciones alineados.
- **Inputs sin zoom iOS**: todos ≥16 px en 390, con `type`/`inputMode` correctos
  (fechas `date`, importes `decimal`/`numeric`).
- **Contraste de bordes de control ≥3:1** en ambos temas.
- **Modales** (cobro, factura, cuenta, transferir, salario, ajuste, comisión,
  descuento): foco inicial adentro, foco atrapado a 14 tabs, dentro del
  viewport, scroll interno con pie alcanzable y **Escape cierra y devuelve el
  foco** a 390 y 768.
- **Validación visible al enviar vacío** en cobro, transferencia y salario, con
  el diálogo abierto y **sin efectos** (ningún POST).
- **Estados vacíos reales** con las listas vacías: transferencias, cuentas,
  comisiones y mora.
- **Enmascarado intacto**: con la respuesta enmascarada del API
  (`base_amount/override_amount` en `null`), Previsión muestra «Sin dato» y no
  ofrece acciones de salario (`despues/enmascarado-prevision-390-finance.jpg`).

## Hallazgos que se coordinan (no se toca lo compartido)

1. **Contraste AA en oscuro (objetos/tokens compartidos — SOS-DSN)**:
   - `.text-button` con `--brand-600` → **2.98:1** (Finanzas: «Ver más»,
     «Cuenta», «Transferir», etc., 48 nodos; también acciones de texto en el
     resto del panel).
   - Chips de estado (Mora, Comisiones, Finanzas) → **4.21–4.38:1**
     (ya reportados a la librería, owncoding-ui#5).
   - Enlace del pie «Desarrollado por Owncoding» → **3.77:1**.
   Propuesta: token de texto de acción para tema oscuro (p. ej. `brand-300/400`)
   y contraste de chips en la librería; DSN está en la adopción v0.59.0.
2. **`GET /api/agency/team` responde 500 (42703) en bases nuevas — SOS-PLT**:
   con una base sin tracker (`schema_migrations` vacío),
   `applyPendingMigrations(..., {firstRun:'baseline'})` registra **todos** los
   archivos como aplicados sin ejecutarlos, y el arranque explícito de
   `server.js` no incluye `20260929_member_purge.sql`,
   `20260929_destructive_platform_actions.sql` ni
   `20260930_lead_contact_opposition.sql`. Evidencia: la base del stack da esas
   migraciones por aplicadas y **falta `organization_members.purged_at`**;
   Equipo devuelve 500 al consultar `purged_at`. En producción no se ve porque
   su baseline es anterior a esos archivos. Fix sugerido: pasar `knownFiles`
   con la lista curada o completar la lista; queda fuera del alcance FIN.

## Reproducir

```sh
node build-tools/visual-harness/e2e-fin-stack.mjs   # stack local (deja la sesión)
node build-tools/visual-harness/qa-fin-126.mjs      # barrido + capturas
```
