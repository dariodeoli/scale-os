import assert from 'node:assert/strict';
import {test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

function fixture(t,{artifact=true}={}){
 const root=mkdtempSync(path.join(tmpdir(),'scale-release-prepare-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const dir of ['build-tools','backend','release','bin'])mkdirSync(path.join(root,dir));
 copyFileSync(new URL('../build-tools/release-patch.mjs',import.meta.url),path.join(root,'build-tools/release-patch.mjs'));
 writeFileSync(path.join(root,'package.json'),'{"type":"module"}');
 writeFileSync(path.join(root,'backend/package.json'),'{}');
 writeFileSync(path.join(root,'release/version.json'),'{"version":"1.2.3"}');
 const log=path.join(root,'calls.jsonl');
 const shim=`#!${process.execPath}
import {appendFileSync,mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
const command=path.basename(process.argv[1]),args=process.argv.slice(2);
appendFileSync(process.env.SCALE_TEST_COMMAND_LOG,JSON.stringify({command,args})+'\\n');
if(command==='npm'&&args.join(' ')==='run build'&&process.env.SCALE_TEST_ARTIFACT==='yes'){
 mkdirSync('.next',{recursive:true});writeFileSync('.next/BUILD_ID','fixture-build');
}
`;
 for(const command of ['git','npm','node'])writeFileSync(path.join(root,'bin',command),shim,{mode:0o755});
 writeFileSync(path.join(root,'build-tools/release-smoke.mjs'),`import {appendFileSync} from 'node:fs';appendFileSync(process.env.SCALE_TEST_COMMAND_LOG,JSON.stringify({command:'smoke',args:[]})+'\\n');`);
 writeFileSync(path.join(root,'block-network.cjs'),"globalThis.fetch=()=>{throw Error('Unexpected network call in release fixture')};");
 function run(args=[],webhooks=false){return spawnSync(process.execPath,['--require',path.join(root,'block-network.cjs'),path.join(root,'build-tools/release-patch.mjs'),...args],{cwd:root,encoding:'utf8',timeout:10000,env:{...process.env,PATH:path.join(root,'bin')+path.delimiter+process.env.PATH,SCALE_TEST_COMMAND_LOG:log,SCALE_TEST_ARTIFACT:artifact?'yes':'no',SCALE_API_DEPLOY_WEBHOOK:webhooks?'https://deploy.invalid/api':'',SCALE_WEB_DEPLOY_WEBHOOK:webhooks?'https://deploy.invalid/web':''}});}
 function calls(){try{return readFileSync(log,'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));}catch(error){if(error.code==='ENOENT')return[];throw error;}}
 return {root,run,calls};
}
test('prepare creates exactly one version commit after checks without push, webhook or smoke',t=>{
 const f=fixture(t),result=f.run(['--prepare'],true);
 assert.equal(result.status,0,result.stderr);
 assert.equal(JSON.parse(readFileSync(path.join(f.root,'release/version.json'),'utf8')).version,'1.2.4');
 const calls=f.calls(),commits=calls.filter(c=>c.command==='git'&&c.args[0]==='commit');
 assert.equal(commits.length,1);
 assert(!calls.some(c=>c.command==='git'&&c.args[0]==='push'));
 assert(!calls.some(c=>c.command==='smoke'));
 for(const command of ['run test:release-regression','run build','--prefix backend run test:release']){
  const index=calls.findIndex(c=>c.command==='npm'&&c.args.join(' ')===command);
  assert(index>=0&&index<calls.indexOf(commits[0]),`${command} completes before commit`);
 }
});
test('missing build artifact aborts before committing or pushing',t=>{
 const f=fixture(t,{artifact:false}),result=f.run(['--prepare']);
 assert.notEqual(result.status,0);
 assert.match(result.stderr,/BUILD_ID/);
 assert(!f.calls().some(c=>c.command==='git'&&['commit','push'].includes(c.args[0])));
});
test('unknown release arguments fail before changing the version',t=>{
 const f=fixture(t),result=f.run(['--skip-checks']);
 assert.notEqual(result.status,0);
 assert.equal(JSON.parse(readFileSync(path.join(f.root,'release/version.json'),'utf8')).version,'1.2.3');
 assert.deepEqual(f.calls(),[]);
});
test('normal release keeps its push and subsequent smoke with mocked commands only',t=>{
 const f=fixture(t),result=f.run();
 assert.equal(result.status,0,result.stderr);
 const calls=f.calls(),push=calls.findIndex(c=>c.command==='git'&&c.args.join(' ')==='push origin HEAD:main'),smoke=calls.findIndex(c=>c.command==='smoke');
 assert(push>=0&&smoke>push);
});
