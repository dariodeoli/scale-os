import {readFileSync} from 'node:fs';
import postcss from 'postcss';
const source=readFileSync(new URL('../../app/ui-tokens.css',import.meta.url),'utf8');
/** Test-only custom-property resolution. Browser checks verify the real cascade. */
export function themeTokens(theme='light',width=1440){
 const values={};
 postcss.parse(source).walkRules(rule=>{
  if(![':root',`html[data-theme="${theme}"]`].includes(rule.selector))return;
  for(let parent=rule.parent;parent;parent=parent.parent){
   if(parent.type==='atrule'&&parent.name==='media'){
    const min=/min-width:\s*(\d+)px/.exec(parent.params),max=/max-width:\s*(\d+)px/.exec(parent.params);
    if(min&&width<Number(min[1])||max&&width>Number(max[1]))return;
   }
  }
  rule.walkDecls(declaration=>{values[declaration.prop]=declaration.value});
 });
 const resolve=(value,seen=[])=>value.replace(/var\((--[\w-]+)\)/g,(_,name)=>{
  if(seen.includes(name))throw Error(`Circular UI token: ${[...seen,name].join(' → ')}`);
  if(values[name]===undefined)throw Error(`Undefined UI token: ${name}`);
  return resolve(values[name],[...seen,name]);
 });
 return Object.fromEntries(Object.entries(values).map(([name,value])=>[name,resolve(value,[name])]));
}
export function rgbChannels(value){
 const hex=value.match(/^#([a-f\d]{6})$/i);
 if(hex)return [0,2,4].map(index=>parseInt(hex[1].slice(index,index+2),16));
 const channels=value.replace(/^rgb\(|\)$/g,'').trim().split(/\s+/).map(Number);
 if(channels.length!==3||channels.some(value=>!Number.isFinite(value)))throw Error(`Expected RGB color: ${value}`);
 return channels;
}
export const hexColor=value=>'#'+rgbChannels(value).map(channel=>channel.toString(16).padStart(2,'0')).join('');
