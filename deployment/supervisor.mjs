import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';

// One public service owns both processes; never leave half a release running.
export function supervise({backend,web,healthUrl,startupTimeout=120000,shutdownTimeout=10000}){
 const children=new Set();
 let stopping=false,exitCode=0,timer,finish;
 const done=new Promise(resolve=>{finish=resolve;});
 function complete(){if(stopping&&!children.size){clearTimeout(timer);finish(exitCode);}}
 function stop(code=0){
  if(stopping)return;
  stopping=true;exitCode=code;
  for(const child of children)child.kill('SIGTERM');
  timer=setTimeout(()=>{for(const child of children)child.kill('SIGKILL');},shutdownTimeout);
  timer.unref();complete();
 }
 function launch(config){
  const child=spawn(process.execPath,config.args,{cwd:config.cwd,env:config.env,stdio:config.stdio||'inherit'});
  children.add(child);
  child.once('error',()=>{children.delete(child);stop(1);complete();});
  child.once('exit',()=>{children.delete(child);if(!stopping)stop(1);complete();});
 }
 launch(backend);
 const ready=(async()=>{
  const deadline=Date.now()+startupTimeout;
  while(!stopping&&Date.now()<deadline){
   try{
    const response=await fetch(healthUrl,{signal:AbortSignal.timeout(Math.min(2000,startupTimeout))});
    const healthy=response.ok&&(await response.json()).database==='ready';
    if(healthy&&!stopping){launch(web);return true;}
   }catch{ /* Loopback readiness only; never log credentials. */ }
   await delay(Math.min(250,startupTimeout));
  }
  if(!stopping){console.error('Scale OS backend did not become ready; stopping the release.');stop(1);}
  return false;
 })();
 return {done,ready,stop};
}
