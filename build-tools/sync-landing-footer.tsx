import React from 'react';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {renderToStaticMarkup} from 'react-dom/server';
import {WorkspaceFooter} from '../app/workspace-footer';

// Keep the landing a standalone HTML document, including with JavaScript disabled.
const path=fileURLToPath(new URL('../public/scale-os.html',import.meta.url));
const html=readFileSync(path,'utf8');
const footers=html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/g);
if(footers?.length!==1)throw new Error('Expected exactly one landing footer; refusing to overwrite ambiguous HTML.');
const footer=renderToStaticMarkup(<WorkspaceFooter variant="landing"/>);
const updated=html.replace(footers[0],()=>footer);
if(process.argv.includes('--check')){
 if(updated!==html)throw new Error('Landing footer is stale. Run npm run footer:sync.');
 console.log('PASS: landing footer matches the shared component and release.');
}else if(updated!==html){writeFileSync(path,updated);console.log('Updated landing footer from WorkspaceFooter.');}
