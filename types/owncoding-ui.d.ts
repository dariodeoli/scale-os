// Tipado local de `owncoding-ui` (tag fijo v0.12.0): el paquete publica
// JavaScript sin declaraciones. Se declaran los símbolos que ScaleOS adopta;
// al sumar otro, se agrega acá con su firma.
declare module 'owncoding-ui' {
  // Lógica pura (fase 1, issue #39).
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
  export function extractTokenFromUrl(url: string): string;

  // Objetos de interfaz v2 (campaña #41). El paquete no publica tipos; se
  // declaran permisivos para consumir los componentes desde TSX y la
  // verificación real queda en los contratos de `tests/`.
  export const Icon: any;
  export const Button: any;
  export const Input: any;
  export const PasswordInput: any;
  export const PinInput: any;
  export const MoneyInput: any;
  export const Money: any;
  export const Select: any;
  export const Textarea: any;
  export const Label: any;
  export const Eyebrow: any;
  export const Card: any;
  export const Modal: any;
  export const ConfirmDialog: any;
  export const Badge: any;
  export const Dot: any;
  export const IconAction: any;
  export const Drawer: any;
  export const ToastProvider: any;
  export const useToast: any;
  export const Skeleton: any;
  export const EmptyState: any;
  export const ErrorState: any;
  export const Aviso: any;
  export const Nota: any;
  export const PageHeader: any;
  export const DataTable: any;
  export const FormField: any;
  export const Stat: any;
  export const Subtabs: any;
  export const FilaDato: any;
  export const CeldaMoneda: any;
  export const BarraProgreso: any;
  export const Switch: any;
  export const SearchField: any;
  export const SegmentedField: any;
  export const PercentField: any;
  export const CurrencySelect: any;
  export const PhoneField: any;
  export const EmailField: any;
  export const SerialField: any;
  export const ListGridToggle: any;
  export const FormActions: any;
  export const SaveActions: any;
  export const Checkbox: any;
  export const BarraLote: any;
  export const Vencimiento: any;
  export const SerialTexto: any;
  export function useDialogPending(pendiente: boolean): void;
  export function useDialogClose(): (() => void) | undefined;
  export function fechaLista(value: unknown, vacio?: string | {timeZone?: string; hora?: string; vacio?: string}, opciones?: {timeZone?: string; hora?: string}): string;
  export function fechaListaCorta(value: unknown, vacio?: string | {timeZone?: string}, opciones?: {timeZone?: string}): string;
  export function diasHasta(fecha: unknown, opciones?: {hoy?: Date; timeZone?: string}): number | null;
  export function tonoVencimiento(fecha: unknown, opciones?: {hoy?: Date; diasAviso?: number}): '' | 'bad' | 'warn';
  export function completeSave(cerrar?: () => void, refrescar?: () => void | Promise<void>, opciones?: {avisar?: (mensaje: string) => void}): Promise<boolean>;
  export function cn(...inputs: unknown[]): string;
  export function primerNombre(nombre?: string): string;
}
