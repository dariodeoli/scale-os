# #241 — preparación interna de componentes portables

Estado: propuesta documental sobre Scale `17353f58`. No publica paquetes ni cambia componentes, imports, dependencias, estilos o contratos. La inspección de repositorio/código externo queda suspendida hasta que el coordinador confirme la regresión completa y revise los primeros hallazgos de QA. No se afirma que exista una API compatible en OwnCoding UI: todavía no se comprobó en esta fase.

La aplicación ya cuenta con entrada pública `app/ui/index.ts` y catálogo `/biblioteca-ui`. Que un símbolo aparezca en esa entrada no significa que sea un componente genérico listo para publicar.

## Mapa interno

| Conjunto actual | Portabilidad | Dependencias y límites |
| --- | --- | --- |
| InputBase, TextareaBase y tipos de estado | Base genérica pequeña | React y atributos/eventos/refs nativos. Sin CSS propio, consultas ni política de datos. InputBase integra la clausura del piloto numérico. |
| NumericControl, NumberInput, PercentageInput y validadores | Piloto propuesto | React + InputBase; validación exacta con BigInt. Mantener políticas y notación explícitas, sin convertir unidades. |
| Button e IconButton | Candidato posterior | React; anatomía y tokens de ui-system.css/ui-tokens.css. Su contrato de submit implícito, ref y variantes requiere llevar los estilos y pruebas conjuntamente. No forma parte del piloto sin CSS. |
| Field, FieldLabel, FormField y TextField | Candidatos posteriores | Composición React, IDs, ARIA y primitivas nativas; estilos/compatibilidad de descripción actuales. No incluyen validación de modelos. |
| Validadores civiles en temporal-value.ts | Lógica genérica candidata | Fecha, hora, datetime civil y mes sin zona horaria ni rango comercial. Mantener separados de convertir horarios de Scale. |
| DateInput, TimeInput, DateTimeInput, MonthInput | Candidatos con clausura mayor | InputBase, Button, IconButton, Dialog/FormActions, iconos y CSS. El picker y su conflicto con cambios externos se transfieren juntos. No extraer un calendario paralelo. |
| LookupField y LookupReview | Presentación genérica candidata | Field/InputBase/Button. Estado, política ya resuelta y callbacks son datos del consumidor. No publicar búsqueda fiscal, deduplicación o fuentes de clientes como si fueran UI genérica. |
| SearchField, Selector y OptionsSelect | Candidatos con dependencias a revisar | Portal, foco, posicionamiento, InputBase, SearchField, Button y avatar canónico. FotoPerfil depende de helpers de identidad/media de Scale: no arrastrar esa política al paquete ni crear otro motor para evitarla. |
| Dialog, ConfirmDialog, FormActions, SaveActions, DialogFormState | Infraestructura potencialmente genérica | Stack de overlays, contextos, portal, descarte/dirty, lock pending, foco, InputBase/Button y CSS. Aislar el conjunto antes de publicar; no copiar sólo el markup. |
| useSingleFlightSubmit, useFormFocus, PendingFields | Candidatos posteriores | Hooks/presentación genérica, pero preservar la coordinación de foco tras desbloqueo y la forma de errores/campos que entienden. Sin reglas de aprobación ni requests. |
| notify/cola y ToastViewport | Candidato conjunto posterior | Evento/payload genérico y un solo viewport en la raíz. Hay que transferir cola, duración, deduplicación y CSS; no publicar el mapeo de mutaciones de Scale. |
| CardSurface, DataTable, Checkbox, Switch, Notice/Note, SegmentedField/Subtabs | Puentes a renderers instalados | Ya reexportan la dependencia existente. No copiar ni volver a publicar esos renderers desde Scale. La comparación externa de compatibilidad está pendiente del gate. |
| AmountInput | Adaptador local sobre MoneyInput existente | Mantiene formato, símbolos y contrato de Scale. El piloto no modifica ni publica el renderer monetario ni lo sustituye por el parser numérico. |
| PhoneField, EmailField y PasswordField | Composición a evaluar, no piloto | PhoneField usa códigos/default y helpers de field-rules; EmailField usa sugerencias/límites del flujo; PasswordField preserva distinción login/alta. No exportar reglas de cuenta, países permitidos o recuperación de acceso. |
| FotoPerfil, PersonContainer y ActorIdentity | Mantener locales en esta etapa | Identidad, iniciales, nombres técnicos, seguridad de URL/foto y presentación de autor importado. Separar eventualmente la presentación de políticas de media/identidad, sin portarlas como genéricas. |
| PageHeader, ListGrid/ListRow, CompactCard, ActionMenu y otros exports de ui-v2 | Evaluar por símbolo, no por archivo | ui-v2 combina infraestructura visual, renderers existentes y composición de Scale. CurrencyField/MoneyText incluyen catálogo/formato de monedas de la app. No mover el agregado entero por estar expuesto desde el barrel. |
| InputControl | Fachada de compatibilidad local | Selecciona el control y conserva semántica previa de type=number (step/defaultValue), fechas y RHF. Puede consumir el piloto mediante los reexports existentes; no necesita publicarse con él. |
| Editor, ClientEditor, responsables/CAS, formularios financieros/comerciales | Permanecen en Scale | Modelos, fuentes, endpoints, permisos, reglas de dinero/salarios, revisión, validaciones de negocio y flujos de persistencia. No forman parte de la biblioteca portable. |

