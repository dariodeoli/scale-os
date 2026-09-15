import {ImageResponse} from 'next/og';
import {createElement as h} from 'react';
const palette={brand:'#4d0961',white:'#ffffff',soft:'#f1eaf5'};
export async function GET(){
 try{return new ImageResponse(h('div',{style:{width:'100%',height:'100%',display:'flex',flexDirection:'column',justifyContent:'space-between',padding:70,background:palette.brand,color:palette.white}},
  h('div',{style:{fontSize:40,fontWeight:700}},'scaleOS'),
  h('div',{style:{fontSize:78,fontWeight:700,lineHeight:1.1}},'Tu agencia crea. Scale OS ordena.'),
  h('div',{style:{fontSize:28,color:palette.soft}},'Producción · Clientes · Presupuestos · Cobros')),{width:1200,height:630,headers:{'Cache-Control':'public, max-age=86400'}});}
 catch{console.error(JSON.stringify({event:'share_image_error'}));return new Response('Imagen no disponible',{status:500});}
}
