import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const registration=readFileSync(new URL('../app/registro/page.tsx',import.meta.url),'utf8');
assert(registration.includes('Empecemos con tu correo.'),'registration starts with email');
assert(registration.includes('Configurá tu agencia.'),'agency is collected after email');
assert(registration.includes('Protegé tu acceso.'),'password is collected in its own final step');
assert(registration.includes('GoogleSignIn'),'registration uses the shared Google entry component');
assert(registration.includes('PasswordField'),'registration uses the shared revealable password field');
const demo=readFileSync(new URL('../app/demo/page.tsx',import.meta.url),'utf8');
assert(demo.includes('/produccion?demoWelcome=1'),'a started demo opens the workspace welcome overlay');
assert(!demo.includes('Tu Demo es privado, dura hasta 24 horas'),'verbose demo notice is not left on the loading page');
console.log('PASS: progressive registration and direct Demo entry stay compact and reusable');
