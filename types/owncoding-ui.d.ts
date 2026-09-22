// Tipado local de la lógica pura de `owncoding-ui` (tag fijo v0.12.0): el
// paquete publica JavaScript sin declaraciones. Se declaran solo los símbolos
// que ScaleOS adopta; al sumar otro, se agrega acá con su firma.
declare module 'owncoding-ui' {
  export function soloDigitos(value: string, max?: number): string;
  export function parseTelefono(value: string, countryCodePorDefecto?: string): {countryCode: string; phone: string};
  export function componerTelefono(values?: {countryCode?: string; phone?: string}): string | null;
  export function telefonoValido(value: string, countryCode?: string): boolean;
  export function whatsappUrl(phone?: string | null, message?: string, countryCode?: string): string;
  export function normalizarNombre(texto: string, options?: {apellidosPrimero?: 'auto' | 'sifen' | boolean}): string;
  export function esRazonSocial(texto: string): boolean;
  export function ultimos4(serial?: string | null): string;
  export function partirSerial(serial?: string | null): {cabeza: string; cola: string};
  export function serialEnmascarado(serial?: string | null): string;
  export function esToken(value: string): boolean;
}
