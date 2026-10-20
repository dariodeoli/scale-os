#!/usr/bin/env node
// Run from target worktree. Default is dry-run; --write writes only 3 audit JSON files.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const root=process.cwd(),args=process.argv.slice(2),write=args.includes('--write');
const arg=(key,fallback)=>args.find(x=>x.startsWith(key+'='))?.slice(key.length+1)||fallback;
for(const a of args)assert(a==='--write'||/^--(?:baseline|reviews|native-reviews|native-retirements|baseline-corrections|out|retirements)=/.test(a),'Unknown argument '+a);
const git=(...a)=>execFileSync('git',a,{cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
const baseline=git('rev-parse',arg('--baseline','origin/main')).trim();
const out=arg('--out','/tmp/mobile292-action-refresh');fs.mkdirSync(out,{recursive:true});
const require=createRequire(path.join(root,'package.json')),ts=require('typescript');
const {runMigration,analyzeActions}=await import(pathToFileURL(path.join(root,'build-tools/migrate-ui-actions.mjs')));
const H=x=>createHash('sha256').update(x).digest('hex');
const rel={manifest:'docs/audits/241-ui-actions-reviewed.json',final:'docs/audits/241-ui-actions-final.json',refresh:'docs/audits/241-ui-actions-refresh.json',history:'docs/audits/241-ui-actions-migration-reviewed.json',applied:'docs/audits/241-ui-actions-applied.json'};
const baseText=file=>git('show',baseline+':'+file);
const base=Object.fromEntries(Object.entries(rel).map(([key,file])=>[key,JSON.parse(baseText(file))]));
assert.equal(H(fs.readFileSync(path.join(root,'build-tools/migrate-ui-actions.mjs'))),H(baseText('build-tools/migrate-ui-actions.mjs')),'Audit engine changed; manual review required');
for(const key of ['history','applied'])assert.equal(fs.readFileSync(path.join(root,rel[key]),'utf8'),baseText(rel[key]),key+' historical record changed');
const sources=new Map(),baselineSources=new Map(),currentSites=new Map(),oldSites=new Map();
const sitesFor=(file,source)=>{
 const result=analyzeActions(source,{file,root});
 const sf=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),nodes=new Map();
 function visit(n){if(ts.isJsxOpeningElement(n)||ts.isJsxSelfClosingElement(n)){const full=ts.isJsxOpeningElement(n)?n.parent:n;nodes.set(n.getStart(sf),full.getText(sf));}ts.forEachChild(n,visit);}visit(sf);
 return result.sites.map(s=>({...s,jsx:nodes.get(s.offset),siteHash:H(nodes.get(s.offset))}));
};
for(const file of base.final.files){const source=baseText(file.file);assert.equal(H(source),file.sha256,'Baseline final inventory stale: '+file.file);baselineSources.set(file.file,source);oldSites.set(file.file,sitesFor(file.file,source));}
const raw=runMigration({root});
for(const file of raw.files){const source=fs.readFileSync(path.join(root,file.file),'utf8');sources.set(file.file,source);currentSites.set(file.file,sitesFor(file.file,source));}
const manifest=structuredClone(base.manifest);
const nativeReviewsPath=arg('--native-reviews',null),nativeReviews=nativeReviewsPath?JSON.parse(fs.readFileSync(nativeReviewsPath,'utf8')):[];
assert(Array.isArray(nativeReviews));const consumedNative=new Set();
const nativeRetirementsPath=arg('--native-retirements',null),nativeRetirements=nativeRetirementsPath?JSON.parse(fs.readFileSync(nativeRetirementsPath,'utf8')):[];
assert(Array.isArray(nativeRetirements));const consumedNativeRetirements=new Set();


for(const file of manifest.files){
 const now=currentSites.get(file.file)||[],used=new Set();
 file.sites=file.sites.filter(entry=>{
  const retirement=nativeRetirements.find(review=>review.approved===true&&review.file===file.file&&review.owner===entry.owner&&review.siteHash===entry.siteHash);
  if(!retirement)return true;
  const before=(oldSites.get(file.file)||[]).find(site=>site.kind==='native'&&site.owner===entry.owner&&site.siteHash===entry.siteHash);
  assert(before&&before.jsx===retirement.beforeJsx,'Native retirement before JSX differs');
  assert(!now.some(site=>site.kind==='native'&&site.owner===entry.owner&&site.siteHash===entry.siteHash),'Retired native widget remains');
  assert(retirement.destination?.length>10&&retirement.rationale?.length>20,'Native retirement requires reason and retained destination');
  assert(retirement.destinationJsx&&sources.get(file.file).includes(retirement.destinationJsx),'Native retirement replacement JSX not present');
  consumedNativeRetirements.add(retirement);return false;
 });
 for(const entry of file.sites){
  assert.equal(entry.action,'retain');
  const candidates=now.filter(s=>s.kind==='native'&&s.owner===entry.owner&&s.siteHash===entry.siteHash&&!used.has(s.offset));
  let hit=candidates[0];
  if(!hit){
   const before=(oldSites.get(file.file)||[]).find(site=>site.kind==='native'&&site.owner===entry.owner&&site.siteHash===entry.siteHash&&site.line===entry.line&&site.column===entry.column);
   const review=nativeReviews.find(review=>review.approved===true&&review.file===file.file&&review.owner===entry.owner&&review.beforeHash===entry.siteHash&&review.beforeLine===entry.line&&review.beforeColumn===entry.column);
   assert(before&&review&&review.rationale?.length>20,'Reviewed native widget changed without exact independent evidence: '+file.file+':'+entry.line);
   assert.equal(review.beforeJsx,before.jsx,'Native before JSX differs from Git baseline');
   hit=now.find(site=>site.kind==='native'&&site.owner===entry.owner&&site.siteHash===review.afterHash&&site.line===review.afterLine&&site.column===review.afterColumn&&!used.has(site.offset));
   assert(hit,'Reviewed native replacement absent');assert.equal(review.afterJsx,hit.jsx,'Native after JSX differs');
   entry.siteHash=hit.siteHash;entry.rationale+=' Refs #330: '+review.rationale;consumedNative.add(review);
  }
  used.add(hit.offset);entry.line=hit.line;entry.column=hit.column;
 }
 file.sourceHash=H(sources.get(file.file));
}
assert.equal(consumedNative.size,nativeReviews.length,'Unused native review entries');assert.equal(consumedNativeRetirements.size,nativeRetirements.length,'Unused native retirements');
manifest.scope+=' Scale #330/#331/#335: existing structural owners retained; explicit native permission gating review and current source hashes/positions recorded.';
const live=runMigration({root,manifest});
assert.equal(live.unreviewed,0,'New/modified native widgets or manual actions require explicit independent review; no automatic approval');
assert(live.files.every(f=>!f.changed),'Migration is not idempotent; refusing inventory refresh');
const flatten=map=>[...map.values()].flat();
const oldCanonical=flatten(oldSites).filter(s=>s.status==='canonical'),newCanonical=flatten(currentSites).filter(s=>s.status==='canonical');
const key=s=>s.file+'|'+s.owner+'|'+s.siteHash;
const buckets=new Map();for(const s of newCanonical){const k=key(s);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(s);}
const mapping=new Map(),unmatchedOld=[];const sid=s=>s.file+':'+s.line+':'+s.column;
for(const old of oldCanonical){const match=buckets.get(key(old))?.shift();if(match)mapping.set(sid(old),match);else unmatchedOld.push(old);}
let unmatchedNew=[...buckets.values()].flat();
const supplied=arg('--reviews',null),reviews=supplied?JSON.parse(fs.readFileSync(supplied,'utf8')):[];
assert(Array.isArray(reviews),'reviews must be an array');const consumed=new Set(),pending=[];
const retirementsPath=arg('--retirements',null),retirements=retirementsPath?JSON.parse(fs.readFileSync(retirementsPath,'utf8')):[];assert(Array.isArray(retirements));const consumedRetirements=new Set();
for(const old of unmatchedOld){
 const retirement=retirements.find(r=>r.approved===true&&r.file===old.file&&r.owner===old.owner&&r.beforeHash===old.siteHash&&r.beforeLine===old.line&&r.beforeColumn===old.column);
 if(retirement){assert(retirement.beforeJsx===old.jsx,'Retirement JSX differs from verified Git baseline');assert(retirement.rationale?.length>20&&retirement.destination?.length>10,'Retirement requires rationale and retained destination');assert(!newCanonical.some(s=>key(s)===key(old)),'Retired action remains');assert(!base.refresh.addedCanonical.some(s=>s.file===old.file&&s.siteHash===old.siteHash),'Retiring an added action requires preserving its addition history explicitly');consumedRetirements.add(retirement);continue;}
 const candidates=unmatchedNew.filter(s=>s.file===old.file&&s.owner===old.owner);
 const review=reviews.find(r=>!consumed.has(r)&&r.approved===true&&r.file===old.file&&r.owner===old.owner&&r.beforeHash===old.siteHash&&r.beforeLine===old.line&&r.beforeColumn===old.column&&candidates.some(s=>s.siteHash===r.afterHash&&s.line===r.afterLine&&s.column===r.afterColumn));
 if(review){assert(review.rationale?.length>20,'Review rationale too short');const hit=candidates.find(s=>s.siteHash===review.afterHash&&s.line===review.afterLine&&s.column===review.afterColumn);mapping.set(sid(old),hit);unmatchedNew=unmatchedNew.filter(s=>s!==hit);consumed.add(review);}
 else pending.push({approved:false,file:old.file,owner:old.owner,beforeLine:old.line,beforeColumn:old.column,beforeHash:old.siteHash,beforeJsx:old.jsx,candidates:candidates.map(s=>({afterLine:s.line,afterColumn:s.column,afterHash:s.siteHash,afterJsx:s.jsx})),rationale:'REQUIRED: review changed canonical action callbacks, semantics, permissions and presentation.'});
}
const additions=[];
for(const now of unmatchedNew){
 const review=reviews.find(r=>!consumed.has(r)&&r.approved===true&&r.file===now.file&&r.owner===now.owner&&r.beforeHash===null&&r.afterHash===now.siteHash&&r.afterLine===now.line&&r.afterColumn===now.column);
 if(review){assert(review.rationale?.length>20);consumed.add(review);additions.push({...now,rationale:review.rationale});}
 else if(!pending.some(p=>p.candidates?.some(c=>p.file===now.file&&c.afterLine===now.line&&c.afterColumn===now.column)))pending.push({approved:false,file:now.file,owner:now.owner,beforeHash:null,afterLine:now.line,afterColumn:now.column,afterHash:now.siteHash,afterJsx:now.jsx,rationale:'REQUIRED: review new canonical action and its owner.'});
}
fs.writeFileSync(path.join(out,'pending-reviews.json'),JSON.stringify(pending,null,2)+'\n');
assert.equal(pending.length,0,'Canonical actions changed/new/deleted: inspect '+path.join(out,'pending-reviews.json')+' and provide explicit --reviews=JSON with approved:true and exact before/after locations+hashes. Nothing written in repository.');
assert.equal(consumed.size,reviews.length,'Unused/stale review entries');assert.equal(consumedRetirements.size,retirements.length,'Unused/stale retirement entries');
const refresh=structuredClone(base.refresh);refresh.reviewedStructuralChanges=[...(refresh.reviewedStructuralChanges||[]),...nativeReviews.map(review=>({...review,baseline}))];refresh.retiredStructural.push(...nativeRetirements.map(review=>({...review,baseline})));refresh.retiredCanonical=[...(refresh.retiredCanonical||[]),...retirements.map(r=>({...r,baseline}))];
const baselineAddedProblems=refresh.addedCanonical.flatMap(entry=>{const exact=oldCanonical.filter(s=>s.file===entry.file&&s.owner===entry.owner&&s.siteHash===entry.siteHash);if(exact.length)return [];const at=oldCanonical.find(s=>s.file===entry.file&&s.line===entry.line&&s.column===entry.column);return [{...entry,baselineCurrent:at?{owner:at.owner,line:at.line,column:at.column,siteHash:at.siteHash,jsx:at.jsx}:null}];});
fs.writeFileSync(path.join(out,'baseline-added-canonical-problems.json'),JSON.stringify(baselineAddedProblems,null,2)+'\n');
const correctionPath=arg('--baseline-corrections',null),corrections=correctionPath?JSON.parse(fs.readFileSync(correctionPath,'utf8')):[];assert(Array.isArray(corrections));
for(const problem of baselineAddedProblems){
 const correction=corrections.find(c=>c.approved===true&&c.file===problem.file&&c.owner===problem.owner&&c.line===problem.line&&c.column===problem.column&&c.archivedHash===problem.siteHash&&c.actualBaselineHash===problem.baselineCurrent?.siteHash);
 assert(correction&&correction.rationale?.length>20,'Historical canonical hash metadata mismatch requires explicit correction: '+path.join(out,'baseline-added-canonical-problems.json'));
 assert.equal(problem.owner,problem.baselineCurrent.owner,'Historical canonical owner changed');
 const entry=refresh.addedCanonical.find(s=>s.file===problem.file&&s.line===problem.line&&s.column===problem.column);entry.siteHash=correction.actualBaselineHash;
 entry.rationale+=' Release195: historical canonical metadata hash corrected from the verified published baseline JSX; original archived hash retained in release195 evidence.';
}
assert.equal(corrections.length,baselineAddedProblems.length,'Unused/stale baseline corrections');
for(const entry of refresh.addedCanonical){
 const exact=oldCanonical.filter(s=>s.file===entry.file&&s.owner===entry.owner&&s.siteHash===entry.siteHash);
 const old=exact.find(s=>s.line===entry.line&&s.column===entry.column)||(exact.length===1?exact[0]:null);
 assert(old,'Baseline added canonical location absent: '+sid(entry));
 assert.equal(old.owner,entry.owner,'Baseline added canonical owner differs: '+sid(entry));
 assert.equal(old.siteHash,entry.siteHash,'Baseline added canonical JSX hash differs: '+sid(entry));
 const now=mapping.get(sid(old));assert(now,'Previously added canonical removed: '+sid(old));
 entry.line=now.line;entry.column=now.column;entry.owner=now.owner;entry.siteHash=now.siteHash;
}
for(const s of additions)refresh.addedCanonical.push({file:s.file,line:s.line,column:s.column,owner:s.owner,siteHash:s.siteHash,rationale:s.rationale});
for(const file of live.files){
 const before=base.final.files.find(s=>s.file===file.file);if(before?.sha256===file.sha256)continue;
 let changed=refresh.changedFiles.find(s=>s.file===file.file);
 if(!changed){changed={file:file.file,beforeHash:before?.sha256||null,afterHash:file.sha256,rationale:'Scale #330/#331/#335: hierarchy, intake and compact financial action callbacks reviewed; canonical ownership retained and exact source hashes reconciled.'};refresh.changedFiles.push(changed);}
 else {changed.afterHash=file.sha256;changed.rationale+=' Scale #330/#331/#335: current hierarchy/intake/financial action source reviewed; existing structural owners preserved with explicit permission widget review.';}
}
refresh.scope+=' Scale #330/#331/#335: refresh source hashes and positions without new structural exemptions; changed permission toggle has exact before/after evidence.';
refresh.issue330={baseline,integrationHead:git('rev-parse','HEAD').trim(),baselineCanonicalMetadataCorrections:corrections,canonicalActions:live.counts.canonical,newCanonicalActions:additions.length,retainedStructuralWidgets:manifest.files.reduce((n,f)=>n+f.sites.length,0),unchangedStructuralJsxHashes:nativeReviews.length===0,reviewedStructuralChanges:nativeReviews,reviewedStructuralRetirements:nativeRetirements,unreviewed:live.unreviewed,reviewedChangedActions:reviews.map(({file,owner,beforeHash,afterHash,rationale})=>({file,owner,beforeHash,afterHash,rationale}))};
assert.equal(base.applied.sites.length+refresh.addedCanonical.length-refresh.retiredStructural.length-refresh.retiredCanonical.length,live.sites.length,'Final inventory accounting changed');
assert.equal(live.counts.canonical,(base.applied.counts.canonical||0)+(base.applied.counts.migrate||0)+refresh.addedCanonical.length-refresh.retiredCanonical.length);
assert.equal(live.counts.structural,manifest.files.reduce((n,f)=>n+f.sites.length,0));
assert.equal(live.counts.renderer,1);
assert.equal(live.sites.find(s=>s.status==='renderer')?.file,'app/ui/button.tsx');
for(const [file,source]of sources)assert.equal(fs.readFileSync(path.join(root,file),'utf8'),source,'Concurrent source change: '+file);
const plans={manifest,final:live,refresh};for(const [name,value]of Object.entries(plans))fs.writeFileSync(path.join(out,path.basename(rel[name])),JSON.stringify(value,null,2)+'\n');
if(write){for(const [name,value]of Object.entries(plans))fs.writeFileSync(path.join(root,rel[name]),JSON.stringify(value,null,2)+'\n');}
console.log(JSON.stringify({mode:write?'write':'dry-run',baseline,counts:live.counts,unreviewed:live.unreviewed,changedSourceFiles:live.files.filter(f=>base.final.files.find(b=>b.file===f.file)?.sha256!==f.sha256).map(f=>f.file),reviewedChangedCanonical:reviews.length,newCanonical:additions.length,output:out},null,2));
