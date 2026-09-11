import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {supervise} from './supervisor.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||3000);
if(!Number.isInteger(port)||port<1||port>65535||port===3001)throw Error('PORT must be a valid public port distinct from internal port 3001.');
if(!process.env.DATABASE_URL)throw Error('Configure the existing Scale database connection before starting the unified service.');
const services=supervise({
 backend:{args:['server.js'],cwd:path.join(root,'backend'),env:{...process.env,PORT:'3001'}},
 web:{args:['server.js'],cwd:path.join(root,'.next/standalone'),env:{...process.env,PORT:String(port),HOSTNAME:process.env.HOSTNAME||'0.0.0.0'}},
 healthUrl:'http://127.0.0.1:3001/health',
});
process.once('SIGTERM',()=>services.stop(0));
process.once('SIGINT',()=>services.stop(0));
process.exitCode=await services.done;
