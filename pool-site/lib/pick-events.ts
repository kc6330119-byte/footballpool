import type {Player, Week} from './pool';
import {players} from './pool';
import {apply, document, weekFromDocument, type Change} from './changes';
import {allSubmitted, completeEntry, revealed, submissions} from './submissions';
import {isClosed} from './deadline';
export type PickEvent = {kind:'player';player:Player;changes:Change[]};
export function ownChange(c: Change, player: Player) {
  return (c.path.length === 2 && ['totalPoints','submitted'].includes(c.path[0]) && c.path[1] === player) || (c.path.length === 4 && c.path[0] === 'games' && c.path[2] === 'picks' && c.path[3] === player);
}
export function applyEvent(week: Week, event: Change[] | PickEvent, at: number): {week:Week;accepted:boolean} {
  const wasRevealed = revealed(week);
  if (!Array.isArray(event)) {
    if (event.kind !== 'player' || !players.includes(event.player) || event.changes.some(c => !ownChange(c,event.player) || c.remove)) throw new Error('Invalid player save');
    // Replay enforces the lock too: an in-flight save cannot slip past the fourth submission.
    if (wasRevealed || isClosed(week, at)) return {week,accepted:false};
    for (const c of event.changes) {
      if (c.path[0] === 'games') {
        const game = week.games.find(g=>g.id===c.path[1]);
        if (!game || (c.value !== '' && !game.teams.includes(String(c.value))) || game.winner || (game.kickoff && Date.parse(game.kickoff)<=at)) return {week,accepted:false};
      }
      if (c.path[0] === 'totalPoints' && week.games.some(g=>g.winner || (g.kickoff && Date.parse(g.kickoff)<=at))) return {week,accepted:false};
    }
  }
  const doc = document(week);
  apply(doc, Array.isArray(event)?event:event.changes);
  const next = weekFromDocument(doc);
  next.submitted = submissions(next);
  if (!Array.isArray(event) && next.submitted[event.player] && !completeEntry(next,event.player)) return {week,accepted:false};
  next.revealed = wasRevealed || allSubmitted(next);
  return {week:next,accepted:true};
}
