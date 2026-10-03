import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {SOCIAL_PROVIDERS, appleClientSecret, decodeJwtPayload, exchangeSocialCode, pkceChallenge, pkcePair, resolveSocialIdentity, socialAuthorizeUrl, socialProviderConfig, socialProvidersStatus} from './social-auth.js';

// SSO Fase 1 (#159): registro de proveedores, PKCE/nonce, canje mockeado de
// Microsoft/Apple y vinculación por correo verificado. Sin red y sin claves
// reales: los proveedores se mockean y las claves se generan en el test.
const env={
  GOOGLE_CLIENT_ID:'g-id',GOOGLE_CLIENT_SECRET:'g-secret',
  MICROSOFT_CLIENT_ID:'m-id',MICROSOFT_CLIENT_SECRET:'m-secret',MICROSOFT_TENANT_ID:'contoso.onmicrosoft.com',
  APPLE_CLIENT_ID:'com.scale.service',APPLE_TEAM_ID:'TEAM123456',APPLE_KEY_ID:'KEY789',
  APPLE_PRIVATE_KEY:'test-key',
};

assert.deepEqual(SOCIAL_PROVIDERS,['google','microsoft','apple']);
assert.deepEqual(socialProvidersStatus({}),{google:false,microsoft:false,apple:false},'sin env no hay proveedores');
assert.deepEqual(socialProvidersStatus(env),{google:true,microsoft:true,apple:true},'con env los tres quedan disponibles');
assert.equal(socialProviderConfig('microsoft',env).tenant,'contoso.onmicrosoft.com');
assert.equal(socialProviderConfig('apple',env).teamId,'TEAM123456');

// PKCE: el challenge S256 siempre corresponde al verifier.
const pkce=pkcePair();
assert.equal(pkceChallenge(pkce.verifier),pkce.challenge,'PKCE S256');
assert.ok(pkce.verifier.length>=43,'verifier con entropía suficiente');

// Authorize: Microsoft por query, Apple por form_post, ambos con state y PKCE.
const msUrl=socialAuthorizeUrl('microsoft',{state:'s1',redirectUri:'https://admin.scaleparaguay.com/api/auth/microsoft/callback',codeChallenge:'c1',nonce:'n1'},env);
assert.ok(msUrl.startsWith('https://login.microsoftonline.com/contoso.onmicrosoft.com/oauth2/v2.0/authorize?'),msUrl);
assert.ok(msUrl.includes('code_challenge_method=S256')&&msUrl.includes('nonce=n1')&&msUrl.includes('state=s1'));
const appleUrl=socialAuthorizeUrl('apple',{state:'s2',redirectUri:'https://admin.scaleparaguay.com/api/auth/apple/callback',codeChallenge:'c2',nonce:'n2'},env);
assert.ok(appleUrl.startsWith('https://appleid.apple.com/auth/authorize?'));
assert.ok(appleUrl.includes('response_mode=form_post')&&appleUrl.includes('scope=name+email'));

