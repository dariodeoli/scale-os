'use client';
import {useEffect,useState} from 'react';
import {Moon,Sun} from 'lucide-react';
import './theme-toggle.css';

export function ThemeToggle({className=''}:{className?:string}){
 const [dark,setDark]=useState(false);
 useEffect(()=>{
  const applied=document.documentElement.dataset.theme;
  if(applied){setDark(applied==='dark');return;}
  try{setDark(localStorage.getItem('scale-theme')==='dark');}catch{}
 },[]);
 function toggle(){
  const next=document.documentElement.dataset.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=next;
  setDark(next==='dark');
  try{localStorage.setItem('scale-theme',next);}catch{}
 }
 return <button type="button" className={className?`theme-toggle ${className}`:'theme-toggle'} onClick={toggle} aria-label="Cambiar tema" title="Cambiar tema">{dark?<Sun size={18}/>:<Moon size={18}/>}</button>;
}
