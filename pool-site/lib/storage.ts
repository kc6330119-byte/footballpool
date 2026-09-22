import 'server-only';
import {unstable_cache,revalidateTag} from 'next/cache';
import {isClosed} from './deadline';
import seed from './seed.json';
import {players, type Player, type Pool, type Week} from './pool';
import {createRow, listRows, type Row} from './airtable';
import {apply, diff, document, revision, weekFromDocument, type Change} from './changes';
const text = (r: Row, key: string) => typeof r.fields[key] === 'string' ? r.fields[key] as string : '';
const num = (r: Row, key: string) => typeof r.fields[key] === 'number' ? r.fields[key] as number : null;
const links = (r: Row, key: string) => (r.fields[key] || []) as string[];
function localDate(value: string) {
  return new Intl.DateTimeFormat('sv-SE', {timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(new Date(value)).replace(' ', 'T');
}
export async function readPool() {
  const tables: Record<string, Row[]> = {};
  for (const name of ['Players', 'Seasons', 'Weeks', 'Games', 'Weekly Results', 'Pool Changes']) {
    tables[name] = await listRows(name);
    await new Promise(resolve => setTimeout(resolve, 220));
  }
  const season = tables.Seasons.find(r => text(r, 'Season Name') === seed.season);
  if (!season) throw new Error('Current season is missing from Airtable.');
  const playerIds = Object.fromEntries(tables.Players.filter(r => players.includes(text(r, 'Player Name') as Player)).map(r => [r.id, text(r, 'Player Name') as Player]));
  const pool = structuredClone(seed) as Pool;
  pool.weeks = tables.Weeks.filter(r => links(r, 'Season').includes(season.id)).map(row => {
    const n = num(row, 'Week Number')!;
    const original = seed.weeks.find(w => w.number === n);
    if (!original) throw new Error('Invalid week number in Airtable.');
    const w = structuredClone(original) as Week;
    w.locked = row.fields.Locked === true;
    w.deadlineLocal = localDate(text(row, 'Picks Deadline'));
    w.actualTotal = num(row, 'Actual Total Points'); w.note = text(row, 'Notes');
    w.winner = ''; w.earnings = 0;
    w.games = tables.Games.filter(g => links(g, 'Week').includes(row.id)).sort((a, b) => (num(a, 'Game Order') || 0) - (num(b, 'Game Order') || 0)).map(g => {
      const teams = [text(g, 'Away Team'), text(g, 'Home Team')];
      const picks = Object.fromEntries(players.map(p => {
        const pick = text(g, p+' Pick');
        let raw: Record<string,string> = {};
        try { raw = JSON.parse(text(g, 'Original Picks') || '{}'); } catch { /* Invalid source JSON stays blank. */ }
        return [p, pick === 'Away' ? teams[0] : pick === 'Home' ? teams[1] : raw[p] || ''];
      })) as Record<Player,string>;
      const result = text(g, 'Spread Result');
      return {id: g.id, teams, picks, matchup: text(g, 'Original Matchup') || `${teams[0]} @ ${teams[1]} (${num(g, 'Home Spread') ?? 0})`, score: text(g, 'Original Score'), kickoff: text(g, 'Kickoff'), winner: result === 'Away' ? teams[0] : result === 'Home' ? teams[1] : result === 'Push' ? 'Push' : ''};
    });
    const tie = links(row, 'Tiebreaker Game')[0];
    if (tie && w.games.at(-1)?.id !== tie) throw new Error('Tiebreaker must be the last listed game.');
    for (const r of tables['Weekly Results'].filter(r => links(r, 'Week').includes(row.id))) {
      const p = playerIds[links(r, 'Player')[0]];
      if (!p) continue;
      w.totalPoints[p] = num(r, 'Total Points Prediction'); w.recordedTotals[p] = num(r, 'Correct Picks'); w.dues[p] = num(r, 'Dues') || 0;
      if (r.fields['Weekly Winner']) {w.winner = p; w.earnings = num(r, 'Earnings') || 0;}
    }
    const doc = document(w);
    for (const change of tables['Pool Changes'].filter(r => text(r, 'Season') === seed.season && num(r, 'Week Number') === n).sort((a, b) => a.createdTime.localeCompare(b.createdTime) || a.id.localeCompare(b.id))) {
      apply(doc, JSON.parse(text(change, 'Changes')) as Change[]);
    }
    return weekFromDocument(doc);
  }).sort((a, b) => a.number - b.number);
  if (pool.weeks.length !== 18) throw new Error('The season must contain 18 weeks.');
  return {pool, revisions: Object.fromEntries(pool.weeks.map(w => [w.number, revision(w)]))};
}
export const readPoolCached = unstable_cache(readPool, ['pool-airtable-v1'], {revalidate:30,tags:['pool']});
export async function saveWeek(week: Week, expected: number, userId: string, player?: Player) {
  const current = await readPool();
  const before = current.pool.weeks.find(w => w.number === week.number)!;
  if (current.revisions[week.number] !== expected || (player && isClosed(before))) return null;
  const changes = diff(document(before), document(week));
  if (player && changes.some(c => !(c.path.length === 2 && c.path[0] === 'totalPoints' && c.path[1] === player) && !(c.path.length === 4 && c.path[0] === 'games' && c.path[2] === 'picks' && c.path[3] === player))) throw new Error('Unauthorized player change');
  // A single immutable record commits the complete save, avoiding partial writes.
  // Field-level patches keep concurrent saves by different players independent.
  if (changes.length) await createRow('Pool Changes', {'Change Name': crypto.randomUUID(), Season: seed.season, 'Week Number': week.number, 'Saved By': userId, Changes: JSON.stringify(changes)});
  revalidateTag('pool', {expire:0});
  return revision(week);
}
