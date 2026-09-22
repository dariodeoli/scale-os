import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {workspaceSource} from './workspace-source';

const suite=readFileSync(new URL('../app/suite.tsx',import.meta.url),'utf8');
const workspace=workspaceSource();
const guide=readFileSync(new URL('../app/workspace-guide.tsx',import.meta.url),'utf8');
const styles=readFileSync(new URL('../app/settings-slice.css',import.meta.url),'utf8');

test('settings slice keeps the server-backed company update and its full validation form',()=>{
 assert.match(suite,/api<\{default_currency:typeof currencies\[number\]\['value'\]\}>\('\/api\/agency\/settings',\{\.\.\.v,onboarding_completed:true\},'PATCH'\)/);
 assert.match(suite,/key:'name',label:'Nombre de la empresa'/);
 assert.match(suite,/key:'default_currency',label:'Moneda predeterminada',choices:currencies/);
 assert.match(suite,/key:'legal_name'.*section:'Datos fiscales y contacto'/);
 assert.match(suite,/setCurrency\(result\.default_currency\)/);
});

test('preferences remain scoped to local storage while settings use compact, accessible disclosure',()=>{
 assert.match(workspace,/useWorkspacePreferences\(signedIn\?String/);
 assert.match(workspace,/active==='Preferencias'/);
 assert.match(workspace,/updatePreferences\(\{startup:startup as StartupPreference\}\)/);
 assert.match(styles,/min-height:44px/);
 assert.match(styles,/:focus-visible\{outline:3px/);
 assert.match(styles,/@media\(prefers-reduced-motion:reduce\)/);
});

test('integration rows communicate unconfigured status and company creation remains progressive',()=>{
 assert.equal((suite.match(/No configurado/g)||[]).length,2);
 assert.match(suite,/Este panel no conecta cuentas ni envía mensajes/);
 assert.match(guide,/<details className="settings-disclosure"><summary>Cómo funciona una empresa adicional<\/summary>/);
 assert(guide.includes("'/api/auth/organizations'"));
 assert(guide.includes("'/api/auth/switch-organization'"));
});
