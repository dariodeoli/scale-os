import type {Metadata, Viewport} from 'next';

const appOrigin='https://app.scaleparaguay.com';

// The authenticated product must never compete with the public landing in search.
// Public acquisition metadata belongs to sistema.scaleparaguay.com instead.
export const scaleMetadata:Metadata={
 metadataBase:new URL(appOrigin),
 title:{default:'Scale OS',template:'%s · Scale OS'},
 applicationName:'Scale OS',
 description:'Operación privada de clientes, producción, equipo, inventario y finanzas para agencias.',
 category:'business',
 creator:'Scale Strategy Group',
 publisher:'Scale Strategy Group',
 manifest:'/app.webmanifest',
 robots:{index:false,follow:false,nocache:true,googleBot:{index:false,follow:false,noimageindex:true,nosnippet:true}},
 icons:{
  icon:[
   {url:'/favicon.ico',sizes:'any'},
   {url:'/brand/favicon-32.png',type:'image/png',sizes:'32x32'},
   {url:'/brand/icon-192.png',type:'image/png',sizes:'192x192'},
   {url:'/brand/icon-512.png',type:'image/png',sizes:'512x512'},
  ],
  apple:[{url:'/brand/apple-touch-icon.png',type:'image/png',sizes:'180x180'}],
  shortcut:'/favicon.ico',
 },
 appleWebApp:{capable:true,title:'Scale OS',statusBarStyle:'default'},
 formatDetection:{telephone:false,address:false,email:false},
 other:{'mobile-web-app-capable':'yes'},
};

export const viewport:Viewport={themeColor:'#4d065b',colorScheme:'light'};
