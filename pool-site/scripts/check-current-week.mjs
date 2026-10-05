import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {currentWeek,defaultWeek} from '../lib/current-week.ts';
const pool=JSON.parse(readFileSync(new URL('../lib/seed.json',import.meta.url)));
const at=s=>Date.parse(s);
for(const [date,week] of [
 ['2026-09-01T12:00:00Z',1],['2026-09-29T04:59:59Z',3],['2026-09-29T05:00:00Z',4],
 ['2026-10-04T12:00:00Z',4],['2026-10-06T04:59:59Z',4],['2026-10-06T05:00:00Z',5],
 ['2026-11-03T05:59:59Z',8],['2026-11-03T06:00:00Z',9],['2027-02-01T12:00:00Z',18]
])assert.equal(currentWeek(pool,at(date)),week,date);
assert.equal(defaultWeek(pool,'2',at('2026-10-04T12:00:00Z')),2);
for(const input of [undefined,'','0','19','nope','3.5'])assert.equal(defaultWeek(pool,input,at('2026-10-04T12:00:00Z')),4);
const changed=structuredClone(pool);for(const w of changed.weeks){w.deadlineLocal='2099-01-01T00:00';w.games=[];w.revealed=true}
assert.equal(currentWeek(changed,at('2026-10-04T12:00:00Z')),4);
console.log('PASS: Tuesday Central rollover, Monday night, daylight saving, season bounds, explicit week links, invalid links, and independence from deadlines/results.');
