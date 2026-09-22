"""Add website authentication and append-only saves without changing pool records."""
from airtable_client import api, BASE
schema = api(f'meta/bases/{BASE}/tables')
tables = {t['name']:t for t in schema['tables']}
players = tables['Players']
fields = [
 {'name':'Password Hash','type':'singleLineText'},
 {'name':'Setup Token Hash','type':'singleLineText'},
 {'name':'Setup Expires','type':'dateTime','options':{'dateFormat':{'name':'iso'},'timeFormat':{'name':'24hour'},'timeZone':'utc'}},
 {'name':'Failed Attempts','type':'number','options':{'precision':0}},
 {'name':'Locked Until','type':'dateTime','options':{'dateFormat':{'name':'iso'},'timeFormat':{'name':'24hour'},'timeZone':'utc'}},
]
for field in fields:
 if not any(f['name']==field['name'] for f in players['fields']):
  api(f'meta/bases/{BASE}/tables/{players["id"]}/fields','POST',field)
  print('Added Players field:',field['name'],flush=True)
if 'Pool Changes' not in tables:
 api(f'meta/bases/{BASE}/tables','POST',{'name':'Pool Changes','description':'Website saves. Each row commits a complete save as field-level changes. Do not edit or delete these records. Imported tables are the starting data; website reads apply this history on top.','fields':[
  {'name':'Change Name','type':'singleLineText'},
  {'name':'Season','type':'singleLineText'},
  {'name':'Week Number','type':'number','options':{'precision':0}},
  {'name':'Saved By','type':'singleLineText'},
  {'name':'Changes','type':'multilineText'}]})
 print('Created Pool Changes',flush=True)
print('Website schema ready.')
