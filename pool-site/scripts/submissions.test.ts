import assert from 'node:assert/strict';
import seed from '../lib/seed.json';
import {players,type Pool,type Week} from '../lib/pool';
import {visiblePool,revealed,submissions,completeEntry} from '../lib/submissions';
import {applyEvent} from '../lib/pick-events';
import {diff,document} from '../lib/changes';
import {deadlineUTC} from '../lib/deadline';
const base=structuredClone(seed.weeks[2]) as Week;
base.games=base.games.slice(0,1);
for(const p of players)base.games[0].picks[p]=base.games[0].teams[0];
base.submitted=submissions(base);base.revealed=false;
const time=deadlineUTC(base.deadlineLocal)-60000;
const pool={...seed,weeks:[base]} as Pool;
for(const viewer of [null,...players]){
 const view=visiblePool(pool,viewer).weeks[0];
 for(const p of players){
  assert.equal(view.games[0].picks[p],p===viewer?base.games[0].picks[p]:'');
  assert.equal(view.totalPoints[p],p===viewer?base.totalPoints[p]:null);
  if(p!==viewer)assert.equal(view.recordedTotals[p],null);
 }
 assert.equal(view.note,'');assert.equal(view.winner,'');
}
assert.equal(visiblePool(pool,'Kevin').weeks[0].hiddenPlayers!.length,3,'Admin has no privacy bypass');
const past=visiblePool({...seed,weeks:[seed.weeks[0],seed.weeks[1]]} as Pool,null);
assert.equal(past.weeks[0].games[0].picks.Mike,seed.weeks[0].games[0].picks.Mike);
let w=structuredClone(base);
for(const p of players){
 const next=structuredClone(w);next.submitted![p]=true;
 const result=applyEvent(w,{kind:'player',player:p,changes:diff(document(w),document(next))},time);
 assert.equal(result.accepted,true);w=result.week;
 assert.equal(revealed(w),p==='Kevin');
}
assert.deepEqual(visiblePool({...pool,weeks:[w]},null).weeks[0].games[0].picks,w.games[0].picks);
const late=structuredClone(w);late.totalPoints.Bryan=99;
const event={kind:'player' as const,player:'Bryan' as const,changes:diff(document(w),document(late))};
assert.equal(applyEvent(w,event,time).accepted,false,'All-submitted lock rejects even before Wednesday');
assert.equal(applyEvent(w,event,time).week.totalPoints.Bryan,w.totalPoints.Bryan,'In-flight late save cannot change revealed picks');
assert.equal(applyEvent(w,event.changes,time).week.totalPoints.Bryan,99,'Admin can correct after reveal');
const closed=structuredClone(base);closed.locked=true;
assert.equal(revealed(closed),false,'Deadline/manual lock does not reveal');
assert.equal(visiblePool({...pool,weeks:[closed]},'Kevin').weeks[0].games[0].picks.Bryan,'');
assert.equal(applyEvent(base,{kind:'player',player:'Bryan',changes:[{path:['submitted','Bryan'],value:true}]},deadlineUTC(base.deadlineLocal)+1).accepted,false);
const incomplete=structuredClone(base);incomplete.totalPoints.Bryan=null;
assert.equal(completeEntry(incomplete,'Bryan'),false);
assert.equal(applyEvent(incomplete,{kind:'player',player:'Bryan',changes:[{path:['submitted','Bryan'],value:true}]},time).accepted,false);
incomplete.totalPoints.Bryan=20;incomplete.games[0].picks.Bryan='';
assert.equal(completeEntry(incomplete,'Bryan'),false);
const three=structuredClone(base);three.submitted={Bryan:true,Ed:true,Mike:true,Kevin:false};
const draft=applyEvent(three,{kind:'player',player:'Bryan',changes:[{path:['submitted','Bryan'],value:false}]},time);
assert.equal(draft.accepted,true);assert.equal(revealed(draft.week),false);
assert.equal(draft.week.submitted!.Bryan,false);
assert.throws(()=>applyEvent(base,{kind:'player',player:'Bryan',changes:[{path:['totalPoints','Mike'],value:20}]},time));
assert.equal(revealed(applyEvent(w,[{path:['submitted','Kevin'],value:false}],time).week),true,'Reveal is irreversible');
console.log('PASS: server redaction including admin, historical visibility, four required complete submissions, draft withdrawal, deadline privacy, post-submit lock, in-flight saves, admin corrections, and irreversible reveal.');
