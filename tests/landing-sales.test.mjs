import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext,Script} from 'node:vm';
import {test} from 'node:test';
import postcss from 'postcss';

const html=readFileSync(new URL('../public/scale-os.html',import.meta.url),'utf8');
const script=html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
const form=html.match(/<form id="contact-form"[\s\S]*?<\/form>/)?.[0];
const text=html.replace(/<style>[\s\S]*?<\/style>|<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const sha=value=>createHash('sha256').update(value).digest('hex');
const signup='https://app.scaleparaguay.com/registro';
const demo='https://sistema.scaleparaguay.com/demo';

test('one monthly plan, two fixed alternatives and explicit trial/grace terms',()=>{
 assert.equal((html.match(/data-plan="single"/g)||[]).length,1);
 assert(text.includes('US$10/mes o G.50.000/mes'));
 assert(text.includes('precios alternativos fijos'));
 assert(text.includes('no una conversión'));
 assert(text.includes('30 días desde el alta de tu cuenta'));
 assert(text.includes('la prueba empieza al completar el alta, no al hacer clic'));
 assert(text.includes('Sin tarjeta para iniciar'));
 assert(text.includes('2 días de gracia'));
 assert(text.includes('Al tercer día sin pagar se suspende el acceso'));
 assert(text.includes('La suspensión no borra tus datos'));
 assert(text.includes('Todos los módulos incluidos'));
 assert(text.includes('Cada integrante accede según su rol'));
 assert(text.includes('El pago en línea todavía no está habilitado'));
 assert(text.includes('esta página no realiza cobros'));
 assert(!/propuesta según tu equipo|countdown|testimonios|24\/7|ilimitad[oa]|últimos cupos|respaldo.*R2/i.test(text));
 assert(!/checkout\.stripe|js\.stripe|pay\.hotmart|pago\.pagopar/i.test(html));
});

test('signup CTAs lead only to registration; demo stays separate and isolated',()=>{
 const links=[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([,attrs,label])=>({attrs,label,href:attrs.match(/href="([^"]+)"/)?.[1]}));
 const trial=links.filter(link=>link.attrs.includes('data-cta="trial"'));
 assert.equal(trial.length,4,'navigation, hero, pricing and final signup CTA');
 assert(trial.every(link=>link.href===signup));
 assert(links.filter(link=>link.attrs.includes('data-cta="demo"')).every(link=>link.href===demo));
 assert(links.some(link=>link.href===demo));
 assert(text.includes('copia aislada con datos ficticios, sin registro'));
 assert(text.includes('Explorar la demo pública no inicia esta prueba'));
 assert(text.includes('registrarte con Google no habilita el acceso a una agencia ajena'));
 assert(links.every(link=>link.href?.startsWith('#')||link.href?.startsWith('https://')));
});

test('illustration and module copy make no fabricated adoption or live-data claims',()=>{
 for(const module of ['checklists','múltiples responsables','presencia','inventario','reservas','pipeline','presupuestos','PYG, USD, EUR, BRL, ARS y MXN'])assert(text.includes(module),module);
 assert(text.includes('VISTA ILUSTRATIVA'));
 assert(text.includes('no es una captura ni actividad en vivo'));
 assert(text.includes('Compartir una tarea no amplía los permisos'));
 assert(text.includes('Registro y control; no mueve dinero por vos'));
 assert(!/miles de agencias|empresas confían|ahorrá \d+ horas|garantizado|soporte 24/i.test(text));
 const metadata=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
 assert.equal(metadata.name,'Scale OS');
 assert.equal(metadata.aggregateRating,undefined);
 assert.equal(metadata.review,undefined);
});

test('contact form and telemetry runtimes are byte-for-byte preserved',()=>{
 // Captured from the pre-redesign source, compared before storing these hashes.
 assert.equal(sha(script),'bd82b9596d0df8d438f9907d405a0a92e9d350be086b6e44e7bdd9cc7a0c7865');
 assert.equal(sha(form),'b66b00434ddc381dee345d546898c53b84d0096cc38dec739669dadfd9792924');
 assert(form.includes('type="checkbox" name="consent" required'));
 assert(form.includes('name="website" tabindex="-1" autocomplete="off"'));
 assert(form.includes('Puedo solicitar que eliminen mis datos'));
 assert(form.includes('role="status" id="contact-status" aria-live="polite"'));
 assert(text.includes('Enviar este formulario no crea una cuenta'));
 new Script(script);
});

test('semantic anchors, native FAQ and keyboard focus remain available without added JS',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,new Set(ids).size,'unique IDs');
 for(const [,id] of html.matchAll(/href="#([^"]+)"/g))assert(ids.includes(id),'anchor '+id);
 for(const [,id] of html.matchAll(/aria-labelledby="([^"]+)"/g))assert(ids.includes(id),'label '+id);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.equal((html.match(/<details>/g)||[]).length,8);
 assert.equal((html.match(/<summary>/g)||[]).length,8);
 assert(html.includes('class="skip" href="#contenido"'));
 assert(!/<script[^>]+src=|type="module"|maximum-scale|user-scalable=no/.test(html));
 for(const img of html.matchAll(/<img\b[^>]*>/g))assert(/\balt="[^"]*"/.test(img[0]));
});

test('CSS source provides shrinking grids at 320/360/390/768; not rendered visual QA',()=>{
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 const root=postcss.parse(css);
 function property(selector,name,width){
  let value;
  root.walkRules(rule=>{
   if(!rule.selectors.includes(selector))return;
   for(let parent=rule.parent;parent;parent=parent.parent){
    if(parent.type!=='atrule')continue;
    const match=parent.name==='media'&&parent.params.match(/^\(max-width:(\d+)px\)$/);
    if(!match||width>Number(match[1]))return;
   }
   rule.walkDecls(name,d=>{value=d.value;});
  });
  return value;
 }
 for(const width of [320,360,390,768]){
  for(const selector of ['.hero-top','.pricing-layout','.split'])assert.equal(property(selector,'grid-template-columns',width),'minmax(0,1fr)',selector+' '+width);
  assert.equal(property('.board','min-width',width),'0');
  assert.equal(property('.contact-form','min-width',width),'0');
  assert.equal(property('.column','display',width),undefined,'do not hide preview columns on mobile');
  if(width<=640){
   for(const selector of ['.columns','.feature-grid','.contact-form'])assert.equal(property(selector,'grid-template-columns',width),'minmax(0,1fr)');
   assert.equal(property('.nav nav','width',width),'100%');
  }
 }
 assert(css.includes('@media(prefers-reduced-motion:reduce)'));
 assert(css.includes('animation:none!important;transition:none!important'));
 assert(css.includes(':focus-visible{outline:3px solid'));
 assert(!/body[^}]*overflow(?:-x)?:hidden/.test(css),'do not mask overflow on the body');
});