// Client secret de Apple: JWT ES256 verificable con la clave pública.
const {privateKey,publicKey}=crypto.generateKeyPairSync('ec',{namedCurve:'P-256'});
const pem=privateKey.export({type:'pkcs8',format:'pem'}).toString();
const appleEnv={...env,APPLE_PRIVATE_KEY:pem};
const secret=appleClientSecret({clientId:'com.scale.service',teamId:'TEAM123456',keyId:'KEY789',privateKey:pem},1000);
const [header,payload,signature]=secret.split('.');
const claims=JSON.parse(Buffer.from(payload,'base64url').toString());
assert.deepEqual(JSON.parse(Buffer.from(header,'base64url').toString()),{alg:'ES256',kid:'KEY789',typ:'JWT'});
assert.equal(claims.iss,'TEAM123456');assert.equal(claims.sub,'com.scale.service');assert.equal(claims.aud,'https://appleid.apple.com');assert.equal(claims.exp-claims.iat,300);
assert.equal(crypto.verify('sha256',Buffer.from(`${header}.${payload}`),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url')),true,'firma ES256 válida');
assert.deepEqual(decodeJwtPayload(secret),claims);
assert.throws(()=>decodeJwtPayload('no-es-un-token'),/token inválido/i);

// Microsoft: el canje manda PKCE y el correo del userinfo OIDC queda verificado.
const msCalls=[];
const msFetch=async(url,init={})=>{
  msCalls.push({url:String(url),body:init.body?String(init.body):''});
  if(String(url).includes('/token'))return {ok:true,json:async()=>({access_token:'at-ms'})};
  return {ok:true,json:async()=>({sub:'ms-sub-1',email:'ana@contoso.com',name:'Ana Pérez'})};
};
const msProfile=await exchangeSocialCode('microsoft',{code:'code-ms',redirectUri:'https://admin.scaleparaguay.com/api/auth/microsoft/callback',codeVerifier:'verifier-ms',nonce:'nonce-ms',fetchImpl:msFetch,env});
assert.deepEqual(msProfile,{subject:'ms-sub-1',email:'ana@contoso.com',emailVerified:true,name:'Ana Pérez',picture:null});
assert.ok(msCalls[0].body.includes('code_verifier=verifier-ms'),'Microsoft recibe el verifier de PKCE');
const msNoEmail=async(url)=>({ok:true,json:async()=>String(url).includes('/token')?{access_token:'at'}:{sub:'ms-sub-2'}});
await assert.rejects(()=>exchangeSocialCode('microsoft',{code:'c',redirectUri:'r',fetchImpl:msNoEmail,env}),/no confirmó un correo/i);

// Apple: id_token con iss/aud/exp/nonce y email_verified obligatorio.
const idToken=(claims)=>`${Buffer.from('{}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.firma`;
const appleFetch=(claims)=>{const calls=[];return {calls,fetch:async(url,init={})=>{calls.push({url:String(url),body:init.body?String(init.body):''});return {ok:true,json:async()=>({id_token:idToken(claims)})};}};};
const baseClaims={iss:'https://appleid.apple.com',aud:'com.scale.service',sub:'apple-sub-1',email:'ana@icloud.com',email_verified:'true',nonce:'nonce-apple',exp:Math.floor(Date.now()/1000)+600};
const apple=appleFetch(baseClaims);
const appleProfile=await exchangeSocialCode('apple',{code:'code-apple',redirectUri:'https://admin.scaleparaguay.com/api/auth/apple/callback',codeVerifier:'verifier-apple',nonce:'nonce-apple',fetchImpl:apple.fetch,env:appleEnv});
assert.deepEqual(appleProfile,{subject:'apple-sub-1',email:'ana@icloud.com',emailVerified:true,name:'',picture:null});
assert.ok(apple.calls[0].body.includes('client_secret='),'Apple recibe el client secret JWT');
await assert.rejects(()=>exchangeSocialCode('apple',{code:'c',redirectUri:'r',nonce:'otro',fetchImpl:appleFetch(baseClaims).fetch,env:appleEnv}),/nonce/i);
await assert.rejects(()=>exchangeSocialCode('apple',{code:'c',redirectUri:'r',nonce:'nonce-apple',fetchImpl:appleFetch({...baseClaims,email_verified:'false'}).fetch,env:appleEnv}),/correo verificado/i);
await assert.rejects(()=>exchangeSocialCode('apple',{code:'c',redirectUri:'r',nonce:'nonce-apple',fetchImpl:appleFetch({...baseClaims,exp:Math.floor(Date.now()/1000)-10}).fetch,env:appleEnv}),/token inválido/i);

// Vinculación: subject nuevo + correo verificado de un usuario existente.
const pg=new PGlite();
await pg.exec('create table users(id bigserial primary key,email text)');
await pg.exec('create table oauth_states(state text primary key)');
await pg.exec(await fs.readFile(new URL('./migrations/20261003_social_identities.sql',import.meta.url),'utf8'));
const db={query:(sql,params)=>pg.query(sql,params)};
const userId=(await pg.query("insert into users(email) values ('ana@contoso.com') returning id")).rows[0].id;
const first=await resolveSocialIdentity(db,{provider:'microsoft',subject:'ms-sub-1',email:'ana@contoso.com',emailVerified:true});
assert.equal(String(first.userId),String(userId));assert.equal(first.linkedNow,true);
assert.equal((await pg.query('select count(*)::int as n from user_social_identities')).rows[0].n,1,'la identidad quedó vinculada');
const again=await resolveSocialIdentity(db,{provider:'microsoft',subject:'ms-sub-1',email:'otro@contoso.com',emailVerified:true});
assert.equal(String(again.userId),String(userId),'el subject ya vinculado manda sobre el correo');
assert.equal((await pg.query("select count(*)::int as n from user_social_identities where provider='microsoft'")).rows[0].n,1,'no duplica por reintento');
assert.equal(await resolveSocialIdentity(db,{provider:'apple',subject:'apple-x',email:'nadie@icloud.com',emailVerified:true}),null,'sin usuario no hay vínculo');
assert.equal(await resolveSocialIdentity(db,{provider:'apple',subject:'apple-y',email:'ana@contoso.com',emailVerified:false}),null,'sin correo verificado no vincula');
const appleLink=await resolveSocialIdentity(db,{provider:'apple',subject:'apple-sub-9',email:'ANA@contoso.com',emailVerified:true});
assert.equal(String(appleLink.userId),String(userId),'otro proveedor con el mismo correo verificado se vincula');
assert.equal((await pg.query("select count(*)::int as n from user_social_identities where user_id=$1",[userId])).rows[0].n,2,'el usuario acumula dos proveedores');
await pg.close();

console.log('PASS: SSO #159 — tres proveedores, PKCE/nonce, client secret ES256 de Apple, canje mockeado de Microsoft/Apple y vinculación por correo verificado sin duplicar.');
