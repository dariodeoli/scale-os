import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const dockerfile=read('Dockerfile');
const dockerignore=read('.dockerignore');
const runtimeSecret=/\b(?:JWT(?:_|-)?SECRET|DATABASE(?:_|-)?URL|(?:API[_-]?)?KEY|SECRET|PASSWORD|TOKEN|PRIVATE(?:_|-)?KEY)\b/i;

for(const [index,line] of dockerfile.split('\n').entries()){
  if(/^\s*(?:ARG|ENV)\s+/i.test(line)){
    assert(!runtimeSecret.test(line),`Docker ARG/ENV must not expose a runtime secret (line ${index+1})`);
  }
}

const ignored=new Set(dockerignore.split('\n').map(line=>line.trim()));
assert(ignored.has('.env'),'Docker build context must exclude .env files');
assert(ignored.has('.env.*'),'Docker build context must exclude named .env files');
assert(!ignored.has('!.env'),'Docker build context must not re-include .env files');
console.log('PASS: Docker build keeps runtime secrets out of ARG/ENV instructions and excludes .env files from the build context.');
