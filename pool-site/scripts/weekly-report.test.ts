import assert from 'node:assert/strict';
import seed from '../lib/seed.json';
import {weeklyReport} from '../lib/weekly-report';
import {players,type Pool} from '../lib/pool';
const pool=structuredClone(seed) as Pool, w=pool.weeks[2];
w.revealed=false;w.submitted={Bryan:false,Ed:false,Mike:false,Kevin:false};
assert.throws(()=>weeklyReport(pool,3,'https://pool.example'),/submitted/);
w.revealed=true;w.games=w.games.slice(0,2);w.winner='';w.note='<script>alert("bad")</script>';
for(const game of w.games){game.teams=['A','B'];game.matchup='A & B';game.winner='A';game.score='20–17';for(const p of players)game.picks[p]='A'}
w.totalPoints={Bryan:40,Ed:50,Mike:60,Kevin:70};w.actualTotal=39;
const report=weeklyReport(pool,3,'https://pool.example');
assert.ok(report.subject.includes('Bryan wins'));assert.ok(report.html.includes('CALCULATED WEEKLY WINNER'));
assert.ok(report.html.includes('&lt;script&gt;'));assert.ok(!report.html.includes('<script>'));
assert.ok(report.html.includes('A &amp; B'));assert.ok(report.html.includes('/newsletter/walker.jpeg'));
assert.ok(report.text.includes('week=3'));assert.ok(report.html.includes('https://pool.example/pool?tab=picks&amp;week=3'));
w.games[1].winner='';assert.ok(weeklyReport(pool,3,'https://pool.example').subject.includes('results update'));
w.winner='Mike';assert.ok(weeklyReport(pool,3,'https://pool.example').text.includes('recorded winner is shown'));
const before=weeklyReport(pool,3,'https://pool.example');pool.weeks[3].winner='Ed';pool.weeks[3].earnings=9999;assert.deepEqual(weeklyReport(pool,3,'https://pool.example'),before);
console.log('PASS: private-week blocking, tiebreaker winner, incomplete results, recorded winner, escaping, photos, selected-week links, and season cutoff.');
