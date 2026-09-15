'use client';
import {useState} from 'react';
import {actorInitials,safePhoto} from './actor-identity';
import './person-container.css';

export type PersonContainerProps={
 name:string;
 photoUrl?:string|null;
 secondary?:string|null;
 verified?:boolean;
 size?:'sm'|'md'|'lg';
 className?:string;
};
export function PersonContainer({name,photoUrl,secondary,verified=false,size='md',className=''}:PersonContainerProps){
 const photo=verified?safePhoto(photoUrl):'';
 return <span className={`person-container person-container-${size}${className?' '+className:''}`}>
  <PersonAvatar name={name} photo={photo}/>
  <span className="person-container-details">
   <span className="person-container-name">{name}</span>
   {secondary?<span className="person-container-secondary">{secondary}</span>:null}
  </span>
 </span>;
}
function PersonAvatar({name,photo}:{name:string;photo:string}){
 const [failed,setFailed]=useState(false);
 return <span className="person-container-avatar" aria-hidden="true">{photo&&!failed?<img src={photo} alt="" referrerPolicy="no-referrer" loading="lazy" onError={()=>setFailed(true)}/>:actorInitials(name)}</span>;
}
