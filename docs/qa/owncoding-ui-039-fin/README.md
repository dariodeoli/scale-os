# Adopción de owncoding-ui v0.39.0 — vertical FIN (#75)

Auditoría de import sites de **Finanzas, Mora, Previsión, Informes y Comisiones**
sobre `origin/main` v1.0.134. Evidencia antes/después de lo adoptado ahora y
lista de lo que se completa cuando la fundación (DSN) suba el pin a v0.39.0.

## Adoptado en esta rama (version-independiente)

| Pantalla | Antes | Después |
| --- | --- | --- |
| Finanzas (Cobros pendientes) | buscador a mano (`<label>` + lupa lucide + `pl-7`) | `SearchField` de la librería (lupa, botón limpiar, `aria-label`) |
| Mora (filtros) | `<input type="search">` con `sr-only` a mano | `SearchField` de la librería |

- El campo de la librería trae botón de limpiar; se le da target táctil de 44 px
  en mobile con `[&>button]:h-11 md:[&>button]:h-7` (patrón de `IconAction`).
- El CSS base de la app pisa el padding del campo (`pl-9` quedaba en 12 px y la
  lupa se montaba sobre el texto): se compensa por uso con
  `[&>input]:!pl-9 [&>input]:!pr-9`. **Pendiente de base (DSN)**: el override
  afecta a todos los `SearchField`/`Input` de la librería en la app.
- Capturas: `antes-*` (producción v1.0.134) y `despues-*` (build local) para
  Finanzas y Mora a 1440/390 en claro y oscuro, incluido el estado con texto.

## Pendiente tras la fundación (depende del bump a v0.39.0)

| Objeto nuevo | Dónde se adopta en FIN | Nota |
| --- | --- | --- |
| `MoneyInput` (caret + `integerOnly`, pegado es-PY/en-US) | Previsión: gastos planificados/reales y diálogos de salario/ajuste; Comisiones: pago de comisión, importe/porcentaje; Finanzas: alta de factura/cobro/transferencia (`workspace-forms`) | hoy usan `AmountInput`/`Input`+`soloDigitos` de la app |
| `useSingleFlightSubmit`, `completeSave`, `crearEnvioUnico`, `AVISO_REFRESCO` | Comisiones (`run`+`busy`), Previsión (guardas de guardado), `daily-controls` | los módulos app son la cosecha de origen; si la fundación los re-exporta, la vertical no cambia |
| `useDialogPending`, `FormActions`, `SaveActions`, `busy` de `Modal` | diálogos de cuenta/factura/cobro/transferencia, salario/ajuste, comisión/descuento | llega con el `Dialog` del marco |
| `fechaLista`, `fechaListaCorta`, `diasHasta`, `tonoVencimiento`, `Vencimiento` | columnas de fechas/vencimientos de las 5 pantallas | reemplazan a `listDateShort/Full` + `dueTone` (hoy app canónica; DSN decide el re-export) |
| `SectionState` | vacío/carga/error de paneles FIN | compone `EmptyState`+`Skeleton`+`ErrorState` |
| `PercentField` | Comisiones (porcentaje de comisión) | hoy `Editor type:'number'` |
| Chips AA (`--c-*-text`, fix #5) | `StateChip` de Finanzas/Mora/Comisiones/Informes | la QA local mide hoy 12 fallas AA de chips (4.21–4.45:1); el bump las resuelve |

`SerialTexto`/`TaxIdField`/`PhoneField`/`EmailField` no aplican a la vertical.
