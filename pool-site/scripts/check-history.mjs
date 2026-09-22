import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const raw=readFileSync(new URL('../lib/history.json',import.meta.url),'utf8');
const data=JSON.parse(raw);
assert.deepEqual(data.players,['Bryan','Kevin','Mike','Ed']);
assert.equal(data.championRule,'weeklyWins');
assert.equal(data.seasons.length,4);
assert.ok(!/Scott|Ray/i.test(raw),'Excluded participants must not be imported');
const expected={
 '2022-2023':{complete:false,wins:[3,1,1,4],money:[130,50,50,190],correct:[106,98,96,102]},
 '2023-2024':{complete:true,wins:[5,4,5,4],money:[200,160,200,160],correct:[225,220,205,222]},
 '2024-2025':{complete:true,wins:[3,7,4,4],money:[120,280,160,160],correct:[212,210,211,214]},
 '2025-2026':{complete:true,wins:[2,5,5,6],money:[80,200,200,240],correct:[160,171,160,173]}
};
for(const season of data.seasons){
 const e=expected[season.id];assert.equal(season.complete,e.complete);
 assert.deepEqual(season.stats.map(p=>p.name),data.players);
 assert.deepEqual(season.stats.map(p=>p.wins),e.wins);
 assert.deepEqual(season.stats.map(p=>p.earnings),e.money);
 assert.deepEqual(season.stats.map(p=>p.correct),e.correct);
 assert.equal(new Set(season.rounds.map(r=>r.id)).size,season.rounds.length);
 for(const r of season.rounds){
  assert.ok(!r.winner||data.players.includes(r.winner));
  for(const g of r.games)assert.deepEqual(Object.keys(g.picks),data.players);
  if(!r.counted)assert.ok(Object.values(r.correct).every(x=>x===null));
 }
 for(const p of season.stats){
  const regular=season.rounds.filter(r=>r.kind==='regular'&&r.counted);
  assert.equal(p.correct,regular.reduce((sum,r)=>sum+(r.correct[p.name]??0),0));
  assert.equal(p.wins,regular.filter(r=>r.winner===p.name).length);
  assert.equal(p.earnings,regular.reduce((sum,r)=>sum+(r.winner===p.name?r.earnings:0),0));
 }
}
const oldest=data.seasons[0];
assert.ok(oldest.rounds.find(r=>r.number===6).winnerOutsideGroup);
assert.equal(oldest.rounds.find(r=>r.number===6).winner,null);
assert.equal(oldest.rounds.find(r=>r.number===13).correct.Mike,null);
assert.equal(oldest.rounds.find(r=>r.number===3).sourceSheet,'Earnings');
assert.deepEqual(data.seasons[3].stats.map(p=>p.braggingCorrect),[6,10,6,5]);
assert.equal(data.seasons.reduce((s,x)=>s+x.stats.reduce((n,p)=>n+p.earnings,0),0),2580);
console.log('PASS: all four source seasons reconcile; excluded players, partial weeks, shared titles, recorded payouts, and separate Bragging Rights totals verified.');
