export function parseStatementCsv(input:string){
 if(input.length>800000)throw new Error('El archivo supera el límite de 800 KB');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 const source=input.replace(/^\uFEFF/,'');
 for(let i=0;i<source.length;i++){
  const char=source[i];
  if(char==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell!=='')throw new Error('Comillas inválidas en el CSV');else quoted=!quoted;}
  else if(!quoted&&(char===','||char==='\n')){row.push(cell.trim());cell='';if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}
  else if(char!=='\r'||quoted)cell+=char;
 }
 if(quoted)throw new Error('El CSV tiene comillas sin cerrar');row.push(cell.trim());if(row.some(Boolean))rows.push(row);
 const headers=rows.shift()?.map(h=>h.toLowerCase());if(headers?.join(',')!=='id,fecha,importe,referencia')throw new Error('Encabezado requerido: id,fecha,importe,referencia');
 if(!rows.length||rows.length>1000)throw new Error('Importá entre 1 y 1.000 movimientos');
 const ids=new Set<string>();return rows.map((r,index)=>{
  if(r.length!==4||!r[0]||ids.has(r[0])||!/^\d{4}-\d{2}-\d{2}$/.test(r[1])||! /^-?\d+(\.\d{1,2})?$/.test(r[2])||Number(r[2])===0)throw new Error(`Fila ${index+2}: revisá ID único, fecha e importe (sin separador de miles)`);
  ids.add(r[0]);return{external_id:r[0],booked_on:r[1],amount:r[2],reference:r[3]};
 });
}
