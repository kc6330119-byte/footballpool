import {participants, historicalPlayers, weekFourAccountPlayers, weekFourPlayers, players, type Player, type Pool, type Week} from './pool';
export function submissions(w: Week): Record<Player, boolean> {
  return Object.fromEntries(players.map(p => [p, w.submitted?.[p] === true])) as Record<Player, boolean>;
}
// Replay older saves under their original roster so past drafts are not retroactively rejected.
export const rosterChangedAt=Date.parse('2026-09-29T19:57:44Z');
export const randyJoinedAt=Date.parse('2026-09-30T18:37:18Z');
export const aiJoinedAt=Date.parse('2026-10-03T01:03:34Z');
export const mikeRejoinedAt=Date.parse('2026-10-07T00:42:44Z');
export function allSubmitted(w: Week, at=Infinity) {return (w.number<4||at<rosterChangedAt?historicalPlayers:at<randyJoinedAt?['Bryan','Kevin'] as const:at<aiJoinedAt?weekFourAccountPlayers:at<mikeRejoinedAt?weekFourPlayers:participants(w)).every(p => submissions(w)[p])}
export function revealed(w: Week, at=Infinity) {
  // Weeks 1–2 were already public before this feature was introduced.
  return w.number <= 2 || w.revealed === true || allSubmitted(w,at);
}
export function completeEntry(w: Week, p: Player) {
  return w.games.length > 0 && w.games.every(g => g.teams.includes(g.picks[p])) && w.totalPoints[p] !== null && Number.isFinite(w.totalPoints[p]);
}
export function visiblePool(pool: Pool, player: Player | null): Pool {
  const view = structuredClone(pool);
  for (const w of view.weeks) {
    w.submitted = submissions(w);
    w.revealed = revealed(w);
    w.hiddenPlayers = [];
    if (w.revealed) continue;
    w.hiddenPlayers = players.filter(p => p !== player);
    for (const p of w.hiddenPlayers) {
      for (const g of w.games) g.picks[p] = '';
      w.totalPoints[p] = null;
      w.recordedTotals[p] = null;
    }
    // These derived fields and free-form notes could disclose unrevealed picks.
    w.winner = ''; w.earnings = 0; w.note = '';
    w.teamEarnings = {'Young Guns': 0, 'Old Farts': 0};
  }
  return view;
}
