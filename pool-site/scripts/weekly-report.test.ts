import assert from 'node:assert/strict';
import seed from '../lib/seed.json';
import {weeklyReport} from '../lib/weekly-report';
import {players,standings,ledgerStandings,seasonLeaders,type Pool} from '../lib/pool';
const pool=structuredClone(seed) as Pool, w=pool.weeks[2];
w.revealed=false;w.submitted={Bryan:false,Ed:false,Mike:false,Kevin:false,Randy:false,'AI The Greek':false};
assert.throws(()=>weeklyReport(pool,3,'https://pool.example'),/submitted/);
w.revealed=true;w.games=w.games.slice(0,2);w.winner='';w.note='<script>alert("bad")</script>';
for(const game of w.games){game.teams=['A','B'];game.matchup='A & B';game.winner='A';game.score='20–17';for(const p of players)game.picks[p]='A'}
w.totalPoints={Bryan:40,Ed:50,Mike:60,Kevin:70,Randy:null,'AI The Greek':null};w.actualTotal=39;
const report=weeklyReport(pool,3,'https://pool.example');
assert.ok(report.subject.includes('Bryan wins'));assert.ok(report.html.includes('CALCULATED WEEKLY WINNER'));
assert.ok(report.html.includes('&lt;script&gt;'));assert.ok(!report.html.includes('<script>'));
assert.ok(report.html.includes('A &amp; B'));assert.ok(report.html.includes('/newsletter/walker.jpeg'));
assert.ok(report.text.includes('week=3'));assert.ok(report.html.includes('https://pool.example/pool?tab=picks&amp;week=3'));
w.games[1].winner='';assert.ok(weeklyReport(pool,3,'https://pool.example').subject.includes('results update'));
w.winner='Mike';assert.ok(weeklyReport(pool,3,'https://pool.example').text.includes('recorded winner is shown'));
const before=weeklyReport(pool,3,'https://pool.example');pool.weeks[3].winner='Ed';pool.weeks[3].earnings=9999;assert.deepEqual(weeklyReport(pool,3,'https://pool.example'),before);
console.log('PASS: private-week blocking, tiebreaker winner, incomplete results, recorded winner, escaping, photos, selected-week links, and season cutoff.');

const championship=structuredClone(seed) as Pool;
for(const week of championship.weeks){week.winner='';week.earnings=0;week.revealed=true;for(const game of week.games)game.winner=''}
for(const week of championship.weeks.slice(0,4)){week.winner='Bryan';week.earnings=1000}
championship.weeks[4].winner='Mike';championship.weeks[4].earnings=50;
assert.equal(standings(championship)[0].name,'Mike');
assert.equal(standings(championship).find(p=>p.name==='Bryan')!.wins,0);
assert.equal(standings(championship).length,5);
assert.equal(ledgerStandings(championship).find(p=>p.name==='Bryan')!.earnings,4000);
championship.weeks[5].winner='Kevin';championship.weeks[5].earnings=50;
assert.deepEqual(seasonLeaders(championship).map(p=>p.name).sort(),['Kevin','Mike']);
assert.deepEqual(seasonLeaders({...championship,weeks:championship.weeks.slice(0,5)}).map(p=>p.name),['Mike']);
for(const [number,photo] of [[6,'walker.jpeg'],[7,'lambert.jpeg'],[8,'namath.jpeg'],[9,'butkus.jpeg'],[10,'walker.jpeg'],[11,'lambert.jpeg']] as const){
 const week=championship.weeks[number-1];week.games=structuredClone(pool.weeks[2].games);
 assert.equal(weeklyReport(championship,number,'https://pool.example').document.photo,photo);
}
assert.ok(weeklyReport(championship,7,'https://pool.example').document.seasonIntro.includes('Week 5 through Week 7'));
console.log('PASS: Week 5 championship start, preserved ledger, shared leaders, five-player roster, and Week 7 photo rotation.');
