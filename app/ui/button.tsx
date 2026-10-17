'use client';

import React, {forwardRef, type ButtonHTMLAttributes, type ReactNode} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'medium' | 'large';
export type ButtonColor = 'brand' | 'neutral' | 'success' | 'warning' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
 variant?: ButtonVariant;
 size?: ButtonSize;
 color?: ButtonColor;
 icon?: ReactNode;
 iconPosition?: 'start' | 'end';
 loading?: boolean;
 fullWidth?: boolean;
}

/** Native type is deliberately left undefined when omitted, preserving form submit. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
 variant='primary',size='medium',color,icon,iconPosition='start',loading=false,
 fullWidth=false,disabled=false,children,...native
},ref){
 const iconContent=loading
  ? <span data-ui-button-spinner="" aria-hidden="true"/>
  : icon == null ? null : <span data-ui-button-icon="" aria-hidden="true">{icon}</span>;
 return <button {...native} ref={ref} disabled={disabled||loading}
  aria-busy={loading ? true : native['aria-busy']}
  data-ui-button="" data-ui-variant={variant} data-ui-size={size}
  data-ui-color={color ?? (variant==='danger'?'danger':'brand')}
  data-ui-loading={loading?'true':undefined} data-ui-full-width={fullWidth?'true':undefined}>
  {iconPosition==='start'?iconContent:null}
  {children}
  {iconPosition==='end'?iconContent:null}
 </button>;
});

export interface IconButtonProps extends Omit<ButtonProps,'children'|'icon'|'iconPosition'> {
 label: string;
 icon: ReactNode;
}

/** Callers choose type="button" explicitly for non-submit actions, as with Button. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({
 label,icon,variant='ghost',...native
},ref){
 return <Button {...native} ref={ref} variant={variant} icon={icon}
  aria-label={label} data-ui-icon-button=""/>;
});
