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
let counter=0;const deliveries=[];let failMail=false;let rejectEmail='';
const fixture=createServer(async(req,res)=>{
 if(req.url==='/mock-mail'){let body='';for await(const c of req)body+=c;if(failMail){res.writeHead(503);res.end('{}');return}const message=JSON.parse(body);deliveries.push(message);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({accepted:message.bcc.filter(e=>e!==rejectEmail),rejected:message.bcc.filter(e=>e===rejectEmail)}));return}
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
writeFileSync(shim,`const real=globalThis.fetch;globalThis.fetch=(input,init)=>{const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;if(url.startsWith('https://api.airtable.com/'))return real(url.replace('https://api.airtable.com','http://127.0.0.1:${fixture.address().port}'),init);return real(input,init)};
import {registerHooks} from 'node:module';
const mockSource="export default {createTransport(options){if(options.host!=='smtp.gmail.com'||options.port!==465||options.secure!==true||options.auth.pass!=='fixturepassword')throw Error('Invalid Gmail transport');return {close(){},async sendMail(message){const response=await fetch('http://127.0.0.1:${fixture.address().port}/mock-mail',{method:'POST',body:JSON.stringify(message)});if(!response.ok)throw Error('Mock SMTP failure');return response.json()}}}}";
registerHooks({resolve(specifier,context,nextResolve){if(specifier==='nodemailer')return {url:'data:text/javascript,'+encodeURIComponent(mockSource),shortCircuit:true};return nextResolve(specifier,context)}});`);
const port=5194,base='http://127.0.0.1:'+port,secret='isolated-submission-test-secret-0123456789';
let output='';
const child=spawn(process.execPath,['--import',shim,'node_modules/next/dist/bin/next','start','--port',String(port)],{cwd:root,env:{...process.env,NODE_ENV:'production',AUTH_SECRET:secret,ADMIN_EMAIL:'kevin@example.test',AIRTABLE_API_KEY:'fixture-only',AIRTABLE_PERSONAL_ACCESS_TOKEN:'fixture-only',AIRTABLE_BASE_ID:'fixture-'+Date.now(),SITE_URL:base,GMAIL_USER:'kevin@example.test',GMAIL_APP_PASSWORD:'fixture password'},stdio:['ignore','pipe','pipe']});
child.stdout.on('data',c=>{output+=c});child.stderr.on('data',c=>{output+=c});
function cookie(p){const data=Buffer.from(JSON.stringify({id:p,email:p.toLowerCase()+'@example.test',version:createHash('sha256').update('fixture-only').digest('hex'),exp:Date.now()+3600000})).toString('base64url');return 'cp_pool_session='+data+'.'+createHmac('sha256',secret).update(data).digest('base64url')}
async function call(path,p,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{Origin:base,...(p?{Cookie:cookie(p)}:{}),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()}}
async function state(p){const r=await call('/api/pool',p);assert.equal(r.status,200,JSON.stringify(r));return r.data}
try{
 for(let n=0;n<50&&!output.includes('Ready');n++)await new Promise(r=>setTimeout(r,200));assert.ok(output.includes('Ready'),output);
 const publicNewsletter=await fetch(base+'/newsletter/1');assert.equal(publicNewsletter.status,200);const newsletterHtml=await publicNewsletter.text();assert.ok(newsletterHtml.includes('The Final Whistle'));assert.ok(newsletterHtml.includes('Latest saved results'));assert.ok(!newsletterHtml.includes('kevin@example.test'));
 assert.ok((await fetch(base+'/newsletter/3')).status===404);assert.equal((await fetch(base+'/newsletter/99')).status,404);
 assert.equal((await call('/api/weekly-report?week=1')).status,403);
 assert.equal((await call('/api/weekly-report?week=1','Bryan')).status,403);
 assert.equal((await call('/api/weekly-report?week=3','Kevin')).status,409);
 assert.equal((await call('/api/weekly-report?week=99','Kevin')).status,400);
 const preview=await call('/api/weekly-report?week=1','Kevin');assert.equal(preview.status,200);assert.equal(preview.data.recipients.length,4);assert.equal(preview.data.configured,true);assert.ok(preview.data.report.html.includes('THE FINAL WHISTLE'));assert.ok(preview.data.report.html.includes(base+'/newsletter/1'));assert.ok(preview.data.report.text.includes(base+'/newsletter/1'));
 const body={week:1,recipients:['Ed','Kevin'],version:preview.data.version};
 assert.equal((await call('/api/weekly-report','Bryan',body)).status,403);
 const hostile=await fetch(base+'/api/weekly-report',{method:'POST',headers:{Origin:'https://hostile.example',Cookie:cookie('Kevin'),'Content-Type':'application/json'},body:JSON.stringify(body)});assert.equal(hostile.status,403);
 assert.equal((await call('/api/weekly-report','Kevin',{...body,recipients:[]})).status,400);
 assert.equal((await call('/api/weekly-report','Kevin',{...body,recipients:['Outsider']})).status,400);
 assert.equal((await call('/api/weekly-report','Kevin',{...body,html:'injected'})).status,400);
 rows.Players.find(r=>r.id==='Ed').fields.Email='changed@example.test';
 assert.equal((await call('/api/weekly-report','Kevin',body)).status,409);
 rows.Players.find(r=>r.id==='Ed').fields.Email='ed@example.test';
 const sent=await call('/api/weekly-report','Kevin',body);assert.equal(sent.status,200,JSON.stringify(sent));assert.deepEqual(sent.data.recipients,['Ed','Kevin']);
 assert.equal(deliveries.length,1);assert.deepEqual(deliveries[0].bcc,['ed@example.test','kevin@example.test']);assert.equal(deliveries[0].to,'undisclosed-recipients:;');assert.equal(deliveries[0].from.address,'kevin@example.test');assert.ok(deliveries[0].html&&deliveries[0].text);assert.equal(deliveries[0].attachments.length,1);assert.equal(deliveries[0].attachments[0].contentType,'application/pdf');assert.equal(deliveries[0].attachments[0].filename,'collins-phillips-week-1-newsletter.pdf');assert.ok(Buffer.from(deliveries[0].attachments[0].content.data).subarray(0,5).equals(Buffer.from('%PDF-')));
 rejectEmail='ed@example.test';const partial=await call('/api/weekly-report','Kevin',body);assert.equal(partial.status,502);assert.deepEqual(partial.data.sent,['Kevin']);assert.deepEqual(partial.data.failed,['Ed']);rejectEmail='';
 failMail=true;assert.equal((await call('/api/weekly-report','Kevin',{...body,recipients:['Mike']})).status,503);
 console.log('PASS: admin-only preview/send, origin protection, private-week blocking, selected recipients including admin, stale-preview detection, Gmail sender, rejected recipients, and delivery failures. No real email sent.');
 if(process.env.REPORT_BROWSER_MODULE){
  const {chromium}=await import(process.env.REPORT_BROWSER_MODULE);const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.context().addCookies([{name:'cp_pool_session',value:cookie('Kevin').split('=')[1],url:base}]);await page.goto(base+'/pool?week=1');await page.getByRole('button',{name:'Email weekly results'}).click();await page.getByRole('dialog').getByText('Kevin · Administrator',{exact:true}).waitFor();await page.screenshot({path:'/tmp/weekly-newsletter-admin.png'});const frame=page.frameLocator('iframe');await frame.getByRole('heading',{name:'THE FINAL WHISTLE'}).waitFor();
  failMail=false;await page.getByRole('checkbox',{name:/Kevin/}).check();await page.getByRole('button',{name:'Submit',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await page.getByRole('heading',{name:'Week 1 pick sheet'}).isVisible());
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Email weekly results'}).click();await page.getByRole('dialog').getByText('Kevin · Administrator',{exact:true}).waitFor();await page.screenshot({path:'/tmp/weekly-newsletter-mobile.png'});console.log('PASS: administrator checklist, newsletter preview, submit closes back to selected week, mobile view.');await page.goto(base+'/newsletter/1');await page.getByRole('heading',{name:'The Final Whistle',exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:'/tmp/newsletter-web-mobile.png',fullPage:true});console.log('PASS: newsletter mobile layout has no horizontal overflow.');await browser.close();
 }
} catch(e){console.error(output);throw e} finally {child.kill();fixture.closeAllConnections();await new Promise(r=>fixture.close(r));rmSync(temporary,{recursive:true,force:true})}
