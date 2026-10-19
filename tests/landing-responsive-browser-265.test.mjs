// Real landing document, local assets, no external traffic or production writes.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const require=createRequire(new URL('../backend/package.json',import.meta.url));
const puppeteer=require('puppeteer-core');
const types={'.html':'text/html; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost'),name=url.pathname==='/'?'scale-os.html':url.pathname.slice(1);
 const file=path.resolve(root,'public',name);
 if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}
 catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await puppeteer.launch({executablePath:process.env.PUPPETEER_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage();page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setRequestInterception(true);page.on('request',request=>{const url=new URL(request.url());if(url.hostname==='127.0.0.1')return request.continue();if(url.hostname==='sistema.scaleparaguay.com'&&request.resourceType()==='image')return request.continue({url:`http://127.0.0.1:${server.address().port}${url.pathname}`});return request.abort();});
 // Reduced motion removes smooth-scrolling timing, preserving the actual anchor geometry.
 await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 const measurements=[];
 for(const theme of ['light','dark']){
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'},{name:'prefers-color-scheme',value:theme}]);
  await page.setViewport({width:1440,height:900});
  await page.goto(`http://127.0.0.1:${server.address().port}/`,{waitUntil:'networkidle0'});
  await page.evaluate(()=>document.fonts.ready);
  // Resize this same document, exercising the header observer across every breakpoint.
  for(const width of [320,390,768,1024,1440]){
   await page.setViewport({width,height:width<768?844:900});
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   for(const anchor of ['funciones','precio']){
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.click(`.site-header a[href="#${anchor}"]`);
    await page.waitForFunction(id=>{const y=document.getElementById(id).getBoundingClientRect().top,header=document.querySelector('.site-header').getBoundingClientRect().bottom;return y>=header&&y<=header+16;},{},anchor);
    const measurement=await page.evaluate(id=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,anchor:id,anchorTop:document.getElementById(id).getBoundingClientRect().top,headerBottom:document.querySelector('.site-header').getBoundingClientRect().bottom,brokenImages:[...document.images].filter(image=>image.complete&&image.naturalWidth===0).length}),anchor);
    assert.equal(measurement.scrollWidth,width,`${theme}/${width}: document has no horizontal overflow`);
    assert.equal(measurement.brokenImages,0,`${theme}/${width}: local landing images loaded`);
    assert(measurement.anchorTop>=measurement.headerBottom,`${theme}/${width}: ${anchor} stays below sticky header`);
    measurements.push({theme,...measurement});
   }
  }
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify(measurements,null,2));
 console.log('PASS landing: 20 real fragment navigations; 320/390/768/1024/1440, light/dark, live resize, no overflow/broken images.');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
