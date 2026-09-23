import {NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {access,members,adminEmail} from '@/lib/access';
import {readPool,saveWeek} from '@/lib/storage';
import {updateRow} from '@/lib/airtable';
import {digest} from '@/lib/password';
import {publicOrigin} from '@/lib/origin';
import {weekSchema,sameOrigin} from '@/lib/validation';
import {players} from '@/lib/pool';
import {revealed,submissions} from '@/lib/submissions';
export async function GET(){try{const a=await access();if(!a.admin)return NextResponse.json({error:'Administrator access required.'},{status:403});const rows=await members();return NextResponse.json({members:rows.map(r=>({player:r.fields['Player Name'],email:r.fields.Email||''}))},{headers:{'Cache-Control':'no-store'}})}catch{return NextResponse.json({error:'Unable to load player access.'},{status:503})}}
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});
 try{
  const a=await access();if(!a.admin||!a.user)return NextResponse.json({error:'Administrator access required.'},{status:403});
  const b=await request.json() as {action?:string;week?:unknown;revision:number;player?:string};
  if(b.action==='member'||b.action==='invite'){
   const v=z.object({player:z.enum(players),email:z.string().email().max(254)}).safeParse(b);
   if(!v.success)return NextResponse.json({error:'Enter a valid player and email.'},{status:400});
   const email=v.data.email.trim().toLowerCase();
   if(v.data.player==='Kevin'&&email!==adminEmail())return NextResponse.json({error:'Your administrator email is fixed in the site settings.'},{status:400});
   const rows=await members();
   if(rows.some(r=>String(r.fields.Email||'').toLowerCase()===email&&r.fields['Player Name']!==v.data.player))return NextResponse.json({error:'That email is assigned to another player.'},{status:400});
   const row=rows.find(r=>r.fields['Player Name']===v.data.player);
   if(!row)throw new Error('Player record is missing.');
   const changed=String(row.fields.Email||'').toLowerCase()!==email;
   const fields:Record<string,unknown>={Email:email};
   if(changed)Object.assign(fields,{'Password Hash':null,'Setup Token Hash':null,'Setup Expires':null,'Failed Attempts':0,'Locked Until':null});
   let setupUrl:string|undefined;
   if(b.action==='invite'){
    const token=randomBytes(32).toString('base64url');
    Object.assign(fields,{'Setup Token Hash':digest(token),'Setup Expires':new Date(Date.now()+48*3600000).toISOString()});
    const url=new URL('/account/setup',process.env.NODE_ENV==='production'?publicOrigin():new URL(request.url).origin);url.searchParams.set('email',email);url.searchParams.set('token',token);setupUrl=url.toString();
   }
   await updateRow('Players',row.id,fields);
   return NextResponse.json({ok:true,setupUrl},{headers:{'Cache-Control':'no-store'}});
  }
  const v=weekSchema.safeParse(b.week);if(!v.success||!Number.isInteger(b.revision)||b.revision<0)return NextResponse.json({error:'Check the teams, results, amounts, and total points.'},{status:400});
  const state=await readPool();
  const before=state.pool.weeks.find(w=>w.number===v.data.number)!;
  // Submission status is player-owned; admin cannot force a premature reveal.
  v.data.submitted=submissions(before);
  if(!revealed(before)){
   for(const p of players){
    if(p===a.player)continue;
    for(const g of v.data.games)g.picks[p]=before.games.find(old=>old.id===g.id)?.picks[p]||'';
    v.data.totalPoints[p]=before.totalPoints[p];
    v.data.recordedTotals[p]=before.recordedTotals[p];
   }
   // The redacted view must not erase withheld notes or financial summaries.
   if(!v.data.note)v.data.note=before.note;
   if(!v.data.winner){v.data.winner=before.winner as typeof v.data.winner;v.data.earnings=before.earnings}
   for(const team of Object.keys(before.teamEarnings))if(!v.data.teamEarnings[team])v.data.teamEarnings[team]=before.teamEarnings[team];
   if(a.player&&(JSON.stringify(before.games.map(g=>g.picks[a.player!]))!==JSON.stringify(v.data.games.map(g=>g.picks[a.player!]))||before.totalPoints[a.player]!==v.data.totalPoints[a.player]))v.data.submitted[a.player]=false;
   const schedule=(w:typeof before)=>w.games.map(g=>({id:g.id,matchup:g.matchup,teams:g.teams}));
   if(JSON.stringify(schedule(before))!==JSON.stringify(schedule(v.data)))v.data.submitted={Bryan:false,Ed:false,Mike:false,Kevin:false};
  }
  const revision=await saveWeek(v.data,b.revision,a.user.userId);
  if(revision===null)return NextResponse.json({error:'Someone updated this week. Reload the latest data before saving.'},{status:409});
  return NextResponse.json({ok:true,revision});
 }catch(e){console.error('Admin save failed',e instanceof Error?e.message:'Unknown error');return NextResponse.json({error:'Could not save. Your entries are preserved; please retry.'},{status:503})}
}
