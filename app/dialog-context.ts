"use client";
import {createContext,useContext} from 'react';
/** afterSave bypasses only the unsaved-draft confirmation after a successful save. */
export type DialogCloseOptions={afterSave?:boolean};
export type DialogControls={requestClose:(options?:DialogCloseOptions)=>void;setPending:(id:symbol,pending:boolean)=>void;setDirty:(id:symbol,dirty:boolean)=>void};
export const DialogContext=createContext<DialogControls|null>(null);
/** Lightweight shared context: controls can coordinate dismissal without importing dialog CSS. */
export function useDialogClose(){return useContext(DialogContext)?.requestClose;}
