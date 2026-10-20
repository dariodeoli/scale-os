'use client';
import type {ComponentProps} from 'react';
import {MenuDesplegable as LibraryMenu} from 'owncoding-ui/core';

/** One library engine for layout, keyboard, clipping and registered dialog focus. */
export function MenuDesplegable(props:ComponentProps<typeof LibraryMenu>){
 return <LibraryMenu {...props} portal/>;
}
