"""Import read-only historical workbooks, retaining only the four requested players."""
import json,re,hashlib
from pathlib import Path
import openpyxl
ROOT=Path(__file__).resolve().parents[2]
PLAYERS=['Bryan','Kevin','Mike','Ed']
def text(v): return str(v).strip() if v is not None else ''
def number(v): return v if isinstance(v,(int,float)) and not isinstance(v,bool) else None
seasons=[]
for path in sorted(ROOT.glob('ColinsPhillipsBowl-*.xlsx')):
    season=re.search(r'(\d{4}-\d{4})',path.name).group(1)
    if season>='2026-2027': continue
    book=openpyxl.load_workbook(path,data_only=True)
    earnings=book['Earnings']
    header={text(c.value):c.column for c in earnings[1] if text(c.value)}
    wc=next(c.column for c in earnings[1] if text(c.value)=='Week')
    winner_col=header['Winner']; money_col=header['Earnings']
    ledger={}
    for row in earnings.iter_rows(min_row=2):
        if text(earnings.cell(row[0].row,wc).value)=='Total':break
        n=number(earnings.cell(row[0].row,wc).value)
        if n is None or not 1<=n<=18: continue
        winner=text(earnings.cell(row[0].row,winner_col).value)
        ledger[int(n)]={'winner':winner if winner in PLAYERS else None,'winnerOutsideGroup':bool(winner and winner not in PLAYERS),'earnings':number(earnings.cell(row[0].row,money_col).value) or 0}
    scores={}
    for row in earnings:
        for cell in row:
            if text(cell.value)!='Week':continue
            columns={text(earnings.cell(cell.row,c).value):c for c in range(cell.column+1,min(cell.column+5,earnings.max_column)+1)}
            if not all(p in columns for p in PLAYERS):continue
            for r in range(cell.row+1,earnings.max_row+1):
                n=number(earnings.cell(r,cell.column).value)
                if n is None:break
                scores[int(n)]={p:number(earnings.cell(r,columns[p]).value) for p in PLAYERS}
    rounds=[];notes=[]
    for sheet in book:
        match=re.match(r'^(Week|BR)\s*(\d+)',sheet.title.strip())
        if not match:continue
        kind='regular' if match[1]=='Week' else 'bragging'
        n=int(match[2]);cols={text(c.value):c.column for c in sheet[1] if text(c.value)}
        assert all(p in cols for p in PLAYERS),(path.name,sheet.title)
        wincol=cols['Winners']
        totals=next((r for r in range(2,sheet.max_row+1) if text(sheet.cell(r,1).value).startswith('Total Points')),sheet.max_row+1)
        correctrow=next((r for r in range(2,sheet.max_row+1) if text(sheet.cell(r,1).value)=='Total Correct Picks'),None)
        scorecol=next((cols[x] for x in ['Final Scores','Scores','Adjusted Score'] if x in cols),None)
        games=[]
        for r in range(2,totals):
            matchup=text(sheet.cell(r,1).value)
            if not matchup:continue
            games.append({'matchup':matchup,'picks':{p:text(sheet.cell(r,cols[p]).value) for p in PLAYERS},'winner':text(sheet.cell(r,wincol).value),'score':text(sheet.cell(r,scorecol).value) if scorecol else '', 'sourceRow':r})
        resolved=sum(bool(g['winner']) for g in games)
        computed={p:sum(bool(g['winner']) and g['winner'].lower()!='push' and g['picks'][p].casefold()==g['winner'].casefold() for g in games) for p in PLAYERS}
        record=ledger.get(n,{}) if kind=='regular' else {}
        counted=resolved>0 or bool(record.get('winner')) or record.get('winnerOutsideGroup',False)
        cached={p:number(sheet.cell(correctrow,cols[p]).value) if correctrow else None for p in PLAYERS}
        ledger_scores=scores.get(n,{}) if kind=='regular' else {}
        values={p:(ledger_scores.get(p) if ledger_scores.get(p) is not None else cached[p] if counted and cached[p] is not None else computed[p] if resolved else None) for p in PLAYERS}
        if not counted: values={p:None for p in PLAYERS}
        for p in PLAYERS:
            if counted and values[p]!=computed[p]:notes.append(f'{sheet.title.strip()}: {p} has {values[p]} recorded correct picks; the visible results yield {computed[p]}. Recorded total retained.')
        if resolved and resolved<len(games):notes.append(f'{sheet.title.strip()}: {len(games)-resolved} game result(s) are blank. Recorded weekly totals and winner retained.')
        if not counted:notes.append(f'{sheet.title.strip()}: no results entered; excluded from historical totals, including blank-match formula totals.')
        rounds.append({'id':f'{kind}-{n}','number':n,'kind':kind,'label':f'Week {n}' if kind=='regular' else f'Bragging Rights {n}','sourceSheet':sheet.title.strip(),'counted':bool(counted),'correct':values,'winner':record.get('winner'),'winnerOutsideGroup':record.get('winnerOutsideGroup',False),'earnings':record.get('earnings',0) if record.get('winner') else 0,'games':games,'predictions':{p:number(sheet.cell(totals,cols[p]).value) if totals<=sheet.max_row else None for p in PLAYERS}})
    for n,values in scores.items():
        if any(r['kind']=='regular' and r['number']==n for r in rounds) or not any(v is not None for v in values.values()):continue
        record=ledger.get(n,{})
        rounds.append({'id':f'regular-{n}','number':n,'kind':'regular','label':f'Week {n}','sourceSheet':'Earnings','counted':True,'correct':values,'winner':record.get('winner'),'winnerOutsideGroup':record.get('winnerOutsideGroup',False),'earnings':record.get('earnings',0) if record.get('winner') else 0,'games':[],'predictions':{p:None for p in PLAYERS}})
        notes.append(f'Week {n}: totals and winner are available in Earnings, but the pick sheet is missing.')
    rounds.sort(key=lambda r:(r['kind']!='regular',r['number']))
    regular=[r for r in rounds if r['kind']=='regular' and r['counted']]
    complete=len(regular)==18 and all(r['winner'] or r['winnerOutsideGroup'] for r in regular)
    stats=[]
    for p in PLAYERS:
        selected=[r for r in regular if r['correct'][p] is not None]
        stats.append({'name':p,'correct':sum(r['correct'][p] for r in selected),'braggingCorrect':sum(r['correct'][p] or 0 for r in rounds if r['kind']=='bragging' and r['counted']),'weeks':len(selected),'wins':sum(r['winner']==p for r in regular),'earnings':sum(r['earnings'] for r in regular if r['winner']==p),'bestWeek':max((r['correct'][p] for r in selected),default=0)})
    if not complete:notes.insert(0,'Partial season: only recorded results are included. No full-season champion is assigned.')
    if season=='2022-2023':
        notes.append('The Earnings summary omits Week 12 pick totals and the first recorded payout for Ed. History uses the individual weekly records, including Ed’s Week 3 payout and Kevin’s Week 12 win.')
    seasons.append({'id':season,'source':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'complete':complete,'stats':stats,'rounds':rounds,'notes':notes})
out={'players':PLAYERS,'championRule':'weeklyWins','seasons':seasons}
target=ROOT/'pool-site/lib/history.json'
target.write_text(json.dumps(out,indent=2)+'\n')
for s in seasons:print(s['id'], 'complete' if s['complete'] else 'partial', s['stats'],s['notes'])
