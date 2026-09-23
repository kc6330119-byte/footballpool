import {players, type Pool} from './pool';

// Quote every field for commas, quotes and line breaks; keep user-entered text
// from being interpreted as a spreadsheet formula when opened in Excel.
export function csvCell(value: string | number | null | undefined): string {
  let text = value == null ? '' : String(value);
  if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}

// Only export the privacy-filtered pool already available to this viewer.
export function exportVisibleCsv(pool: Pool): string {
  const rows: (string | number | null | undefined)[][] = [
    ['Week', 'Matchup', ...players, 'Winner', 'Score', 'Weekly Winner', 'Weekly Earnings'],
  ];
  for (const week of pool.weeks) {
    if (!week.games.length) continue;
    const privateWeek = !!week.hiddenPlayers?.length;
    for (const game of week.games) {
      rows.push([week.number, game.matchup,
        ...players.map(player => week.hiddenPlayers?.includes(player) ? 'Private' : game.picks[player]),
        game.winner, game.score, privateWeek ? '' : week.winner, privateWeek ? '' : week.earnings]);
    }
    rows.push([week.number, 'Total Points (last game)',
      ...players.map(player => week.hiddenPlayers?.includes(player) ? 'Private' : week.totalPoints[player]),
      '', week.actualTotal, '', '']);
  }
  // UTF-8 BOM and CRLF make the file open cleanly in Excel, including Unicode names.
  return '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
