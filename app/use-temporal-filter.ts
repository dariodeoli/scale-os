'use client';
import {useCallback,useRef,useState,type Dispatch,type SetStateAction} from 'react';

/** Keep editable raw text separate from the last value accepted by the caller's query policy. */
export function useTemporalFilter<T>(initial:T|(()=>T),resolve:(draft:T)=>T|null):[T,Dispatch<SetStateAction<T>>,T,Dispatch<SetStateAction<T>>]{
 const policy=useRef(resolve);policy.current=resolve;
 const [state,setState]=useState(()=>{const value=typeof initial==='function'?(initial as ()=>T)():initial;return {applied:value,draft:value};});
 const setApplied=useCallback<Dispatch<SetStateAction<T>>>(next=>setState(current=>{const value=typeof next==='function'?(next as (value:T)=>T)(current.applied):next;return {applied:value,draft:value};}),[]);
 const setDraft=useCallback<Dispatch<SetStateAction<T>>>(next=>setState(current=>{const draft=typeof next==='function'?(next as (value:T)=>T)(current.draft):next;const applied=policy.current(draft);return {draft,applied:applied===null?current.applied:applied};}),[]);
 return [state.applied,setApplied,state.draft,setDraft];
}
