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
  export function fechaHora(value: unknown, vacio?: string, opciones?: {timeZone?: string; hora?: string}): string;
  export function fechaDia(value: unknown, vacio?: string, opciones?: {timeZone?: string}): string;
  export function fechaCorta(value: unknown, vacio?: string, opciones?: {timeZone?: string}): string;
  export function fechaHoraCorta(value: unknown, vacio?: string, opciones?: {timeZone?: string; hora?: string}): string;
  export function fechaLista(value: unknown, vacio?: string, opciones?: {timeZone?: string; hora?: string}): string;
  export function fechaListaCorta(value: unknown, vacio?: string, opciones?: {timeZone?: string}): string;
  export function diasHasta(fecha: unknown, opciones?: {hoy?: unknown; timeZone?: string}): number | null;
  export function tonoVencimiento(fecha: unknown, opciones?: {hoy?: unknown; diasAviso?: number}): '' | 'bad' | 'warn';
  export function montoTexto(value: unknown, currency?: string, vacio?: string): string;
  export function useSingleFlightSubmit(enviar:(evento?: any)=>Promise<void>|void): {pendiente: boolean; onSubmit: (evento?: any)=>Promise<void>};
  export function completeSave(cerrar?: () => void, refrescar?: () => void | Promise<void>, opciones?: {avisar?: (mensaje: string) => void}): Promise<boolean>;
  export const AVISO_REFRESCO: string;

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
  export const ChipEstado: any;
  export const EstadoBadge: any;
  export const EstadoGuardado: any;
  export const SectionState: any;
  export const Checkbox: any;
  export const Vencimiento: any;
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

  // Cosecha ScaleOS de v0.39 (#75): ciclo de guardado, chips de negocio,
  // fechas de listas y gráficos. La librería ya publica tipos; el shim local
  // sigue vivo mientras la fundación resuelve sus gaps (Label.htmlFor,
  // SegmentedField genérico) que hoy impiden usarlos en toda la app.
  export function useSingleFlightSubmit(enviar: (evento?: any) => Promise<void> | void): {pendiente: boolean; onSubmit: (evento?: any) => Promise<void>};
  export function completeSave(cerrar?: () => void, refrescar?: () => void | Promise<void>, opciones?: {avisar?: (mensaje: string) => void}): Promise<boolean>;
  export const AVISO_REFRESCO: string;
  export const ChipEstado: any;
  export function fechaListaCorta(value: unknown, vacio?: string | {timeZone?: string; vacio?: string}, opciones?: {timeZone?: string; vacio?: string}): string;
  export function fechaLista(value: unknown, vacio?: string | {timeZone?: string; vacio?: string; hora?: string}, opciones?: {timeZone?: string; vacio?: string; hora?: string}): string;
  export function tonoVencimiento(fecha: unknown, opciones?: {hoy?: unknown; diasAviso?: number}): '' | 'bad' | 'warn';
  export function diasHasta(fecha: unknown, opciones?: {hoy?: unknown; timeZone?: string}): number | null;
  export const GraficoBarras: any;
  export function taxIdValid(value: unknown): boolean;
  export const MENSAJE_RUC: string;
  export function normalizeTaxId(value: unknown): string | null;
  export function limpiarTaxId(value: unknown, max?: number): string;

  // Tanda v0.51 (#82/#83): pie institucional (§14), bandeja oficial (§16) y
  // comparación de versiones (regla 10). El shim sigue declarando sólo lo que
  // Scale OS adopta; la firma real vive en la biblioteca.
  export const ProductFooter: any;
  export const CREDITO_PIE: string;
  export const CREDITO_PIE_URL: string;
  export const CampanaAvisos: any;
  export function contarSinLeer(avisos?: unknown[]): number;
  export function textoContador(total: number): string;
  export function hayVersionNueva(actual?: string, publicada?: string): boolean;
  export function compararVersiones(a?: string, b?: string): -1 | 0 | 1;
  export function partesVersion(valor?: string): number[];

  // Menú desplegable de acciones (#103): lista portable de ítems con ícono,
  // peligro y disabled; el disparador lo dibuja la app.
  export const MenuDesplegable: any;

  // Tanda v0.54 (Refs #113/#114): protección de datos personales (Ley
  // 7593/2025, §12). El aviso de finalidad, la casilla explícita (nunca
  // premarcada, con versión visible y enlace fuera del label) y el registro
  // normalizado que aporta la app.
  export const AvisoPrivacidad: any;
  export const ConsentimientoDatos: any;
  export function registroConsentimiento(datos?: {finalidad?: string; aceptado?: boolean; version?: string | number; canal?: string; fecha?: Date | string | number; titular?: string}): {finalidad: string; aceptado: boolean; version: string; canal: string; fecha: string; titular: string};
}