// Execute only with DOM/network doubles; never submit to real contact or telemetry APIs.
function runtime({ok=true,error='No disponible',mobile=false}={}){
 const calls=[],clicks=[];
 let handler,resetCount=0;
 const button={disabled:false},status={textContent:''};
 const fields={name:'Persona ficticia',company:'Agencia de prueba',email:'persona@example.invalid',phone:'',message:'Consulta de prueba',website:''};
 const fakeForm={querySelector:()=>button,elements:{consent:{checked:true}},reset(){resetCount++;},addEventListener(name,callback){assert.equal(name,'submit');handler=callback;}};
 runInNewContext(script,{
  document:{getElementById:id=>id==='contact-form'?fakeForm:status,querySelectorAll:()=>[{addEventListener:(_,callback)=>clicks.push(callback)}]},
  location:{origin:'https://example.invalid',pathname:'/'},
  matchMedia:()=>({matches:mobile}),
  fetch:async(url,init)=>{calls.push({url,init,body:JSON.parse(init.body)});return{ok,json:async()=>ok?{ok:true}:{error}};},
  FormData:class{*[Symbol.iterator](){yield* Object.entries(fields);}},
 });
 return{calls,clicks,button,status,form:fakeForm,fields,get resetCount(){return resetCount;},submit:()=>handler.call(fakeForm,{preventDefault(){}})};
}

test('mocked contact submit preserves payload, consent, honeypot and success reset',async()=>{
 const page=runtime({mobile:true});
 assert.deepEqual(page.calls.map(call=>call.body),[{name:'page_view'},{name:'mobile_view'}]);
 assert(page.calls.every(call=>call.init.credentials==='omit'));
 const pending=page.submit();assert.equal(page.button.disabled,true);await pending;
 const contact=page.calls.at(-1);
 assert.equal(contact.url,'https://sistema.scaleparaguay.com/core-api/api/public/contact');
 assert.equal(contact.init.method,'POST');
 assert.deepEqual(contact.body,{...page.fields,consent:true});
 assert.equal(page.resetCount,1);assert.equal(page.button.disabled,false);
 assert(page.status.textContent.includes('Consulta recibida'));
});

test('mocked failures retain input and WhatsApp still records the aggregate event',async()=>{
 const page=runtime({ok:false,error:'<b>Error de prueba</b>'});
 await page.submit();
 assert.equal(page.resetCount,0);assert.equal(page.button.disabled,false);
 assert.equal(page.status.textContent,'<b>Error de prueba</b>');
 assert.equal(page.status.innerHTML,undefined,'errors are assigned as text, never HTML');
 page.clicks[0]();assert.deepEqual(page.calls.at(-1).body,{name:'whatsapp_click'});
});
