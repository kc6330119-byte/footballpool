import type {Pool} from '@/lib/pool';
import {standings} from '@/lib/pool';
import {deadlineUTC} from '@/lib/deadline';
import {archive,historicalLeaders} from '@/lib/history';
export function landingModel(pool:Pool,fromAirtable:boolean){
 const populated=pool.weeks.filter(w=>w.games.length);
 const week=populated.find(w=>deadlineUTC(w.deadlineLocal)>=Date.now())||populated.at(-1)||pool.weeks[0];
 const ranks=standings(pool);
 const settled=pool.weeks.filter(w=>w.winner).at(-1);
 const previous=standings({...pool,weeks:pool.weeks.filter(w=>w.number!==(settled?.number||0))});
 return {
  season:pool.season,week:week.number,deadline:deadlineUTC(week.deadlineLocal),seconds:Math.max(0,Math.floor((deadlineUTC(week.deadlineLocal)-Date.now())/1000)),fromAirtable,
  matchups:week.games.slice(0,6).map((g,i)=>{const spread=g.matchup.match(/\(([+-]?\d+(?:\.\d+)?)\)/);return {number:i+1,spread:spread?Math.abs(Number(spread[1])):null,final:!!g.winner}}),gameCount:week.games.length,
  ranks:ranks.map((p,i)=>({...p,rank:i+1,movement:previous.findIndex(x=>x.name===p.name)-i})),movementLabel:settled?`Since Week ${Math.max(1,settled.number-1)}`:'No prior comparison',
  latest:settled?`Week ${settled.number}: ${settled.winner} takes $${settled.earnings}`:'Results pending',
  champions:archive.seasons.filter(s=>s.complete&&['2023-2024','2024-2025','2025-2026'].includes(s.id)).map(s=>({year:s.id.slice(0,4),season:s.id,names:historicalLeaders(s).map(p=>p.name).join(' + '),wins:historicalLeaders(s)[0]?.wins||0,shared:historicalLeaders(s).length>1})),
 };
}
export type LandingData=ReturnType<typeof landingModel>;
