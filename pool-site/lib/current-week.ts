import type {Pool} from './pool';

// Season calendar, independent of editable pick deadlines and submission status.
// Week 1 starts Tuesday, September 8; every week runs through Monday night.
const seasonStart = Date.UTC(2026, 8, 8);
export function currentWeek(pool: Pick<Pool, 'weeks'>, now = Date.now()): number {
 const localDate = new Intl.DateTimeFormat('sv-SE', {timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const day = Date.parse(localDate+'T00:00:00Z');
 const number = Math.floor((day-seasonStart)/(7*86400000))+1;
 const numbers = pool.weeks.map(w=>w.number).sort((a,b)=>a-b);
 return numbers.filter(n=>n<=number).at(-1) ?? numbers[0];
}
export function defaultWeek(pool: Pick<Pool, 'weeks'>, requested: string | undefined, now = Date.now()): number {
 const number = Number(requested);
 return Number.isInteger(number)&&pool.weeks.some(w=>w.number===number)?number:currentWeek(pool,now);
}
