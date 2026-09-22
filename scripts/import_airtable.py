"""Create and import the current pool season. Re-runs never overwrite existing rows.

Run with Python 3.9+: python3 scripts/import_airtable.py
Credentials are read from the ignored root .env and never printed.
"""
import json
import re
from datetime import datetime
from zoneinfo import ZoneInfo
from urllib.parse import urlencode
from airtable_client import api, BASE, ROOT

seed = json.loads((ROOT / 'pool-site/lib/seed.json').read_text())
tables = {t['name']: t for t in api(f'meta/bases/{BASE}/tables')['tables']}
expected = {}

def field(name, kind='singleLineText', options=None):
    result = {'name': name, 'type': kind}
    if options is not None:
        result['options'] = options
    return result

def number(name, precision=0):
    return field(name, 'number', {'precision': precision})

def money(name):
    return field(name, 'currency', {'precision': 2, 'symbol': '$'})

def select(name, choices):
    return field(name, 'singleSelect', {'choices': [{'name': c} for c in choices]})

def check(name):
    return field(name, 'checkbox', {'icon': 'check', 'color': 'greenBright'})

def link(name, table):
    return field(name, 'multipleRecordLinks', {'linkedTableId': tables[table]['id']})

def date(name):
    return field(name, 'dateTime', {'dateFormat': {'name': 'iso'}, 'timeFormat': {'name': '24hour'}, 'timeZone': 'America/Chicago'})

def table(name, fields):
    if name not in tables:
        tables[name] = api(f'meta/bases/{BASE}/tables', 'POST', {
            'name': name, 'description': 'Football pool: imported from the 2026–2027 workbook.', 'fields': fields})
        print('Created table:', name, flush=True)
    else:
        existing = {f['name']: f for f in tables[name]['fields']}
        for f in fields:
            if f['name'] not in existing:
                added = api(f'meta/bases/{BASE}/tables/{tables[name]["id"]}/fields', 'POST', f)
                tables[name]['fields'].append(added)
            elif existing[f['name']]['type'] != f['type']:
                raise RuntimeError(f'Existing field type mismatch: {name}.{f["name"]}')

def records(name):
    rows, offset = [], None
    while True:
        suffix = '?' + urlencode({'offset': offset}) if offset else ''
        page = api(f'{BASE}/{tables[name]["id"]}{suffix}')
        rows.extend(page['records'])
        offset = page.get('offset')
        if not offset:
            return rows

def insert(name, primary, rows):
    found = {}
    for row in records(name):
        key = row['fields'].get(primary)
        if key in found:
            raise RuntimeError(f'Duplicate primary name in {name}: {key}')
        found[key] = row
    expected[name] = {r[primary]: {k: v for k, v in r.items() if v is not None} for r in rows}
    missing = [r for key, r in expected[name].items() if key not in found]
    for i in range(0, len(missing), 10):
        result = api(f'{BASE}/{tables[name]["id"]}', 'POST', {'records': [{'fields': r} for r in missing[i:i+10]]})
        for r in result['records']:
            found[r['fields'][primary]] = r
    print(f'{name}: {len(missing)} added, {len(rows)} expected', flush=True)
    return {key: row['id'] for key, row in found.items()}

table('Players', [field('Player Name'), field('Email', 'email'), select('Role', ['Administrator', 'Player']), select('Pool Team', ['Young Guns', 'Old Farts']), check('Active')])
table('Seasons', [field('Season Name'), number('Start Year'), select('Status', ['Upcoming', 'Active', 'Completed', 'Partial']), money('Default Weekly Dues'), link('Champions', 'Players'), field('Notes', 'multilineText')])
table('Weeks', [field('Week Name'), link('Season', 'Seasons'), number('Week Number'), select('Round Type', ['Regular Season', 'Bragging Rights']), date('Picks Deadline'), check('Locked'), number('Actual Total Points'), field('Notes', 'multilineText')])
table('Games', [field('Game Name'), link('Week', 'Weeks'), number('Game Order'), field('Away Team'), field('Home Team'), number('Home Spread', 1), date('Kickoff'), number('Away Score'), number('Home Score'), select('Spread Result', ['Pending', 'Away', 'Home', 'Push', 'Void']), *[select(p+' Pick', ['Away', 'Home']) for p in seed['players']], field('Original Matchup', 'multilineText'), field('Original Score', 'multilineText'), field('Original Picks', 'multilineText'), field('Import Notes', 'multilineText')])
table('Weeks', [link('Tiebreaker Game', 'Games')])
table('Weekly Results', [field('Entry Name'), link('Week', 'Weeks'), link('Player', 'Players'), number('Total Points Prediction', 2), number('Correct Picks'), check('Weekly Winner'), money('Earnings'), money('Dues'), field('Notes', 'multilineText')])

players = insert('Players', 'Player Name', [{'Player Name': p, 'Email': 'kc6330119@gmail.com' if p == 'Kevin' else None, 'Role': 'Administrator' if p == 'Kevin' else 'Player', 'Pool Team': 'Young Guns' if p in ['Kevin', 'Mike'] else 'Old Farts', 'Active': True} for p in seed['players']])
seasons = insert('Seasons', 'Season Name', [{'Season Name': seed['season'], 'Start Year': 2026, 'Status': 'Active', 'Default Weekly Dues': 5, 'Notes': 'Source: '+seed['source']+'. Champion: most weekly wins/earnings. Dues are scheduled amounts, not confirmation of payment.'}])
def weekname(w):
    return f'{seed["season"]} · Week {w["number"]}'
