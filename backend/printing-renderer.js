/** Pure, browser-safe composition for Scale's 80 mm thermal documents. */
export const PRINT_KINDS = Object.freeze(['test', 'receipt', 'quote', 'inventory-label']);
export const PRINT_TEMPLATE_80 = Object.freeze({version:1,widthMm:80,heightMm:'auto',orientation:'portrait',marginsMm:Object.freeze({top:2,right:4,bottom:2,left:4}),fontSize:10,autoCut:false});
export const PRINT_MAX_PAYLOAD_BYTES = 65536;
const DPI = 203;
const NON_FISCAL = 'Documento no fiscal - No valido como factura';
const allowed = (input, keys, field) => {
 if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error(`${field}: objeto requerido`);
 for (const key of Object.keys(input)) if (!keys.includes(key)) throw new Error(`${field}: campo no admitido ${key}`);
};
function number(value, min, max, field) {
 if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${field}: fuera de rango`);
 return value;
}
function text(value, max, field, required=false) {
 if (value === undefined || value === null) { if(required) throw new Error(`${field}: requerido`); return ''; }
 if(typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f-\u009f]/u.test(value)) throw new Error(`${field}: texto invalido`);
 const result=value.trim();
 if(required && !result) throw new Error(`${field}: requerido`);
 return result;
}
/** Convert mm to CSS pixels without relying on a browser's device pixel ratio. */
export function printMmToPx(mm) { return number(mm,0,1000,'mm') * 96 / 25.4; }
export function normalizePrintTemplate(input={}) {
 allowed(input,['version','widthMm','heightMm','orientation','marginsMm','fontSize','autoCut'],'plantilla');
 const template={...PRINT_TEMPLATE_80,...input};
 if(template.version!==1 || template.widthMm!==80 || template.heightMm!=='auto' || template.orientation!=='portrait') throw new Error('Solo plantilla version 1, termica 80 mm vertical');
 const margins={...PRINT_TEMPLATE_80.marginsMm};
 if(input.marginsMm!==undefined) { allowed(input.marginsMm,['top','right','bottom','left'],'margenes'); Object.assign(margins,input.marginsMm); }
 for(const side of Object.keys(margins)) margins[side]=number(margins[side],0,10,`margen ${side}`);
 if(80-margins.left-margins.right<56) throw new Error('Area imprimible insuficiente');
 template.fontSize=number(template.fontSize,8,14,'fuente');
 if(!Number.isInteger(template.fontSize)) throw new Error('Fuente debe ser entera');
 if(typeof template.autoCut!=='boolean') throw new Error('Corte debe ser booleano');
 return Object.freeze({...template,marginsMm:Object.freeze(margins)});
}
export function normalizePrintDocument(kind,input) {
 if(!PRINT_KINDS.includes(kind)) throw new Error('Tipo de documento no admitido');
 allowed(input,['kind','reference','title','companyName','companyRuc','customerName','issuedAt','lines','total','notes','inventoryCode','confirmationSuffix'],'documento');
 if(input.kind!==undefined && input.kind!==kind) throw new Error('Tipo de documento inconsistente');
 const document={kind,reference:text(input.reference,80,'referencia',true),title:text(input.title,120,'titulo'),companyName:text(input.companyName,120,'empresa'),companyRuc:text(input.companyRuc,40,'RUC'),customerName:text(input.customerName,120,'cliente'),issuedAt:text(input.issuedAt,25,'fecha'),total:text(input.total,80,'total'),notes:text(typeof input.notes==='string'?input.notes.replace(/\r\n|\n/g,' '):input.notes,600,'notas'),inventoryCode:text(input.inventoryCode,24,'codigo'),confirmationSuffix:text(input.confirmationSuffix,16,'confirmacion')};
 if(document.issuedAt && (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/.test(document.issuedAt) || Number.isNaN(Date.parse(document.issuedAt)) || new Date(document.issuedAt).toISOString().slice(0,10)!==document.issuedAt.slice(0,10))) throw new Error('Fecha ISO invalida');
 if(document.confirmationSuffix && !/^[A-Za-z0-9-]{4,16}$/.test(document.confirmationSuffix)) throw new Error('Confirmacion invalida');
 if(document.inventoryCode && (!/^[0-9A-Z\-. $/+%]+$/.test(document.inventoryCode) || kind!=='inventory-label')) throw new Error('Codigo Code39 de inventario invalido');
 if(kind==='inventory-label' && !document.inventoryCode) throw new Error('Codigo existente de inventario requerido');
 if(input.lines!==undefined && (!Array.isArray(input.lines) || input.lines.length>30)) throw new Error('Maximo 30 lineas');
 document.lines=Object.freeze((input.lines||[]).map(line=> {allowed(line,['label','value'],'linea');return Object.freeze({label:text(line.label,120,'concepto',true),value:text(line.value,80,'valor')});}));
 return Object.freeze(document);
}
// A device's character table cannot be inferred from an 80 mm roll. Until the
// model/code page is physically verified, preview AND paper use printable ASCII.
function ascii(value) { return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?'); }
function wrap(value,columns) {
 const lines=[]; let remaining=ascii(value);
 while(remaining.length>columns) {let split=remaining.lastIndexOf(' ',columns); if(split<Math.floor(columns/2)) split=columns; lines.push(remaining.slice(0,split)); remaining=remaining.slice(split).trimStart();}
 if(remaining) lines.push(remaining);
 return lines;
}
const code39Characters='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%*';
// Existing Scale inventory-label.tsx encoding, tested byte-for-byte against it.
const code39Encodings=[20957,29783,23639,30485,20951,29813,23669,20855,29789,23645,29975,23831,30533,22295,30149,24005,21623,29981,23837,22301,30023,23879,30545,22343,30161,24017,21959,30065,23921,22385,29015,18263,29141,17879,29045,18293,17783,29021,18269,17477,17489,17681,20753,35770];
export function printCode39Bits(value) {
 if(typeof value!=='string' || !/^[0-9A-Z\-. $/+%]{1,24}$/.test(value)) throw new Error('Code39 invalido');
 const encoding=character=>code39Encodings[code39Characters.indexOf(character)].toString(2);
 return `${encoding('*')}${Array.from(value).map(character=>encoding(character)+'0').join('')}${encoding('*')}`;
}
function compose(template,document) {
 // ESC/POS font A: 12 x 24 dots. Integer magnification is deterministic and
 // represented by the same cell dimensions in the HTML preview.
 const scale=template.fontSize>=13?2:1;
 const cellDots=12*scale, lineDots=30*scale;
 const widthDots=Math.floor((80-template.marginsMm.left-template.marginsMm.right)*DPI/25.4);
 const columns=Math.floor(widthDots/cellDots);
 const lines=[];
 const add=(value,bold=false)=>{for(const line of wrap(value,columns)) lines.push({text:line,bold});};
 if(document.companyName) add(document.companyName,true);
 if(document.companyRuc) add(`RUC: ${document.companyRuc}`);
 add(document.title || ({test:'Prueba de impresion',receipt:'Recibo de pago',quote:'Presupuesto', 'inventory-label':'Inventario'}[document.kind]),true);
 add(document.reference);
 if(document.issuedAt) add(document.issuedAt);
 if(document.customerName) add(`Cliente: ${document.customerName}`);
 for(const row of document.lines) add(row.value?`${row.label}: ${row.value}`:row.label);
 if(document.total) add(`Total: ${document.total}`,true);
 if(document.notes) add(document.notes);
 add(NON_FISCAL);
 if(document.confirmationSuffix) add(`Confirmar papel: ${document.confirmationSuffix}`);
 let barcode=null;
 if(document.inventoryCode) {
  const bits=printCode39Bits(document.inventoryCode), moduleDots=2, quietDots=20;
  const barcodeWidthDots=bits.length*moduleDots+quietDots*2;
  if(barcodeWidthDots>widthDots) throw new Error('Codigo existente no cabe con zona segura; usar etiqueta original 80 x 50 mm');
  barcode={bits,moduleDots,quietDots,widthDots:barcodeWidthDots,heightDots:96,value:document.inventoryCode};
  add(document.inventoryCode);
 }
 return {lines,columns,scale,cellDots,lineDots,widthDots,barcode};
}
const escapeHtml=value=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function preview(template,layout) {
 const mm=dots=>dots*25.4/DPI;
 let barcode='';
 if(layout.barcode) {
  const b=layout.barcode;
  const bars=Array.from(b.bits,(bit,index)=>bit==='1'?`<rect x="${b.quietDots+index*b.moduleDots}" y="0" width="${b.moduleDots}" height="${b.heightDots}"/>`:'').join('');
  barcode=`<svg role="img" aria-label="Codigo de barras ${escapeHtml(b.value)}" viewBox="0 0 ${b.widthDots} ${b.heightDots}" width="${mm(b.widthDots)}mm" height="${mm(b.heightDots)}mm" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
 }
 const rows=layout.lines.map(line=>`<div class="line${line.bold?' bold':''}">${escapeHtml(line.text)||' '}</div>`).join('');
 return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vista previa termica 80 mm</title><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;color:#000}main{width:80mm;padding:${template.marginsMm.top}mm ${template.marginsMm.right}mm ${template.marginsMm.bottom}mm ${template.marginsMm.left}mm}.line{font-family:monospace;font-size:${mm(20*layout.scale)}mm;line-height:${mm(layout.lineDots)}mm;letter-spacing:0;white-space:pre;overflow-wrap:normal;min-height:${mm(layout.lineDots)}mm;width:${mm(layout.columns*layout.cellDots)}mm}.bold{font-weight:700}svg{display:block;max-width:100%;fill:#000}.guides{border:0}</style></head><body><main data-width-mm="80" data-columns="${layout.columns}" data-template-version="${template.version}">${rows}${barcode}</main></body></html>`;
}
function encodeEscPos(template,layout) {
 const bytes=[0x1b,0x40,0x1b,0x4d,0,0x1b,0x74,0,0x1d,0x21,layout.scale===2?0x11:0];
 const push=(...values)=>bytes.push(...values);
 const dots=mm=>Math.round(mm*DPI/25.4);
 // GS L left margin and GS W print width use 1/203-inch motion units.
 const left=dots(template.marginsMm.left); push(0x1d,0x4c,left&255,left>>8,0x1d,0x57,layout.widthDots&255,layout.widthDots>>8);
 push(0x1b,0x33,layout.lineDots);
 const feed=mm=> {let remaining=dots(mm);while(remaining>0){const next=Math.min(255,remaining);push(0x1b,0x4a,next);remaining-=next;}};
 feed(template.marginsMm.top);
 for(const line of layout.lines){ push(0x1b,0x45,line.bold?1:0);for(const character of line.text) push(character.charCodeAt(0));push(10); }
 if(layout.barcode) {
  const b=layout.barcode, rowBytes=Math.ceil(b.widthDots/8);
  push(0x1d,0x76,0x30,0,rowBytes&255,rowBytes>>8,b.heightDots&255,b.heightDots>>8);
  for(let y=0;y<b.heightDots;y++) for(let byte=0;byte<rowBytes;byte++) {let value=0;for(let bit=0;bit<8;bit++){const x=byte*8+bit-b.quietDots; if(x>=0 && x<b.bits.length*b.moduleDots && b.bits[Math.floor(x/b.moduleDots)]==='1') value|=1<<(7-bit);}push(value);}
  push(10);
 }
 feed(template.marginsMm.bottom);
 if(template.autoCut) { push(10,10,10,0x1d,0x56,0x42,0); }
 return bytes;
}
function base64(bytes) {
 const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let output='';
 for(let i=0;i<bytes.length;i+=3){const a=bytes[i],b=bytes[i+1],c=bytes[i+2],v=(a<<16)|((b||0)<<8)|(c||0);output+=alphabet[(v>>>18)&63]+alphabet[(v>>>12)&63]+(b===undefined?'=':alphabet[(v>>>6)&63])+(c===undefined?'=':alphabet[v&63]);}
 return output;
}
export function renderPrintPreview({template,document}) {
 const normalizedTemplate=normalizePrintTemplate(template), normalizedDocument=normalizePrintDocument(document?.kind,document);
 return preview(normalizedTemplate,compose(normalizedTemplate,normalizedDocument));
}
export function renderPrintDocument({template,document,copies=1}) {
 if(!Number.isInteger(copies) || copies<1 || copies>5) throw new Error('Copias entre 1 y 5');
 const snapshot=normalizePrintTemplate(template), normalizedDocument=normalizePrintDocument(document?.kind,document), layout=compose(snapshot,normalizedDocument);
 const single=encodeEscPos(snapshot,layout);
 if(single.length*copies>PRINT_MAX_PAYLOAD_BYTES) throw new Error('Payload excede 64 KiB');
 const bytes=[];for(let copy=0;copy<copies;copy++) bytes.push(...single);
 return {snapshot,html:preview(snapshot,layout),payloadBase64:base64(bytes),payloadBytes:bytes.length};
}
