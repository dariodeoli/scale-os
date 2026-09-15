import React from 'react';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {WorkspaceFooter} from '../app/workspace-footer';
import {APP_VERSION} from '../app/app-version';

test('workspace and landing render the same release and requested year',()=>{
 for(const variant of ['workspace','landing'] as const){
  const html=renderToStaticMarkup(<WorkspaceFooter variant={variant} year={2030}/>);
  assert.ok(html.includes(`© 2030 Scale OS. Todos los derechos reservados. · v${APP_VERSION}`));
  assert.equal(html.includes('Desarrollado por'),variant==='workspace');
  assert.ok(!html.includes('usage-disclosure'),'usage disclosure paragraph is removed from every footer');
  assert.equal(html.includes('href="#precio"'),variant==='landing');
 }
});
test('standalone landing contains the complete shared footer without runtime scripts',()=>{
 const html=readFileSync('public/scale-os.html','utf8');
 const footers=html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/g);
 assert.deepEqual(footers,[renderToStaticMarkup(<WorkspaceFooter variant="landing"/>)]);
 assert.ok(!footers[0].includes('<script'));
});