## Piloto numérico: clausura mínima y contrato

Origen actual: `app/ui/number.tsx` e `InputBase`/`InputBaseProps`/`FieldStateProps` en `app/ui/input.tsx`.

Dependencias runtime mínimas: React y el elemento input real del navegador. No hay ReactDOM, RHF, iconos, fuente de datos, moneda, estilos propios, permisos ni endpoint en ese motor. Los tests pueden usar RHF para acreditar interoperabilidad; RHF no debe convertirse en dependencia runtime del componente. React debe permanecer peer y resolverse a una sola instancia.

Los validadores requieren soporte BigInt en el entorno objetivo. La comparación decimal exacta de la notación plain no debe reemplazarse por Number, parseFloat o una librería distinta durante el traslado. La notación native sí utiliza Number para reproducir las decisiones actuales de overflow/underflow; esa excepción no convierte el texto que recibe el consumidor.

Firmas actuales que se deben preservar:

```ts
type NumberPolicy = 'integer' | 'decimal';
type PercentagePolicy = 'integer-percent' | 'decimal-percent' | 'ratio';
type NumberNotation = 'plain' | 'native';
type NumberRules = {
  notation?: NumberNotation;
  min?: string | number;
  max?: string | number;
  precision?: number;
  required?: boolean;
  step?: string | number;
  stepBase?: string | number;
};
type NumericControlProps = Omit<InputBaseProps, 'type'> & {
  policy: NumberPolicy;
  precision?: number;
  notation?: NumberNotation;
};
type NumberInputProps = Omit<NumericControlProps, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
};
type PercentageInputProps = Omit<NumberInputProps, 'policy'> & {
  policy: PercentagePolicy;
};

numberInputProblem(value: string, policy: NumberPolicy, rules: NumberRules): string;
numberInputValid(value: string, policy: NumberPolicy, rules?: NumberRules): boolean;
nativeNumberSettings(props: {
  step?: string | number;
  min?: string | number;
  defaultValue?: unknown;
}): {policy: NumberPolicy; step: string | number};
```

`numberInputProblem` actualmente recibe rules de forma obligatoria; no agregar un valor por defecto al trasladarlo como si ya existiera. Los tres componentes usan forwardRef de HTMLInputElement. NumericControl hereda value/defaultValue/onChange y atributos nativos desde InputBaseProps; las fachadas NumberInput/PercentageInput son controladas y entregan string.

### Invariantes de edición y formularios

- El input real tiene type=text e inputMode numérico/decimal. No se promete un spinbutton nativo ni equivalencia universal con input type=number. El consumidor puede sobreescribir inputMode.
- Se conservan el texto crudo y el caret: vacío, cero, signo, punto, `-.`, separador final y exponente incompleto cuando corresponda. Un borrador inválido permanece editable; la validación no lo recorta, redondea ni reemplaza por cero.
- NumericControl entrega el mismo evento recibido del input; target y ref señalan el nodo real. No crear eventos fabricados, proxies ocultos ni una ref de wrapper.
- Las fachadas extraen event.target.value sin cambiarlo. PercentageInput sólo elige entero/decimal; no aplica de forma implícita min/max, 0–100, 0–1 o conversión porcentual.
- Se preservan los modos controlado y no controlado, defaultValue, name, required, form, readOnly, disabled, pending y ARIA/descritos combinados de InputBase. La ref permite a RHF poblar el DOM después de montar.
- El layout effect valida el valor real del DOM y setCustomValidity se actualiza en la edición. Esto es necesario para RHF/uncontrolled; no reemplazarlo por validar exclusivamente props.value.
- La entrada vacía es válida salvo required. min/max, precisión y step mantienen la aritmética y mensajes actuales. No añadir límites de negocio ni maxLength nuevo durante el traslado.
- El origen del step es importante: min, luego defaultValue, luego cero. nativeNumberSettings conserva el step=1 predeterminado del antiguo type=number. Una NumberInput decimal sin step no debe recibir ese step=1 por accidente.
- notation=plain y notation=native son políticas distintas y explícitas. Mantener los casos actuales de configuración inválida, exponentes y underflow/overflow; cualquier cambio de aceptación o mensaje requiere revisión separada.
- Disabled/pending bloquean el input real y no emiten cambios desde la fachada. El valor no desaparece cuando se bloquea.
- El motor no transforma importes monetarios, no consulta datos y no ejecuta guardados. Editor conserva fuera del paquete sus límites, mensajes y reglas propias (por ejemplo, entero no negativo).

### Transferencia propuesta, después de habilitar la fase externa

