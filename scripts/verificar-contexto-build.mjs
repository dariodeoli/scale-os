#!/usr/bin/env node
/**
 * Guarda del contexto de build de Docker/Coolify.
 *
 * Suma lo que entra al contexto (archivos rastreados + no rastreados que git no
 * ignora, menos lo que excluye `.dockerignore`) y falla si el total supera
 * 400 MB o si algún archivo pesa más de 5 MB, listando los culpables.
 * Motivo: en Agendese el contexto pasó de 300 MB a 2 GB por evidencias de QA
 * commiteadas y el build de Coolify se cortaba por tiempo.
 *
 * Uso:
 *   node scripts/verificar-contexto-build.mjs                 # web (raíz)
 *   node scripts/verificar-contexto-build.mjs --context backend
 *   node scripts/verificar-contexto-build.mjs --max-total-mb 400 --max-file-mb 5
 */
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const repo=fileURLToPath(new URL('..',import.meta.url));
const MB=1024*1024;

/** Convierte un patrón de `.dockerignore` (sintaxis de moby/patternmatcher) a RegExp. */
export function patternToRegExp(pattern){
  let p=pattern.trim().replace(/^\/+/,'').replace(/\/+$/,'');
  let out='';
  for(let i=0;i<p.length;i++){
    const c=p[i];
    if(c==='*'){
      if(p[i+1]==='*'){
        i++;
        if(p[i+1]==='/'){i++;out+='(?:.*/)?';}else out+='.*';
      }else out+='[^/]*';
    }else if(c==='?')out+='[^/]';
    else if(c==='\\'&&i+1<p.length){i++;out+=p[i].replace(/[.+^${}()|[\]\\]/g,'\\$&');}
    else out+=c.replace(/[.+^${}()|[\]\\]/g,'\\$&');
  }
  return new RegExp(`^${out}$`);
}

/** Lee `.dockerignore` y devuelve una función `isExcluded(rutaRelativa)`. */
export function loadDockerignore(text){
  const rules=text.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(line=>{
    const negate=line.startsWith('!');
    return {negate,re:patternToRegExp(negate?line.slice(1):line)};
  });
  return relative=>{
    const parts=relative.split('/');
    let excluded=false;
    for(const rule of rules){
      // Igual que Docker: un patrón que coincide con un directorio padre excluye su contenido.
      for(let n=1;n<=parts.length;n++){
        if(rule.re.test(parts.slice(0,n).join('/'))){excluded=!rule.negate;break;}
      }
    }
    return excluded;
  };
}

/** Archivos candidatos del contexto: rastreados + no rastreados no ignorados por git. */
export function contextFiles(contextDir){
  const out=execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard','--','.'],{cwd:contextDir,maxBuffer:256*MB}).toString('utf8');
  return [...new Set(out.split('\0').filter(Boolean))];
}

export function measureContext(contextDir){
  const ignorePath=path.join(contextDir,'.dockerignore');
  const isExcluded=loadDockerignore(existsSync(ignorePath)?readFileSync(ignorePath,'utf8'):'');
  const included=[],excluded=[];
  for(const relative of contextFiles(contextDir)){
    const absolute=path.join(contextDir,relative);
    if(!existsSync(absolute))continue; // borrado en el árbol de trabajo, no entra al contexto
    const size=statSync(absolute).size;
    (isExcluded(relative)?excluded:included).push({path:relative,size});
  }
  const sum=list=>list.reduce((total,file)=>total+file.size,0);
  return {included,excluded,includedBytes:sum(included),excludedBytes:sum(excluded)};
}

function topDirs(files,limit){
  const dirs=new Map();
  for(const file of files){const parts=file.path.split('/');const key=parts.length>2?parts.slice(0,2).join('/'):parts.length>1?parts[0]:'(raíz)';dirs.set(key,(dirs.get(key)||0)+file.size);}
  return [...dirs].sort((a,b)=>b[1]-a[1]).slice(0,limit);
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const args=process.argv.slice(2),arg=(name,fallback)=>{const i=args.indexOf(name);return i>=0?args[i+1]:fallback;};
  const contextDir=path.resolve(repo,arg('--context','.'));
  const maxTotal=Number(arg('--max-total-mb','400'))*MB,maxFile=Number(arg('--max-file-mb','5'))*MB;
  const result=measureContext(contextDir);
  const label=path.relative(repo,contextDir)||'.';
  const fmt=bytes=>`${(bytes/MB).toFixed(2)} MB`;
  console.log(`Contexto de build (${label}): ${fmt(result.includedBytes)} en ${result.included.length} archivos · excluido por .dockerignore: ${fmt(result.excludedBytes)} en ${result.excluded.length} archivos.`);
  const heavy=result.included.filter(file=>file.size>maxFile).sort((a,b)=>b.size-a.size);
  const problems=[];
  if(result.includedBytes>maxTotal)problems.push(`el contexto pesa ${fmt(result.includedBytes)} (límite ${fmt(maxTotal)})`);
  if(heavy.length)problems.push(`${heavy.length} archivo(s) superan ${fmt(maxFile)}`);
  if(problems.length){
    console.error(`\n✗ Contexto de build inflado: ${problems.join('; ')}.`);
    if(heavy.length){console.error('\nArchivos más pesados que el límite:');for(const file of heavy.slice(0,25))console.error(`  ${fmt(file.size).padStart(10)}  ${file.path}`);}
    console.error('\nCarpetas que más suman:');for(const [dir,size] of topDirs(result.included,10))console.error(`  ${fmt(size).padStart(10)}  ${dir}`);
    console.error('\nExcluí lo que el build no usa en .dockerignore o sacá la evidencia de QA del repo (ver docs/qa/README.md).');
    process.exit(1);
  }
  console.log(`✓ Contexto dentro de los límites (total ≤ ${fmt(maxTotal)}, archivo ≤ ${fmt(maxFile)}).`);
}
