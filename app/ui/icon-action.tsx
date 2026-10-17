'use client';

import React,{forwardRef} from 'react';
import {Check,Clock,Eye,Package,Pencil,RefreshCw,SlidersHorizontal,Trash2,X} from 'lucide-react';
import {IconButton,type ButtonColor,type IconButtonProps} from './button';

// Vocabulary audited in Scale's 23 call sites; no external icon registry.
const icons={check:Check,clock:Clock,close:X,edit:Pencil,eye:Eye,package:Package,refresh:RefreshCw,sliders:SlidersHorizontal,trash:Trash2};
export type IconActionName=keyof typeof icons;
export type IconActionTone='fono'|'ok'|'warn'|'bad';
const tones:Record<IconActionTone,ButtonColor>={fono:'brand',ok:'success',warn:'warning',bad:'danger'};
export interface IconActionProps extends Omit<IconButtonProps,'icon'> {
 // Existing inventory producers infer string; validate the finite vocabulary at runtime.
 icon:string;
 tone?:IconActionTone;
 ariaLabel?:string;
}
export const IconAction=forwardRef<HTMLButtonElement,IconActionProps>(function IconAction({
 icon,tone,label,ariaLabel,size='compact',type='button',title,color,...native
},ref){
 if(!Object.prototype.hasOwnProperty.call(icons,icon))throw new Error(`IconAction desconocido: ${icon}`);
 const Icon=icons[icon as IconActionName];
 return <IconButton {...native} ref={ref} type={type} size={size} title={title??label}
  label={native['aria-label']??ariaLabel??label} icon={<Icon size={16} aria-hidden="true"/>}
  color={color??(tone?tones[tone]:'neutral')}/>;
});