1. Confirmar la aprobación de gate/QA antes de inspeccionar el destino. Revisar entonces nombres ya exportados, peer React, build, subpaths, tipos y política de versiones. No reemplazar con un componente parecido sin demostrar el contrato.
2. Separar los tipos/helpers/validadores puros en un módulo sin `use client`. El renderer/fachadas mantienen la marca cliente. Un barrel cliente no debe convertir los validadores server-safe en una importación client-only.
3. Llevar la misma implementación de InputBase con su contrato, o reutilizar una base externa sólo después de verificar que es equivalente. Si se publica la base actual, Scale debe reexportar ese InputBase, en lugar de conservar una copia numérica diferente. TextareaBase puede permanecer local y compartir los tipos de estado.
4. Transferir también nativeNumberSettings: hoy usa los mismos helpers privados decimalParts/compareDecimal. Copiarlo con otro parser dentro de Scale dejaría dos motores. Su exposición definitiva en el paquete se define al revisar exports; la fachada local conserva el nombre que usa InputControl.
5. Construir un artefacto local del paquete y probarlo desde una rama aislada de Scale antes de publicar. Registrar versión, SHA de fuente y hash del artefacto probado. No cambiar node_modules/lockfiles del integrador para ensayar.
6. `app/ui/number.tsx` pasa a ser reexports de los componentes, funciones y tipos del artefacto probado. `app/ui/index.ts` conserva la API que ya consumen las pantallas. No dejar una implementación JSX local de NumericControl como fallback silencioso.
7. Mantener el CSS y los tokens de Scale intactos: el input conserva el markup y atributos esperados. No se añade un sistema de estilos ni un segundo formato numérico en este piloto.
8. Sólo después de comprobar el consumo real, preparar publicación/versionado del paquete y actualización de dependencia mediante PRs coordinados. Publicación y deploy no forman parte de esta propuesta documental.

Si el destino ya tiene símbolos con esos nombres pero otro contrato, la decisión debe documentarse antes de publicar. La compatibilidad de la fachada de Scale y una sola implementación son condiciones del piloto; no se inventa un nombre externo definitivo sin leer el destino.

## Cómo acreditar que Scale consume la misma implementación

| Evidencia propuesta | Qué acredita |
| --- | --- |
| Revisión del diff/AST de funciones y helpers antes/después de mover archivos | Cambios de ubicación/imports, sin reemplazar el algoritmo o suavizar validación. |
| Igualdad estricta de referencias entre exports del paquete y de app/ui/number.tsx, incluidos validadores; misma comprobación para InputBase | La fachada local reexporta el componente/función real y no lo duplica o reemplaza. |
| Metafile/source map del bundle y árbol de dependencias | Un solo módulo de motor numérico, una base InputBase coherente y una única instancia de React. |
| Mismo conjunto de vectores ejecutado contra baseline y artefacto empaquetado | Igual aceptación, mensajes, step/base, límites y casos de configuración, incluido texto fuera del rango seguro de Number. |
| Chromium con el artefacto instalado y mismos harnesses | Ref al input real, foco, caret, pegado, constraints, RHF, FormData textual y bloqueo de submits inválidos. |
| Catálogo/consumidores reales con CSS sin cambios | Compatibilidad de anatomía, tema y composición; no basta un demo aislado del paquete. |

Matriz mínima del artefacto consumidor:

- Plain entero/decimal y native: vacío, 0, negativos, `-`, `.`, `-.`, `1.`, `1e0`, `1e-`, precisión y enteros mayores que Number.MAX_SAFE_INTEGER.
- required, min/max, step exacto, stepBase/defaultValue, límites fraccionarios y step=any. No introducir cast numérico al enviar.
- Ref es HTMLInputElement; focus y selectionStart/setSelectionRange funcionan. Capturar identidad de event.target/currentTarget durante el callback nativo (React puede limpiar currentTarget después).
- Edición en el medio, borrar/pegar, rerender de un campo relacionado y disabled/pending mantienen texto y caret.
- Formularios nativos y RHF, controlados y no controlados, inicialización por ref, validación y payload strings con los mismos name/form.
- PercentageInput: entero/decimal/ratio mantienen unidad y sólo aplican rangos explícitos. AmountInput queda fuera del piloto y conserva sus regresiones monetarias.
- Editor real con noValidate sigue rechazando los mismos borradores y conserva foco/error, cero y sus reglas de negocio. No mover Editor al paquete para hacer pasar el harness.
- Ningún endpoint, permiso, regla de empresa, fuente de contactos o CSS nuevo aparece en el motor publicado.

## Evidencia interna ya disponible y límites de esta fase

Suites internas existentes para reutilizar, sin declarar que se ejecutaron contra un paquete externo:

- `tests/ui-numeric-engine-241.test.tsx`: motor, validadores y contrato numérico.
- `tests/ui-number-amount.test.tsx`: fachadas numéricas y no regresión del adaptador monetario.
- `tests/ui-numeric-browser-241.test.mjs`: raw/caret, constraints, formularios nativos/RHF, fachadas y Editor real.
- `tests/ui-catalog-browser.test.mjs`: consumo en la ruta Next y temas; no reemplaza la matriz numérica especializada.

Este cambio sólo agrega documentación. No vuelve a correr gates globales, no publica en OwnCoding UI y no da por probada compatibilidad externa. El coordinador conserva la decisión de avanzar tras sus gates y la revisión de QA.
