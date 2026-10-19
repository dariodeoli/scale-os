const fs=require('node:fs');const crypto=require('node:crypto');
const {code39Bits,inventoryCode}=require(process.cwd()+'/app/inventory-label.tsx');
const referencePath=process.argv[2];if(!referencePath)throw Error('Pass the pinned ZXing Code39Reader.java file as the first argument');const reference=fs.readFileSync(referencePath,'utf8');
const raw=reference.match(/CHARACTER_ENCODINGS = \{([\s\S]*?)\};/)[1];
const alphabet='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%';
const standard=[...raw.matchAll(/0x([0-9A-Fa-f]+)/g)].map(x=>parseInt(x[1],16));
const pattern=bits=>{const runs=[];for(const b of bits){if(runs.length&&runs.at(-1).b===b)runs.at(-1).n++;else runs.push({b,n:1});}if(runs.at(-1).b==='0')runs.pop();if(runs.length!==9||runs.some(r=>![1,3].includes(r.n)))throw Error('Invalid Code39 runs');return parseInt(runs.map(r=>r.n===3?'1':'0').join(''),2);};
const mismatches=[];for(let i=0;i<alphabet.length;i++){const actual=pattern(code39Bits(alphabet[i]).slice(16,31));if(actual!==standard[i])mismatches.push({character:alphabet[i],actual,expected:standard[i]});}
const encoded=code39Bits('SC-000001');
const result={observedAt:new Date().toISOString(),sourceCommit:'fca3c8e5e6e11eb90ca4d8e67c47a2e2bfef215d',scope:'Software audit; no physical printer or production inventory',independentReference:{url:'https://raw.githubusercontent.com/zxing/zxing/9172a3da2010082a6c134fa5cade5cb133aae60d/core/src/main/java/com/google/zxing/oned/Code39Reader.java',sha256:crypto.createHash('sha256').update(reference).digest('hex'),characterCount:standard.length},characterCount:alphabet.length,mismatches,startMatches:pattern(encoded.slice(0,16))===0x094,stopMatches:pattern(encoded.slice(-16))===0x094,preservedCodeExamples:[1,42,50,'9223372036854775807'].map(id=>({syntheticId:String(id),code:inventoryCode(id)})),label:{pageWidthMm:80,pageHeightMm:50,barcodeColumnMm:29,defaultCodeSvgModules:encoded.length+20,narrowModuleAt29Mm:29/(encoded.length+20)},physicalPrintTest:false,physicalScanTest:false,productionCoverageVerified:false};
if(mismatches.length||!result.startMatches||!result.stopMatches)throw Error('Code39 mismatch');
fs.writeFileSync('docs/qa/pending-operations/code39-software.json',JSON.stringify(result,null,2)+'\n');console.log('43 Code39 characters and start/stop match independent reference. No physical test.');
