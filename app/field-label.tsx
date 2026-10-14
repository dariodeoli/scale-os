// Convención única de campos (reglas de campos, fuente única): el campo obligatorio
// no lleva marca y el opcional se anuncia con «· Opcional» al final de su etiqueta.
// Ninguna pantalla escribe la marca a mano (ni entre paréntesis ni «Obligatorio»).
export const OPTIONAL_SUFFIX = ' · Opcional';

/** Marca visible para etiquetas JSX (`<label>`, `FormField`, `Label`). */
export function OptionalMark() {
  return <span className="field-optional">{OPTIONAL_SUFFIX}</span>;
}

/** Etiqueta en texto plano (p. ej. `SelectCustom`, que recibe un string). */
export function optionalLabel(label: string, optional = true) {
  return optional ? `${label}${OPTIONAL_SUFFIX}` : label;
}
