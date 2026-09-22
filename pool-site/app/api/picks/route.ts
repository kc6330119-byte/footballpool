import {isClosed} from '@/lib/deadline';
import {NextResponse} from 'next/server';
import {access} from '@/lib/access';
import {readPool,saveWeek} from '@/lib/storage';
import {picksSchema,sameOrigin} from '@/lib/validation';
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'Request origin is not allowed.'},{status:403});try{const a=await access();if(!a.user||!a.player)return NextResponse.json({error:'Your sign-in has not been assigned a player.'},{status:403});const v=picksSchema.safeParse(await request.json());if(!v.success)return NextResponse.json({error:'Check your picks and total-points prediction.'},{status:400});const {pool}=await readPool();const w=pool.weeks[v.data.week-1];if(isClosed(w))return NextResponse.json({error:'This week is locked.'},{status:409});const p=a.player;
 for(const [id,pick] of Object.entries(v.data.picks)){const g=w.games.find(g=>g.id===id);if(!g||pick&&!g.teams.includes(pick))return NextResponse.json({error:'Choose a team listed in the matchup.'},{status:400});if(g.picks[p]!==pick&&(g.winner||(g.kickoff&&Date.parse(g.kickoff)<=Date.now())))return NextResponse.json({error:'A game has started or has a result. Its pick is locked.'},{status:409})}
 if(v.data.totalPoints!==w.totalPoints[p]&&w.games.some(g=>g.winner||(g.kickoff&&Date.parse(g.kickoff)<=Date.now())))return NextResponse.json({error:'The total-points prediction is locked after the first game starts.'},{status:409});
 for(const g of w.games)if(g.id in v.data.picks)g.picks[p]=v.data.picks[g.id];
 w.totalPoints[p]=v.data.totalPoints;
 if(!await saveWeek(w,v.data.revision,a.user.userId))return NextResponse.json({error:'The pool changed while you were editing. Reload the latest data and try again.'},{status:409});
 return NextResponse.json({ok:true,revision:v.data.revision+1});
 }catch(e){console.error('Picks save failed',e);return NextResponse.json({error:'Could not save your picks. Your entries are still here; please retry.'},{status:503})}}
