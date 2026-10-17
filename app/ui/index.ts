/** Local UI foundation. No Scale endpoints, roles or commercial calculations.
 * Domain adapters (ui-v2, ClientEditor, RUC provider) stay outside this entry.
 * Consumers may import the leaf module to avoid pulling unrelated components. */
export {Button} from './button';
export type {ButtonProps, ButtonSize, ButtonVariant} from './button';
export {DateInput, TimeInput, DateTimeInput} from './temporal-input';
export type {TemporalInputProps} from './temporal-input';
export {TextField} from '../text-field';
export {EmailField} from '../email-field';
export {PhoneField} from '../phone-field';
export {PasswordField} from '../password-field';
export {SearchField} from '../search-field';
export {Dialog, ConfirmDialog, FormActions} from '../dialog';
export type {DialogSize, ConfirmDialogProps} from '../dialog';
export {SaveActions} from '../save-actions';
export {FotoPerfil} from '../foto-perfil';
export {PersonContainer} from '../person-container';
export {Input, Textarea} from './input';
