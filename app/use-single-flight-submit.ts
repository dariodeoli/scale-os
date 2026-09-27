"use client";
import {useSingleFlightSubmit as useSingleFlightSubmitBase} from 'owncoding-ui';
import type {BaseSyntheticEvent} from 'react';

/**
 * Puente al envío único de owncoding-ui v0.39 (cosecha ScaleOS #2): el bloqueo
 * empieza antes de la validación asíncrona y un segundo envío se ignora.
 * Conserva la API local (`pending`) mientras los import sites migran.
 */
export function useSingleFlightSubmit(submit:(event?:BaseSyntheticEvent)=>Promise<void>|void){
 const {pendiente,onSubmit}=useSingleFlightSubmitBase(submit);
 return {pending:pendiente,onSubmit};
}
