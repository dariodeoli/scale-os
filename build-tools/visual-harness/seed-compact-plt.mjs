/*
 * Datos de QA para las capturas del pase de compactación de Plataforma (#92/#96):
 * inicia sesión como el dueño real de `scale`, siembra enlaces de invitación,
 * una solicitud pendiente y accesos de administración global, y agrega
 * `OWNER_SESSION` al archivo de sesión del stack local.
 *
 * Uso (con el stack e2e-fin-stack.mjs ya corriendo):
 *   PG_BIN=/opt/homebrew/opt/postgresql@17/bin PG_PORT=55455 API_PORT=3923 \
 *   node build-tools/visual-harness/seed-compact-plt.mjs
 */
import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const here=dirname(fileURLToPath(import.meta.url));
const repo=resolve(here,'../..');
const PG_BIN=process.env.PG_BIN||'/opt/homebrew/opt/postgresql@17/bin';
const PG_PORT=process.env.PG_PORT||'55455';
const API=process.env.API||'http://127.0.0.1:3923';
const EMAIL=process.env.OWNER_EMAIL||'qa-plt@example.invalid';
const PASSWORD=process.env.OWNER_PASSWORD||'qa-plt-12345678';
const SESSION_FILE=resolve(repo,'work/visual-harness',process.env.QA_SESSION||'plt-qa-session.txt');
const psql=sql=>execFileSync(`${PG_BIN}/psql`,['-h','127.0.0.1','-p',PG_PORT,'-U','postgres','-d','scaleos','-t','-A','-c',sql],{encoding:'utf8'}).trim();

const response=await fetch(`${API}/api/auth/login`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:EMAIL,password:PASSWORD})});
const cookie=(response.headers.get('set-cookie')||'').match(/scale_session=([^;]+)/)?.[1]||'';
if(!cookie)throw new Error(`sin sesión del dueño (HTTP ${response.status})`);
const org=psql("select id from organizations where slug='scale'");
const owner=psql(`select m.user_id from organization_members m where m.organization_id=${org} and m.role='owner' and m.active and m.removed_at is null order by m.user_id limit 1`);
const demoOrg=psql("select id from organizations where slug like 'demo-session-%' order by id desc limit 1");
const demoUser=psql(`select user_id from organization_members where organization_id=${demoOrg} and active order by user_id limit 1`);

// Enlaces de invitación con historia (uno con aprobación y una solicitud).
psql(`insert into agency_invite_links(organization_id,role,mode,token_hash,created_by,expires_at,used_at)
 select ${org},'editor','single',md5(random()::text||clock_timestamp()::text),${owner},now()+interval '6 days',now()-interval '2 days'
 where not exists(select 1 from agency_invite_links where organization_id=${org} and mode='single')`);
psql(`insert into agency_invite_links(organization_id,role,mode,token_hash,created_by,expires_at)
 select ${org},'viewer','approval',md5(random()::text||clock_timestamp()::text),${owner},now()+interval '5 days'
 where not exists(select 1 from agency_invite_links where organization_id=${org} and mode='approval')`);
psql(`insert into users(email,password_hash) values('qa-postulante@example.invalid','x') on conflict(email) do nothing`);
psql(`insert into agency_access_requests(link_id,user_id,full_name,status)
 select l.id,u.id,'Postulante QA','pending' from agency_invite_links l, users u
 where l.organization_id=${org} and l.mode='approval' and u.email='qa-postulante@example.invalid'
 and not exists(select 1 from agency_access_requests r where r.link_id=l.id)`);

// Acceso de administración global para el dueño y para el usuario demo.
for(const userId of [owner,demoUser].filter(Boolean)){
 psql(`insert into platform_administrators(user_id,role,active) values(${userId},'admin',true) on conflict(user_id) do update set role='admin',active=true`);
}

appendFileSync(SESSION_FILE,`OWNER_SESSION=${cookie}\n`);
console.log(JSON.stringify({org,owner,demoOrg,demoUser,ownerSession:cookie?'ok':'falta'}));
