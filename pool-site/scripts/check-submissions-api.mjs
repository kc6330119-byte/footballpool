// All Airtable traffic is intercepted. This test never changes live records.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash,createHmac} from 'node:crypto';
const root=new URL('../',import.meta.url).pathname,seed=JSON.parse(readFileSync(join(root,'lib/seed.json'))),names=['Bryan','Ed','Mike','Kevin'];
const rows={Players:names.map(p=>({id:p,fields:{'Player Name':p,Email:p.toLowerCase()+'@example.test',Active:true,'Password Hash':'fixture-only'}})),Seasons:[{id:'season',fields:{'Season Name':seed.season}}],Weeks:[],Games:[],'Weekly Results':[],'Pool Changes':[]};
for(const w of seed.weeks){
 const id='week'+w.number;
 rows.Weeks.push({id,fields:{Season:['season'],'Week Number':w.number,'Picks Deadline':'2099-09-24T04:59:00Z',Locked:w.number<=2,Notes:w.number===3?'PRIVATE_FIXTURE_NOTE':'','Actual Total Points':w.actualTotal}});
 for(const [i,g] of w.games.entries()){
  const f={Week:[id],'Game Order':i+1,'Away Team':g.teams[0],'Home Team':g.teams[1],'Original Matchup':g.matchup,'Original Score':g.score,'Original Picks':JSON.stringify(g.picks),'Spread Result':g.winner===g.teams[0]?'Away':g.winner===g.teams[1]?'Home':g.winner};
  for(const p of names)if(g.teams.includes(g.picks[p]))f[p+' Pick']=g.picks[p]===g.teams[0]?'Away':'Home';
  rows.Games.push({id:g.id,fields:f});
 }
 for(const p of names)rows['Weekly Results'].push({id:w.number+p,fields:{Week:[id],Player:[p],'Total Points Prediction':w.totalPoints[p],'Correct Picks':w.recordedTotals[p],Dues:5,'Weekly Winner':w.winner===p,Earnings:w.winner===p?w.earnings:0}});
}
let counter=0;
const fixture=createServer(async(req,res)=>{
 const table=decodeURIComponent(new URL(req.url,'http://local').pathname.split('/')[3]||'');
 res.setHeader('Content-Type','application/json');
 if(!rows[table]){res.writeHead(404);res.end('{}');return}
 if(req.method==='GET'){res.end(JSON.stringify({records:rows[table]}));return}
 if(req.method==='POST'&&table==='Pool Changes'){
  let body='';for await(const c of req)body+=c;
  const row={id:'event'+String(++counter).padStart(6,'0'),createdTime:new Date(Date.now()+counter).toISOString(),fields:JSON.parse(body).fields};rows[table].push(row);res.end(JSON.stringify(row));return;
 }
 res.writeHead(405);res.end('{}');
});
await new Promise(resolve=>fixture.listen(0,'127.0.0.1',resolve));
const temporary=mkdtempSync(join(tmpdir(),'pool-submissions-')),shim=join(temporary,'mock-fetch.mjs');
writeFileSync(shim,`const real=globalThis.fetch;globalThis.fetch=(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(url.startsWith('https://api.airtable.com/'))return real(url.replace('https://api.airtable.com','http://127.0.0.1:${fixture.address().port}'),init);return real(input,init)};`);
const port=5193,base='http://127.0.0.1:'+port,secret='isolated-submission-test-secret-0123456789';
let output='';
const child=spawn(process.execPath,['--import',shim,'node_modules/next/dist/bin/next','start','--port',String(port)],{cwd:root,env:{...process.env,NODE_ENV:'production',AUTH_SECRET:secret,ADMIN_EMAIL:'kevin@example.test',AIRTABLE_API_KEY:'fixture-only',AIRTABLE_PERSONAL_ACCESS_TOKEN:'fixture-only',AIRTABLE_BASE_ID:'fixture-'+Date.now(),SITE_URL:base},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',c=>{output+=c});child.stderr.on('data',c=>{output+=c});
function cookie(p){const data=Buffer.from(JSON.stringify({id:p,email:p.toLowerCase()+'@example.test',version:createHash('sha256').update('fixture-only').digest('hex'),exp:Date.now()+3600000})).toString('base64url');return 'cp_pool_session='+data+'.'+createHmac('sha256',secret).update(data).digest('base64url')}
async function call(path,p,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,...(p?{Cookie:cookie(p)}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
async function state(p){const r=await call('/api/pool',p);assert.equal(r.status,200,JSON.stringify(r));return r.data}
try{
 for(let n=0;n<50&&!output.includes('Ready');n++)await new Promise(r=>setTimeout(r,200));assert.ok(output.includes('Ready'),output);
 const html=await(await fetch(base+'/pool')).text();assert.ok(!html.includes('PRIVATE_FIXTURE_NOTE'));assert.ok(html.includes('Private'));
 assert.equal((await call('/api/pool')).status,401);
 for(const p of names){const s=await state(p),w=s.pool.weeks[2];for(const other of names.filter(x=>x!==p)){assert.equal(w.games[0].picks[other],'');assert.equal(w.totalPoints[other],null)}assert.equal(w.revealed,false);assert.equal(w.note,'')}
 let s=await state('Kevin'),w=s.pool.weeks[2];
 const adminDraft=structuredClone(w);adminDraft.note='Administrative test';adminDraft.submitted=Object.fromEntries(names.map(p=>[p,true]));
 assert.equal((await call('/api/admin','Kevin',{week:adminDraft,revision:s.revisions[3]})).status,200);
 s=await state('Kevin');assert.equal(s.pool.weeks[2].revealed,false);assert.ok(names.every(p=>!s.pool.weeks[2].submitted[p]));
 s=await state('Bryan');w=s.pool.weeks[2];assert.equal(w.totalPoints.Bryan,seed.weeks[2].totalPoints.Bryan);
 assert.equal((await call('/api/picks','Bryan',{week:3,revision:s.revisions[3],picks:{},totalPoints:null,submit:true})).status,400);
 for(const p of names){
  s=await state(p);w=s.pool.weeks[2];
  const r=await call('/api/picks',p,{week:3,revision:s.revisions[3],picks:Object.fromEntries(w.games.map(g=>[g.id,g.teams[0]])),totalPoints:50+names.indexOf(p),submit:true});assert.equal(r.status,200,JSON.stringify(r));
  const after=await state(p);assert.equal(after.pool.weeks[2].revealed,p==='Kevin');
 }
 s=await state('Bryan');w=s.pool.weeks[2];assert.ok(names.every(p=>w.games[0].picks[p]&&w.totalPoints[p]!==null));
 assert.equal((await call('/api/picks','Bryan',{week:3,revision:s.revisions[3],picks:{},totalPoints:99,submit:false})).status,409);
 assert.equal((await call('/api/admin','Bryan',{week:w,revision:s.revisions[3]})).status,403);
 s=await state('Kevin');w=s.pool.weeks[2];w.totalPoints.Bryan=99;
 assert.equal((await call('/api/admin','Kevin',{week:w,revision:s.revisions[3]})).status,200);
 s=await state('Bryan');assert.equal(s.pool.weeks[2].totalPoints.Bryan,99);
 console.log('PASS: production HTML/API privacy for all four players including admin, protected admin saves, complete submissions, reveal, player lock, and admin corrections. No live data changed.');
}catch(error){console.error(output);throw error}
finally{child.kill();fixture.close();rmSync(temporary,{recursive:true,force:true})}
