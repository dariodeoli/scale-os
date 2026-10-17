"use client";

import {useId, type ReactNode} from 'react';

export type FieldControlProps = {id: string; invalid: boolean; describedBy?: string};
export type FieldProps = {
  id?: string; label: ReactNode; help?: ReactNode; error?: ReactNode; required?: boolean;
  className?: string; children: ReactNode | ((props: FieldControlProps) => ReactNode);
};

/** Render children receive the IDs needed to connect composed controls to their label and messages. */
export function Field({id, label, help, error, required, className, children}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const hasHelp = help !== undefined && help !== null && help !== false && help !== '';
  const describedBy = [hasHelp && `${controlId}-help`, hasError && `${controlId}-error`].filter(Boolean).join(' ') || undefined;
  return <div className={className}>
    <label htmlFor={controlId}>{label}{required ? <span aria-hidden="true"> *</span> : null}</label>
    {typeof children === 'function' ? children({id: controlId, invalid: hasError, describedBy}) : children}
    {hasHelp ? <div id={`${controlId}-help`}>{help}</div> : null}
    {hasError ? <div id={`${controlId}-error`} role="alert">{error}</div> : null}
  </div>;
}
