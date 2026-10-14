import {emailShell,emailFacts,emailParagraph,emailCode,line as singleLine} from './email-brand.js';
function appLink(appUrl){
 const url=new URL(appUrl);
 if(url.protocol!=='https:'||url.username||url.password)throw new Error('Email URL must use HTTPS without credentials');
 return url;
}
const roles={owner:'Dueño',admin:'Administrador',management:'Gerencia',finance:'Finanzas',sales:'Ventas',production:'Producción',editor:'Editor',viewer:'Solo lectura',collaborator:'Colaborador'};
const facts=emailFacts;

export function invitationEmail({email,organizationName,role,appUrl}){
 const url=appLink(appUrl);
 const organization=singleLine(organizationName),permission=Object.hasOwn(roles,role)?roles[role]:'Solo lectura';
 const subject=`Invitación a ${organization} · Scale OS`.slice(0,160);
 const text=`Te invitaron a ${organization}\n\nTu permiso: ${permission}\nCorreo con acceso: ${email}\n\nAbrí Scale OS: ${url.href}\n\nIngresá con Google usando ese mismo correo. Si preferís una contraseña y todavía no tenés una, elegí «Establecer o recuperar contraseña» en el inicio de sesión.\n\nSi participás en varias empresas, podrás elegir en cuál trabajar.\n\n¿No esperabas esta invitación? Podés ignorarla. No se crea una cuenta de Google ni se comparte tu acceso con otras personas.\n\nScale OS · Gestión de agencias\nDesarrollado por Owncoding.`;
 const html=emailShell({
  title:`Te invitaron a ${organization}`,
  lead:'Ya podés entrar al espacio de trabajo de esta empresa.',
  body:facts([['Tu permiso',permission],['Correo con acceso',email]])+emailParagraph('Ingresá con Google usando ese mismo correo, o con tu contraseña si ya la configuraste. Si participás en varias empresas, podrás elegir en cuál trabajar.'),
  cta:{label:'Abrir Scale OS',href:url.href},
  footer:'¿No esperabas esta invitación? Podés ignorarla. No se crea una cuenta de Google ni se comparte tu acceso con otras personas.',
  footerNote:'Scale OS · Gestión de agencias · Desarrollado por Owncoding.',
 });
 return{subject,text,html};
}

// The caller supplies the existing one-use token; this template grants no access.
export function resetEmail({token,appUrl}){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid password reset token');
 const url=appLink(appUrl);
 url.pathname=url.pathname.replace(/\/$/,'')+'/';
 url.search='';url.hash='';url.searchParams.set('resetToken',token);
 const subject='Establecé tu contraseña de Scale OS';
 const instructions='Este enlace es de un solo uso y vence en una hora. Si no lo solicitaste, ignorá este correo.';
 const text=`Tu contraseña de Scale OS\n\n${instructions}\n\nEstablecer contraseña: ${url.href}\n\nScale OS · Gestión de agencias\nDesarrollado por Owncoding.`;
 const html=emailShell({
  title:'Establecé tu contraseña',
  lead:instructions,
  cta:{label:'Establecer contraseña',href:url.href},
  footerNote:'Scale OS · Gestión de agencias · Desarrollado por Owncoding.',
 });
 return{subject,text,html};
}

export function verificationEmail({token,appUrl}){
 if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw new Error('Invalid verification token');
 const url=appLink(appUrl);
 url.pathname=url.pathname.replace(/\/$/,'')+'/verificar-correo';
 url.search='';url.hash='';url.searchParams.set('verifyToken',token);
 const subject='Verificá tu correo de Scale OS';
 const instructions='Este enlace es de un solo uso y vence en 24 horas. Hasta verificarlo no se activa una prueba ni se solicita acceso a una empresa.';
 const text=`Verificá tu correo de Scale OS\n\n${instructions}\n\nVerificar correo: ${url.href}\n\nScale OS · Gestión de agencias · Desarrollado por Owncoding`;
 const html=emailShell({
  title:'Verificá tu correo',
  lead:instructions,
  cta:{label:'Verificar correo',href:url.href},
  footerNote:'Scale OS · Gestión de agencias · Desarrollado por Owncoding',
 });
 return{subject,text,html};
}

export function accessGrantedEmail({email,organizationName,role,appUrl}){
 const url=appLink(appUrl);
 const organization=singleLine(organizationName),permission=Object.hasOwn(roles,role)?roles[role]:'Solo lectura';
 const subject=`Tu acceso a ${organization} está habilitado · Scale OS`.slice(0,160);
 const text=`Tu acceso a ${organization} está habilitado\n\nTu permiso: ${permission}\nCorreo con acceso: ${email}\n\nAbrí Scale OS: ${url.href}\n\nIngresá con Google usando ese mismo correo, o con tu contraseña si ya la configuraste.\n\nScale OS · Gestión de agencias · Desarrollado por Owncoding`;
 const html=emailShell({
  title:`Tu acceso a ${organization} está habilitado`,
  lead:'Ya podés entrar al espacio de trabajo.',
  body:facts([['Tu permiso',permission],['Correo con acceso',email]])+emailParagraph('Ingresá con Google usando ese mismo correo, o con tu contraseña si ya la configuraste.'),
  cta:{label:'Entrar a Scale OS',href:url.href},
  footer:'¿No reconocés este acceso? Avisale al administrador de tu empresa.',
  footerNote:'Scale OS · Gestión de agencias · Desarrollado por Owncoding',
 });
 return{subject,text,html};
}

export function destructiveReauthEmail({code}){
 if(typeof code!=='string'||!/^\d{8}$/.test(code))throw new Error('Invalid destructive reauthentication code');
 const subject='Código para confirmar una eliminación en Scale OS';
 const instructions='Usá este código de un solo uso para confirmar la eliminación. Vence en 5 minutos. Si no iniciaste esta operación, ignorá este correo.';
 const text=`Confirmación de eliminación en Scale OS\n\n${instructions}\n\nCódigo: ${code}\n\nScale OS · Gestión de agencias\nDesarrollado por Owncoding.`;
 const html=emailShell({
  eyebrow:'Seguridad de cuenta',
  title:'Confirmá la eliminación',
  lead:instructions,
  body:emailCode(code),
  footerNote:'Scale OS · Gestión de agencias · Desarrollado por Owncoding.',
 });
 return{subject,text,html};
}
