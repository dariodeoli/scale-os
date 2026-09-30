import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const registration=readFileSync(new URL('../app/registro/page.tsx',import.meta.url),'utf8');
assert(registration.includes('Empecemos con tu identidad.'),'registration starts with identity selection');
assert(registration.includes('Configurá tu agencia.'),'agency is collected after email');
assert(registration.includes('Protegé tu acceso.'),'password is collected in its own final step');
assert(registration.includes('GoogleSignIn'),'registration uses the shared Google entry component');
assert(registration.indexOf('GoogleSignIn onClick={continueWithGoogle}')<registration.indexOf('Nombre de tu agencia'),'Google starts before agency fields');
assert(registration.includes("window.location.assign('/core-api/api/auth/google/start?signup=1')"),'Google start sends identity-only signup intent through the same-origin Core API route');
assert(!registration.includes("company:company.trim(),currency,consent:'1'"),'Google OAuth start does not receive company or consent metadata');
assert(registration.includes("params.get('pendingRegistration')"),'Google callback resumes registration at agency step');
assert(registration.includes("setGoogleTicket(pending);setStep(2)"),'pending Google registration opens step 2');
assert(registration.includes("'/core-api/api/auth/google/registration/complete'"),'agency details complete through the pending-registration endpoint');
assert(registration.includes("JSON.stringify({ticket:googleTicket,company:company.trim(),currency,consent:true,privacy:privacyRecord()})"),'completion submits the ticket and required agency fields without an email override');
// Datos personales (Ley 7593/2025, Refs #113): casilla explícita, arranca sin
// marcar, con la versión del aviso y el enlace en el punto de recolección.
assert(registration.includes("useState(false)")&&registration.includes('ConsentimientoDatos'),'registration renders the shared non-premarked consent component');
assert(registration.includes("useState(false),[privacyConsent,setPrivacyConsent]=useState(false)"),'privacy consent starts unchecked');
assert(registration.includes("Acepto el tratamiento de mis datos personales"),'the consent states the purpose in the capture point');
assert(registration.includes("politicaUrl=\"/privacidad\"")&&registration.includes("version={PRIVACY_NOTICE.version}"),'the consent links the versioned notice');
assert(registration.includes("registroConsentimiento({finalidad:'cuenta-y-prestacion'"),'the acceptance records purpose, version, channel and date');
assert(registration.includes('if(!privacyConsent)'),'registration blocks without the privacy consent');
assert(registration.includes("JSON.stringify({email:email.trim(),password,full_name:fullName.trim(),company:company.trim(),currency,consent:true,privacy:privacyRecord()})"),'password registration sends the acceptance record');
assert(registration.includes('PasswordField'),'registration uses the shared revealable password field');
const demo=readFileSync(new URL('../app/demo/page.tsx',import.meta.url),'utf8');
assert(demo.includes('/produccion?demoWelcome=1'),'a started demo opens the workspace welcome overlay');
assert(!demo.includes('Tu Demo es privado, dura hasta 24 horas'),'verbose demo notice is not left on the loading page');
console.log('PASS: progressive registration and direct Demo entry stay compact and reusable');
