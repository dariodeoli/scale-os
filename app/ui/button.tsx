'use client';

import React, {forwardRef, type ButtonHTMLAttributes, type CSSProperties, type ReactNode} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'medium' | 'large';
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** A semantic CSS color/token supplied by the theme, never a business state. */
  color?: string;
  icon?: ReactNode;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  fullWidth?: boolean;
  iconOnly?: boolean;
};
const variantClass: Record<ButtonVariant, string> = {
  primary: 'primary', secondary: 'secondary', outline: 'secondary', ghost: 'text-button', danger: 'secondary danger',
};

/** The consumer owns the action. This primitive owns appearance and pending state. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({
  variant: requestedVariant, size = 'medium', color, icon, iconPosition = 'start', loading = false,
  disabled = false, fullWidth = false, iconOnly = false, type = 'button', className = '', style, children, ...props
}, ref) {
  const classes = className.split(/\s+/);
  const variant = requestedVariant ?? (classes.includes('text-button') ? 'ghost' : classes.includes('danger') || classes.includes('record-remove') ? 'danger' : classes.includes('primary') ? 'primary' : classes.includes('secondary') || classes.includes('icon-button') ? 'secondary' : 'primary');
  return <button {...props} ref={ref} type={type} disabled={disabled || loading}
    aria-busy={loading || props['aria-busy'] || undefined}
    className={`ui-button ${variantClass[variant]}${iconOnly ? ' icon-button' : ''} ${className}`.trim()}
    data-variant={variant} data-size={size} data-full-width={fullWidth || undefined}
    style={color ? {...style, '--ui-button-color': color} as CSSProperties : style}>
    {loading || icon ? <>
    {loading ? <span className="ui-button-spinner" aria-hidden="true"/> : null}
    {icon && iconPosition === 'start' ? <span className="ui-button-icon" aria-hidden="true">{icon}</span> : null}
    {children}
    {icon && iconPosition === 'end' ? <span className="ui-button-icon" aria-hidden="true">{icon}</span> : null}
    </> : children}
  </button>;
});
