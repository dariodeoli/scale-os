'use client';

// Public consumer entry. Implementations must import sibling modules directly, never this barrel.
export {InputBase, TextareaBase} from './input';
export type {InputBaseProps, TextareaBaseProps, FieldStateProps} from './input';
export {InputControl} from './input-control';
export type {InputControlProps} from './input-control';
export {Field, FieldLabel, FormField} from './field';
export {Notice, Note} from './notice';
export {SegmentedField, Subtabs, TabScroller} from './navigation';
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
export {NumericControl, NumberInput, PercentageInput, numberInputValid, numberInputProblem} from './number';
export type {NumericControlProps, NumberInputProps, PercentageInputProps, NumberPolicy, PercentagePolicy, NumberRules, NumberNotation} from './number';
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
export {OptionsSelect, optionsFromChildren} from './options-select';
export type {OptionsSelectProps} from './options-select';
export {PendingFields} from './form-state';
export {useSingleFlightSubmit} from '../use-single-flight-submit';
export {useFormFocus, FormValidationErrors} from './form-focus';
export {Checkbox, Switch} from './choice';

export {Dialog, ConfirmDialog, FormActions} from '../dialog';
export type {DialogSize, ConfirmDialogProps} from '../dialog';
export {SaveActions} from '../save-actions';
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
