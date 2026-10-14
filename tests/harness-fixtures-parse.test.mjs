// Guarda del harness visual: cada fixture se importa sin errores de sintaxis ni
// declaraciones duplicadas (un merge automático puede unir dos helpers con el
// mismo nombre y el harness deja de correr en silencio).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const dir=fileURLToPath(new URL('../build-tools/visual-harness/fixtures/',import.meta.url));

test('todos los fixtures del harness se importan', async () => {
  const files=readdirSync(dir).filter(name=>name.endsWith('.mjs'));
  assert.ok(files.length>0,'no hay fixtures');
  const broken=[];
  for(const name of files){
    try{await import(pathToFileURL(path.join(dir,name)).href);}catch(error){broken.push(`${name}: ${error instanceof Error?error.message:error}`);}
  }
  assert.deepEqual(broken,[],`fixtures que no cargan:\n${broken.join('\n')}`);
});
