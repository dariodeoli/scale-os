'use client';
import {Input} from './input';
import {forwardRef, type InputHTMLAttributes} from 'react';

export type TemporalInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;
// Native controls preserve civil values, calendar/keyboard support and browser
// validity. No parsing to Date/UTC and no onChange-on-mount normalization.
export const DateInput = forwardRef<HTMLInputElement, TemporalInputProps>(function DateInput(props, ref) {
  return <Input {...props} ref={ref} type="date"/>;
});
export const TimeInput = forwardRef<HTMLInputElement, TemporalInputProps>(function TimeInput(props, ref) {
  return <Input {...props} ref={ref} type="time"/>;
});
export const DateTimeInput = forwardRef<HTMLInputElement, TemporalInputProps>(function DateTimeInput(props, ref) {
  return <Input {...props} ref={ref} type="datetime-local"/>;
});
