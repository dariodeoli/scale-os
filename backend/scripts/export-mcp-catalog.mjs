import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {mcpToolCatalog} from '../mcp-tools.js';
const tools=mcpToolCatalog(),catalog={formatVersion:1,protocol:'MCP',count:tools.length,tools};
const expected=JSON.stringify(catalog,null,2)+'\n';
for(const source of ['../mcp-public-catalog.json','../../app/public-mcp-catalog.json']){
 const path=fileURLToPath(new URL(source,import.meta.url));
 if(process.argv.includes('--check')){if(readFileSync(path,'utf8')!==expected)throw Error('MCP catalog is stale: run node backend/scripts/export-mcp-catalog.mjs');}
 else writeFileSync(path,expected);
}
console.log(`PASS MCP public catalog: ${tools.length} fixed tools, metadata only, source and generated copies synchronized.`);
