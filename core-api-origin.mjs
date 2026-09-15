const defaultCoreApiOrigin='https://api.scaleparaguay.com';

export function resolveCoreApiOrigin(value=process.env.SCALE_API_ORIGIN||defaultCoreApiOrigin) {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('SCALE_API_ORIGIN debe ser un origen HTTPS sin ruta ni credenciales.');
 return url.origin;
}
