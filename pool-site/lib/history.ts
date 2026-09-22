import history from './history.json';
export const archive=history;
export type HistoricalSeason=typeof archive.seasons[number];
export type HistoricalRound=HistoricalSeason['rounds'][number];
export function historicalLeaders(season:HistoricalSeason,metric:'correct'|'wins'|'earnings'='wins'){
 if(!season.complete)return [];
 const top=Math.max(...season.stats.map(p=>p[metric]));
 return season.stats.filter(p=>p[metric]===top);
}
export function careerStats(){
 return archive.players.map(name=>{
  const stats=archive.seasons.map(s=>s.stats.find(p=>p.name===name)!);
  return {name,correct:stats.reduce((s,p)=>s+p.correct,0),braggingCorrect:stats.reduce((s,p)=>s+p.braggingCorrect,0),wins:stats.reduce((s,p)=>s+p.wins,0),earnings:stats.reduce((s,p)=>s+p.earnings,0),weeks:stats.reduce((s,p)=>s+p.weeks,0),titles:archive.seasons.filter(s=>historicalLeaders(s).some(p=>p.name===name)).length};
 }).sort((a,b)=>b.wins-a.wins||b.earnings-a.earnings);
}
