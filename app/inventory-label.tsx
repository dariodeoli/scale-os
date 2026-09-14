"use client";

// Code 39 is deliberately used because the inventory code is short, printable
// and can be scanned without a network request or a third-party renderer.
const code39Characters='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*';
const code39Encodings=[20957,29783,23639,30485,20951,29813,23669,20855,29789,23645,29975,23831,30533,22295,30149,24005,21623,29981,23837,22301,30023,23879,30545,22343,30161,24017,21959,30065,23921,22385,29015,18263,29141,17879,29045,18293,17783,29021,18269,17477,17489,17681,20753,35770];

export function inventoryCode(id:string|number){
 const value=String(id);
 if(!/^\d{1,19}$/.test(value))return `SC-${value.replace(/[^A-Za-z0-9-]/g,'').toUpperCase().slice(0,24)}`;
 return `SC-${value.padStart(6,'0')}`;
}

export function code39Bits(value:string){
 const data=value.toUpperCase();
 if(!/^[0-9A-Z\-. $/+%]+$/.test(data))throw new Error('El código de inventario contiene caracteres no imprimibles');
 const encoding=(character:string)=>code39Encodings[code39Characters.indexOf(character)].toString(2);
 return `${encoding('*')}${Array.from(data).map(character=>encoding(character)+'0').join('')}${encoding('*')}`;
}

function escapeHtml(value:string){return value.replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]!));}
function barcodeMarkup(value:string){
 const bits=code39Bits(value),width=bits.length+20;
 const bars=Array.from(bits).map((bit,index)=>bit==='1'?`<rect x="${index+10}" y="0" width="1" height="48"/>`:'').join('');
 return `<svg viewBox="0 0 ${width} 64" role="img" aria-label="Código de barras ${escapeHtml(value)}" xmlns="http://www.w3.org/2000/svg"><g fill="#111">${bars}</g><text x="${width/2}" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" letter-spacing="1">${escapeHtml(value)}</text></svg>`;
}

export function InventoryBarcode({code}:{code:string}){
 const bits=code39Bits(code),width=bits.length+20;
 return <svg className="inventory-barcode" viewBox={`0 0 ${width} 64`} role="img" aria-label={`Código de barras ${code}`}><g fill="currentColor">{Array.from(bits).map((bit,index)=>bit==='1'?<rect key={index} x={index+10} y="0" width="1" height="48"/>:null)}</g><text x={width/2} y="60" textAnchor="middle">{code}</text></svg>;
}

export function printInventoryLabel({code,name,category,serial,location}:{code:string;name:string;category:string;serial?:string|null;location:string}){
 const popup=window.open('','_blank','width=520,height=380');
 if(!popup){window.alert('Permití ventanas emergentes para imprimir la etiqueta.');return;}
 const details=[category,serial?`Serie / IMEI: ${serial}`:'',location].filter(Boolean).map(value=>`<p>${escapeHtml(value)}</p>`).join('');
 popup.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Etiqueta ${escapeHtml(code)}</title><style>@page{size:80mm 50mm;margin:0}body{margin:0;font-family:Arial,sans-serif;color:#151219}.label{box-sizing:border-box;width:80mm;height:50mm;padding:5mm;border:1px solid #111;display:grid;grid-template-columns:1fr 29mm;gap:3mm}.code{font:700 10pt monospace;letter-spacing:.7pt;margin:0 0 2mm}.name{font-size:13pt;line-height:1.15;margin:0}.details{margin-top:3mm;font-size:8pt;color:#48424b}.details p{margin:1mm 0}.barcode{align-self:end}.barcode svg{width:100%;height:auto;display:block}</style></head><body><main class="label"><section><p class="code">${escapeHtml(code)}</p><h1 class="name">${escapeHtml(name)}</h1><div class="details">${details}</div></section><div class="barcode">${barcodeMarkup(code)}</div></main><script>window.onload=()=>window.print()</script></body></html>`);
 popup.document.close();
}
