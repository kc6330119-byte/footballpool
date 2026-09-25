import {NextResponse} from 'next/server';
import {z} from 'zod';
import {access} from '@/lib/access';
import {readPool} from '@/lib/storage';
import {publicOrigin,sameOrigin} from '@/lib/origin';
import {players} from '@/lib/pool';
import {revealed} from '@/lib/submissions';
import {weeklyReport} from '@/lib/weekly-report';
import {mailConfigured,reportRecipients,reportVersion,sendReport} from '@/lib/report-mail';
export const runtime='nodejs';
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function prepare(number:number){
 const {pool}=await readPool();
 const week=pool.weeks.find(w=>w.number===number);
 if(!week?.games.length)return {error:'This week has no matchups yet.'};
 if(!revealed(week))return {error:'Picks are still private. Email reports open after all four players submit.'};
 const report=weeklyReport(pool,number,publicOrigin());
 const recipients=await reportRecipients();
 return {report,recipients,version:reportVersion(report,recipients)};
}
export async function GET(request:Request){
 try{
  const a=await access();if(!a.admin)return json({error:'Administrator access required.'},403);
  const number=Number(new URL(request.url).searchParams.get('week'));
  if(!Number.isInteger(number)||number<1||number>18)return json({error:'Choose a valid week.'},400);
  const prepared=await prepare(number);
  if('error' in prepared)return json(prepared,409);
  return json({...prepared,configured:mailConfigured()});
 }catch{return json({error:'Unable to prepare the newsletter. Please try again.'},503)}
}
export async function POST(request:Request){
 if(!sameOrigin(request))return json({error:'Request origin is not allowed.'},403);
 try{
  const a=await access();if(!a.admin)return json({error:'Administrator access required.'},403);
  const parsed=z.object({week:z.number().int().min(1).max(18),recipients:z.array(z.enum(players)).min(1).max(4).refine(v=>new Set(v).size===v.length),version:z.string().regex(/^[a-f0-9]{64}$/)}).strict().safeParse(await request.json());
  if(!parsed.success)return json({error:'Select at least one player and reload the preview if needed.'},400);
  if(!mailConfigured())return json({error:'Email delivery is not configured yet. Your newsletter is ready to preview.'},503);
  const prepared=await prepare(parsed.data.week);
  if('error' in prepared)return json(prepared,409);
  if(prepared.version!==parsed.data.version)return json({error:'The saved results or player addresses changed. Reload the preview before sending.'},409);
  const selected=prepared.recipients.filter(r=>parsed.data.recipients.includes(r.player));
  if(selected.some(r=>!r.available))return json({error:'A selected player needs an active account and a valid email address.'},400);
  const result=await sendReport(prepared.report,selected);
  if(result.failed.length)return json({error:`Gmail accepted the report for ${result.sent.join(', ')||'no players'}. It rejected ${result.failed.join(', ')}. Only rejected players remain selected.`,sent:result.sent,failed:result.failed},502);
  return json({ok:true,recipients:result.sent});
 }catch(e){console.error('Weekly email failed:',(e as {code?:string})?.code||'Unknown error');return json({error:'Gmail delivery could not be confirmed. Check Gmail Sent before retrying to avoid duplicates. If no message was sent, check the Gmail app password and try again.'},503)}
}
