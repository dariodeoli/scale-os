// Refs #308. Real Chromium/PDF rendering of fictional documents only.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import puppeteer from 'puppeteer-core';
import {BUILTIN_CONTRACT_MODELS} from './contract-models.js';
import {CONTRACT_EXAMPLE_VARIABLES} from './contract-examples.js';
import {contractHtml} from './contract-document.js';
import {contractMissing,renderContractText} from './contracts.js';
const output=resolve(process.env.CONTRACT_DOCUMENT_QA_OUTPUT||'/tmp/scale-contract-document-308');await mkdir(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const measurements=[],documents=[];
try{
 const page=await browser.newPage();await page.setJavaScriptEnabled(false);await page.setRequestInterception(true);page.on('request',request=>request.abort());
 for(const model of BUILTIN_CONTRACT_MODELS){
  const missing=contractMissing(model.body,CONTRACT_EXAMPLE_VARIABLES,model.required_fields);assert.deepEqual(missing,[]);
  const rendered_text=renderContractText(model.body,CONTRACT_EXAMPLE_VARIABLES),html=contractHtml({title:model.name,rendered_text},{draft:true,simulated:true,missing});
  await writeFile(resolve(output,model.key+'.html'),html);await page.setContent(html,{waitUntil:'domcontentloaded'});
  for(const width of [320,390,768,1024,1440]){
   await page.setViewport({width,height:900});
   const m=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,bodyWidth:document.body.getBoundingClientRect().width,headings:document.querySelectorAll('h2').length,unresolved:document.body.innerText.includes('{{'),simulated:document.body.innerText.includes('DATOS SIMULADOS')}));
   assert.ok(m.scrollWidth<=width,JSON.stringify(m));assert.equal(m.unresolved,false);assert.equal(m.simulated,true);assert.ok(m.headings>5);measurements.push({model:model.key,...m});
  }
  const pdfPath=resolve(output,model.key+'.pdf');await page.pdf({path:pdfPath,format:'A4',printBackground:true});
  const pdfText=execFileSync('pdftotext',[pdfPath,'-'],{encoding:'utf8'});assert.match(pdfText,/SIMULADOS/);assert.match(pdfText,/Firma:/);assert.match(pdfText,/Cliente de ejemplo/);assert(!pdfText.includes('{{'));
  const info=execFileSync('pdfinfo',[pdfPath],{encoding:'utf8'});assert.match(info,/Page size:.*A4/);documents.push({model:model.key,pdf:pdfPath,pages:Number(info.match(/Pages:\s*(\d+)/)?.[1]),fictional:true});
  if(model===BUILTIN_CONTRACT_MODELS[0]){await page.setViewport({width:1024,height:1100});await page.screenshot({path:resolve(output,'sample-desktop.png')});await page.setViewport({width:390,height:844});await page.screenshot({path:resolve(output,'sample-mobile.png')});}
 }
 await writeFile(resolve(output,'results.json'),JSON.stringify({passed:true,browser:'Chromium',scope:'Standalone shared renderer and real A4 PDFs; fictional data, no authenticated application routes or physical printing',measurements,documents},null,2)+'\n');console.log(`PASS contract documents: ${measurements.length} viewport cases; ${documents.length} real A4 PDFs with extracted text; ${output}`);
}finally{await browser.close();}