weeks = insert('Weeks', 'Week Name', [{'Week Name': weekname(w), 'Season': [seasons[seed['season']]], 'Week Number': w['number'], 'Round Type': 'Regular Season', 'Picks Deadline': datetime.fromisoformat(w['deadlineLocal']).replace(tzinfo=ZoneInfo('America/Chicago')).isoformat(), 'Locked': w['locked'], 'Actual Total Points': w['actualTotal'], 'Notes': w['note']} for w in seed['weeks']])
game_rows, lastgames, issues = [], {}, []
for w in seed['weeks']:
    for order, g in enumerate(w['games'], 1):
        away, home = g['teams']
        name = f'2026 W{w["number"]:02} G{order:02} · {away} @ {home}'
        row = {'Game Name': name, 'Week': [weeks[weekname(w)]], 'Game Order': order, 'Away Team': away, 'Home Team': home, 'Original Matchup': g['matchup'], 'Original Score': g['score'], 'Original Picks': json.dumps(g['picks'], ensure_ascii=False), 'Spread Result': 'Away' if g['winner'] == away else 'Home' if g['winner'] == home else g['winner'] or 'Pending'}
        notes = []
        parts = g['matchup'].split('@')
        for side, text in enumerate(parts):
            spread = re.search(r'\(([+-]?\d+(?:\.\d+)?)\)', text)
            if spread:
                row['Home Spread'] = float(spread[1]) * (-1 if side == 0 else 1)
        if 'Home Spread' not in row:
            notes.append('Spread needs review; original matchup preserved.')
        for p, pick in g['picks'].items():
            if pick in g['teams']:
                row[p+' Pick'] = 'Away' if pick == away else 'Home'
            elif pick:
                notes.append(f'{p} original pick "{pick}" does not exactly match either team; structured pick left blank.')
        if g['score']:
            parsed = re.fullmatch(r'(.+?)\s+(\d+)\s*-\s*(.+?)\s+(\d+)', g['score'])
            if parsed and {parsed[1], parsed[3]} == {away, home}:
                scores = {parsed[1]: int(parsed[2]), parsed[3]: int(parsed[4])}
                row.update({'Away Score': scores[away], 'Home Score': scores[home]})
            else:
                notes.append('Score text needs review; original score and recorded spread result preserved.')
        row['Import Notes'] = '\n'.join(notes)
        if notes:
            issues.append({'game': name, 'notes': notes})
        game_rows.append(row)
        lastgames[weeks[weekname(w)]] = name
games = insert('Games', 'Game Name', game_rows)
# Only fill missing tiebreaker links, leaving existing user choices intact.
patches = []
for r in records('Weeks'):
    if r['id'] in lastgames and not r['fields'].get('Tiebreaker Game'):
        patches.append({'id': r['id'], 'fields': {'Tiebreaker Game': [games[lastgames[r['id']]]]}})
for i in range(0, len(patches), 10):
    api(f'{BASE}/{tables["Weeks"]["id"]}', 'PATCH', {'records': patches[i:i+10]})
result_rows = []
for w in seed['weeks']:
    for p in seed['players']:
        result_rows.append({'Entry Name': f'2026 W{w["number"]:02} · {p}', 'Week': [weeks[weekname(w)]], 'Player': [players[p]], 'Total Points Prediction': w['totalPoints'][p], 'Correct Picks': w['recordedTotals'][p], 'Weekly Winner': w['winner'] == p, 'Earnings': w['earnings'] if w['winner'] == p else 0, 'Dues': w['dues'][p], 'Notes': 'Imported recorded workbook totals; scheduled dues are not payments.'})
insert('Weekly Results', 'Entry Name', result_rows)

# Read back every imported field; Airtable omits empty cells and normalizes dates to UTC.
primaries = {'Players': 'Player Name', 'Seasons': 'Season Name', 'Weeks': 'Week Name', 'Games': 'Game Name', 'Weekly Results': 'Entry Name'}
for name, desired in expected.items():
    actual = {r['fields'][primaries[name]]: r['fields'] for r in records(name)}
    for key, fields in desired.items():
        assert key in actual, f'Missing {name}: {key}'
        for col, value in fields.items():
            got = actual[key].get(col)
            if col == 'Picks Deadline':
                assert datetime.fromisoformat(got.replace('Z', '+00:00')) == datetime.fromisoformat(value)
            elif value in ('', False):
                assert got in (None, value), (name, key, col)
            else:
                assert got == value, (name, key, col)
    print('Verified:', name, len(desired), flush=True)
for r in records('Weeks'):
    if r['id'] in lastgames:
        assert r['fields']['Tiebreaker Game'] == [games[lastgames[r['id']]]]
report = {'season': seed['season'], 'counts': {name: len(rows) for name, rows in expected.items()}, 'reviewItems': issues, 'verified': True, 'baseUrl': 'https://airtable.com/'+BASE}
(ROOT / 'airtable-import-report.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(report, indent=2))
