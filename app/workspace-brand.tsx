import React from 'react';

/** Shared Scale identity in the desktop sidebar, mobile drawer and top bar. */
export function WorkspaceBrand(){
 return <span className="workspace-brand" aria-label="Scale OS">
  <img src="https://scaleparaguay.com/assets/icon-192.png" width={34} height={34} alt=""/>
  <span className="workspace-wordmark">scale<span>OS</span></span>
 </span>;
}
