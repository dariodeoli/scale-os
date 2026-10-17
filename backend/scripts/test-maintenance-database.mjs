import assert from 'node:assert/strict';
import path from 'node:path';
import {realpathSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import pg from 'pg';
// Optional test harness: accept only our disposable Unix-socket cluster, never
// DATABASE_URL, PGHOST, an existing development database or a network server.
export async function maintenanceTestDatabase(){
 const socket=process.env.SCALE_MAINTENANCE_TEST_PG_SOCKET;
 if(!socket)return new PGlite();
 assert(/^\/tmp\/scale-maintenance-pg-[A-Za-z0-9]+\/socket$/.test(socket));
 const root=realpathSync(path.dirname(socket));assert.equal(realpathSync(socket),path.join(root,'socket'));
 const port=Number(process.env.SCALE_MAINTENANCE_TEST_PG_PORT);assert(Number.isSafeInteger(port)&&port>=1024&&port<=65535);
 const pool=new pg.Pool({host:socket,port,user:'scale_maintenance_fixture',database:'postgres',ssl:false,max:1,connectionTimeoutMillis:5000,idleTimeoutMillis:1000});
 const connection=await pool.connect();
 const info=(await connection.query("select current_setting('data_directory') as data,current_setting('listen_addresses') as listen,inet_server_addr() as address,version() as version")).rows[0];
 try{assert.equal(realpathSync(info.data),path.join(root,'data'));assert.equal(info.listen,'');assert.equal(info.address,null);}catch(error){connection.release();await pool.end();throw error;}
 console.log(info.version+'; maintenance fixture Unix socket only');
 let pending=Promise.resolve();
 const query=(sql,args)=>{const result=pending.then(()=>connection.query(sql,args));pending=result.catch(()=>{});return result;};
 return{query,exec:sql=>query(sql),close:()=>{connection.release();return pool.end();}};
}
