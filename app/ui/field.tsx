"use client";

import {cloneElement,isValidElement,forwardRef,useId,type HTMLAttributes,type LabelHTMLAttributes,type ReactElement,type ReactNode} from 'react';

export type FieldControlProps = {id: string; invalid: boolean; describedBy?: string};
export type FieldProps = Omit<HTMLAttributes<HTMLDivElement>,'children'> & {
  id?: string; label: ReactNode; help?: ReactNode; error?: ReactNode; required?: boolean;
  className?: string; helpId?:string; errorId?:string; children: ReactNode | ((props: FieldControlProps) => ReactNode);
};

export const FieldLabel=forwardRef<HTMLLabelElement,LabelHTMLAttributes<HTMLLabelElement>>(function FieldLabel({className,...props},ref){
 return <label {...props} ref={ref} className={['ui-field-label',className].filter(Boolean).join(' ')}/>;
});

/** Render children receive the IDs needed to connect composed controls to their label and messages. */
export function Field({id, label, help, error, required, className, helpId, errorId, children, ...props}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hasError = error !== undefined && error !== null && error !== false && error !== '';
  const hasHelp = help !== undefined && help !== null && help !== false && help !== '';
  const helpKey=helpId||`${controlId}-help`,errorKey=errorId||`${controlId}-error`;
  const describedBy = [hasHelp && helpKey, hasError && errorKey].filter(Boolean).join(' ') || undefined;
  return <div {...props} className={['ui-field',className].filter(Boolean).join(' ')} data-ui-field="">
    <FieldLabel htmlFor={controlId}>{label}{required ? <span aria-hidden="true"> *</span> : null}</FieldLabel>
    {typeof children === 'function' ? children({id: controlId, invalid: hasError, describedBy}) : children}
    {hasHelp ? <div className="ui-field-help" id={helpKey}>{help}</div> : null}
    {hasError ? <div className="ui-field-error" id={errorKey} role="alert">{error}</div> : null}
  </div>;
}

/** Legacy declarative form fields share the same label/help/error renderer.
 * Existing description IDs remain stable for aria-describedby consumers. */
export function FormField({label,htmlFor,description:descriptionProp,hint,error,className,children,...props}:Omit<HTMLAttributes<HTMLDivElement>,'children'> & {label:ReactNode;htmlFor?:string;description?:ReactNode;hint?:ReactNode;error?:ReactNode;children?:ReactNode}){
 const description=descriptionProp??hint;
 const messageId=htmlFor?`${htmlFor}-descripcion`:undefined;
 const control=isValidElement(children)?children as ReactElement<Record<string,unknown>>:null;
 const described=[control?.props['aria-describedby'],messageId&&(error||description)?messageId:undefined].filter(Boolean).join(' ')||undefined;
 const linked=control?cloneElement(control,{
  ...(htmlFor&&!control.props.id?{id:htmlFor}:{}),
  ...(described?{'aria-describedby':described}:{}),
  ...(error?{'aria-invalid':true}:{}),
 }):children;
 return <Field {...props} id={htmlFor} label={label} help={description} error={error} className={className}
  helpId={description&&!error&&htmlFor?`${htmlFor}-descripcion`:undefined} errorId={error&&htmlFor?`${htmlFor}-descripcion`:undefined}>{linked}</Field>;
}
