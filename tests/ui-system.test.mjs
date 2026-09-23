import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const css=readFileSync('app/ui-system.css','utf8'),ast=postcss.parse(css);
assert(readFileSync('app/layout.tsx','utf8').includes("import './ui-system.css'"));
const tokens={};ast.walkRules(':root',rule=>{if(rule.parent.type==='root')rule.walkDecls(d=>tokens[d.prop]=d.value);});
const foundation={};postcss.parse(readFileSync('app/globals.css','utf8')).walkRules(':root',rule=>{if(rule.parent.type==='root')rule.walkDecls(d=>foundation[d.prop]=d.value);});
function resolveToken(value){let current=value,seen=new Set();while(current.startsWith('var(--')&&!seen.has(current)){seen.add(current);const name=current.slice(4,-1);const next=tokens[name]??foundation[name];if(!next)break;current=next;}return current;}
assert.deepEqual([1,2,3,4,5,6].map(n=>tokens[`--ui-space-${n}`]),['4px','8px','12px','16px','20px','24px']);
assert.equal(tokens['--ui-control-height'],'40px');
assert(css.includes('--ui-control-height:44px'));
function luminance(hex){const c=hex.replace('#','').match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
for(const background of ['#ffffff','#fbfafc']){const light=luminance(background),dark=luminance(resolveToken(tokens['--ui-field-border']));assert((light+.05)/(dark+.05)>=3,'input boundaries need sufficient contrast');}
assert(css.includes('.control-shell .panel .panel{padding:0;border:0;box-shadow:none}'));
assert(css.includes('.control-shell :is(.ops-stack,.finance-grid)>.panel+.panel{margin-top:0}'));
assert(css.includes('.control-shell .production-panel,.control-shell .production-focus{padding:0;border:0;background:transparent}'));
assert(css.includes('font-variant-numeric:tabular-nums'));
assert(css.includes('.quote-preview{position:static;top:auto;width:auto;height:auto;display:block;min-width:0;max-width:100%'),'document aside must not inherit sidebar height/width/stickiness');
assert(css.includes('.quote-item{grid-template-columns:var(--ui-control-height) minmax(0,1fr)}'),'drag handle track must fit standardized button');
assert(css.includes('.quote-preview .payment-row>b{flex:0 0 auto;max-width:100%;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere'),'preview totals stay readable in portal dialogs');
assert(css.includes('[aria-invalid=true]'));assert(css.includes('prefers-reduced-motion:reduce'));
ast.walkRules(rule=>{
 if(/\.active|:hover|:focus-visible/.test(rule.selector))rule.walkDecls(d=>assert(!/^(font-size|font-weight|padding|width|height|border-width)$/.test(d.prop),`state changes geometry: ${rule.selector} ${d.prop}`));
});
for(const viewport of [320,360,390,768]){
 assert(css.includes('min-width:0;max-width:100%'));assert(css.includes('white-space:normal'));
 console.log(`PASS ${viewport}px source contracts: shrinkable fields, wrapping actions, shared surfaces; not visual viewport QA`);
}
const notifications=readFileSync('app/notification-inbox.tsx','utf8');
assert(notifications.includes('data.notifications.map(notice=><article'),'notifications keep stacked cards, never thin rows (documented exception)');
assert(notifications.includes('flex-wrap')&&notifications.includes('whitespace-pre-wrap'),'notification cards wrap their content');
assert(notifications.includes('<h3'),'notification titles keep their card hierarchy');
assert(notifications.includes('StateChip'),'notification kind stays a chip beside the title');
console.log('PASS notification feed keeps stacked cards per the documented exception');
assert(css.includes('.person-hub-card:not(.is-list) .ops-person small'),'team cards show the role as a chip beside the name');
assert(css.includes('.inventory-equipment-grid:not(.inventory-equipment-list)>.inventory-equipment .inventory-code'),'inventory cards show the code as a chip beside the title');
assert(/\.person-hub-card:not\(\.is-list\) \.ops-person h3\{font-size:14px/.test(css),'team titles keep one size (the notification clone retired its own classes)');
console.log('PASS team and inventory cards follow the notification card anatomy');
assert(css.includes('.project-grid>.project-entry .project-entry-title h3{font-size:14px'),'project grid cards keep the shared title size');
assert(css.includes('.project-grid>.project-entry>.project-entry-actions{justify-content:space-between}'),'project grid cards separate the drive meta from the action buttons');
console.log('PASS project grid cards follow the shared anatomy');
assert(css.includes(',.team-directory-grid){grid-auto-rows:1fr}'),'team directory cards share the capsule height contract');
assert(css.includes('.team-directory-grid>.team-directory-card,'),'team directory cards use the shared card shell');
console.log('PASS team directory joins the shared card contract');

// ── Sistema v2 (Tailwind + owncoding-ui) — 22-09-2026, campaña #41 ─────────
const tailwind=readFileSync('app/tailwind.css','utf8');
const layoutV2=readFileSync('app/layout.tsx','utf8');
assert(layoutV2.includes("import 'owncoding-ui/styles.css'"),'el layout carga los estilos de la librería');
assert(layoutV2.indexOf("import 'owncoding-ui/styles.css'")<layoutV2.indexOf("import './globals.css'"),'la base de la librería entra antes que el CSS legado');
assert(layoutV2.indexOf("import 'owncoding-ui/styles.css'")<layoutV2.indexOf("import './tailwind.css'"),'la hoja del sistema v2 carga después de los tokens de la librería');
assert(tailwind.includes('font-family: inherit'),'la base de la librería no impone tipografía a Scale OS');
assert(/text-wrap: inherit/.test(tailwind),'los titulares conservan el ajuste legado');
assert(/input\[inputmode="numeric"\]\s*\{[^}]*font-family: inherit/.test(tailwind),'los campos numéricos conservan la fuente de la app');
assert(tailwind.includes('@tailwind base')&&tailwind.includes('@tailwind components')&&tailwind.includes('@tailwind utilities'),'las capas de Tailwind viven en la hoja del sistema');
assert(tailwind.includes('border-style: solid'),'la base mínima habilita las utilidades de borde');
assert(/\*,?[\s\S]{0,80}border-width: 0/.test(tailwind),'la base mínima fija ancho 0 y evita el borde initial de 3px');
assert(/button \{\s*border-width: 0[\s\S]*?border-style: solid/.test(tailwind),'los botones recuperan el borde sólido que el legado anula');
const config=readFileSync('tailwind.config.mjs','utf8');
assert(/presets:\s*\[preset\]/.test(config),'el preset de owncoding-ui está montado');
assert(/preflight:\s*false/.test(config),'preflight desactivado y documentado');
assert(/darkMode:\s*\['selector',\s*'html\[data-theme="dark"\]'\]/.test(config),'dark: sigue html[data-theme="dark"]');
assert(config.includes('./app/**/*.{ts,tsx}'),'la app se escanea');
assert(config.includes('node_modules/owncoding-ui/dist'),'el bundle de la librería se escanea');
const lightTokens={};postcss.parse(tailwind).walkRules(':root',rule=>{if(rule.parent.type==='root')rule.walkDecls(d=>lightTokens[d.prop]=d.value);});
const darkTokens={};postcss.parse(tailwind).walkRules('html[data-theme="dark"]',rule=>rule.walkDecls(d=>darkTokens[d.prop]=d.value));
const v2Tokens=['--c-paper','--c-fore','--c-ink','--c-ink-950','--c-ink-900','--c-ink-800','--c-ink-700','--c-ink-600','--c-ink-500','--c-mute','--c-fono','--c-fono-dark','--c-fono-light','--c-ok','--c-bad','--c-warn','--c-info','--c-onbrand'];
for(const token of v2Tokens){assert(lightTokens[token],`el tema claro define ${token}`);assert(darkTokens[token],`el tema oscuro define ${token}`);}
const toChannels=hex=>hex.replace('#','').match(/../g).map(v=>parseInt(v,16)).join(' ');
const legacyToken=name=>readFileSync('app/globals.css','utf8').match(new RegExp(`--${name}:(#[0-9A-Fa-f]{6})`))[1];
assert.equal(lightTokens['--c-fono'],toChannels(legacyToken('brand-700')),'--c-fono conserva la marca (brand-700)');
assert.equal(lightTokens['--c-fono-light'],toChannels(legacyToken('brand-600')),'--c-fono-light conserva brand-600');
assert.equal(lightTokens['--c-ok'],toChannels(legacyToken('success')),'--c-ok conserva el verde de éxito');
assert.equal(lightTokens['--c-bad'],toChannels(legacyToken('danger')),'--c-bad conserva el rojo de peligro');
assert.equal(lightTokens['--c-warn'],toChannels(legacyToken('warning')),'--c-warn conserva el ámbar');
assert.equal(lightTokens['--c-info'],toChannels(legacyToken('info')),'--c-info conserva el azul');
assert.notEqual(lightTokens['--c-fore'],darkTokens['--c-fore'],'el tema oscuro cambia la tinta');
const channels=value=>value.split(' ').map(Number);
const lum=([r,g,b])=>{const c=[r,g,b].map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
const contrast=(a,b)=>{const l1=lum(channels(a)),l2=lum(channels(b));return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);};
assert(contrast(lightTokens['--c-fore'],lightTokens['--c-ink'])>=4.5,'texto principal con contraste AA (claro)');
assert(contrast(darkTokens['--c-fore'],darkTokens['--c-ink'])>=4.5,'texto principal con contraste AA (oscuro)');
assert(contrast(lightTokens['--c-onbrand'],lightTokens['--c-fono'])>=4.5,'texto sobre marca con contraste AA (claro)');
assert(contrast(darkTokens['--c-onbrand'],darkTokens['--c-fono'])>=4.5,'texto sobre marca con contraste AA (oscuro)');
assert(contrast(lightTokens['--c-fono'],lightTokens['--c-ink'])>=3,'la marca se distingue como acento de control (claro)');
assert(contrast(darkTokens['--c-fono'],darkTokens['--c-ink'])>=3,'la marca se distingue como acento de control (oscuro)');
console.log('PASS sistema v2: Tailwind tras la librería, tema data-theme, tokens de marca y contraste AA');
