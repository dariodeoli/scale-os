'use client';

// Public consumer entry. Implementations must import sibling modules directly, never this barrel.
export {InputBase, TextareaBase} from './input';
export type {InputBaseProps, TextareaBaseProps, FieldStateProps} from './input';
export {InputControl} from './input-control';
export {Field} from './field';
export type {FieldProps, FieldControlProps} from './field';
export {TextField} from '../text-field';
export type {TextFieldProps} from '../text-field';
export {EmailField} from '../email-field';
export type {EmailFieldProps} from '../email-field';
export {PasswordField} from '../password-field';
export type {PasswordFieldProps} from '../password-field';
export {PhoneField} from '../phone-field';
export type {PhoneFieldProps} from '../phone-field';
export {SearchField} from '../search-field';
export {AmountInput} from './amount';
export type {AmountInputProps} from './amount';
export {NumberInput, PercentageInput, numberInputValid} from './number';
export type {NumberInputProps, PercentageInputProps, NumberPolicy, PercentagePolicy, NumberRules} from './number';
export {DateInput, TimeInput, DateTimeInput, MonthInput} from './temporal';
export type {TemporalInputProps} from './temporal';
export {Button, IconButton} from './button';
export type {ButtonProps, IconButtonProps, ButtonVariant, ButtonSize, ButtonColor} from './button';
export {Selector} from './select';
export type {SelectorProps, SelectOption, SelectOptionState, SelectKind} from './select';
export {LookupField, LookupReview} from './smart-field';
export type {LookupFieldProps, LookupReviewProps, LookupState} from './smart-field';
export {CardSurface} from './surface';
export {DataTable} from './collection';

export {Dialog, ConfirmDialog, FormActions} from '../dialog';
export type {DialogSize, ConfirmDialogProps} from '../dialog';
export {SaveActions} from '../save-actions';
// Compatibility bridge: only the existing form UI and its types, never operations' API functions.
export {Editor} from '../operations';
export type {Field as EditorField, EditorHandle} from '../operations';
export {OptionalMark} from '../field-label';

export {
  PageHeader, FilterToolbar, ListPage, ListGrid, ListRow, ListActions,
  Kpi, KpiStrip, StateChip, MoneyText, CurrencyField,
  ViewSwitch, ViewTabs, BulkBar, ActionMenu,
  LoadingBlock, SectionLoading, EmptyBlock, EmptyCta, EmptyCompact, ErrorBlock,
  KpiStripSkeleton, CardSkeleton, CardGridSkeleton, TableSkeleton, DashboardSkeleton,
  CompactCard, CompactQuickAction,
} from '../ui-v2';
export type {ChipTone, CollectionView, Column, RecordMenuItem, CompactCardProgress} from '../ui-v2';
export {FotoPerfil} from '../foto-perfil';
export type {FotoPerfilProps, FotoPerfilTamano, FotoPerfilForma, FotoPerfilVariante} from '../foto-perfil';
export {PersonContainer} from '../person-container';
export type {PersonContainerProps} from '../person-container';
export {ActorIdentity, ActorAvatar} from '../actor-identity';
export type {ActorIdentityProps} from '../actor-identity';
