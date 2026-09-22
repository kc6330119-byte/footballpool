import os,json,urllib.request,urllib.error,time,ssl
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def credentials():
 values={}
 for line in (ROOT/'.env').read_text().splitlines():
  line=line.strip()
  if not line or line.startswith('#') or '=' not in line:continue
  k,v=line.split('=',1);values[k.strip()]=v.strip().strip(chr(34)).strip(chr(39))
 token=values.get('AIRTABLE_PERSONAL_ACCESS_TOKEN') or values.get('AIRTABLE_API_KEY')
 if not token or not values.get('AIRTABLE_BASE_ID'):raise RuntimeError('Missing token or base ID in root .env.')
 return token,values['AIRTABLE_BASE_ID']
TOKEN,BASE=credentials()
def api(path,method='GET',body=None):
 req=urllib.request.Request('https://api.airtable.com/v0/'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+TOKEN,'Content-Type':'application/json'},method=method)
 try:
  with urllib.request.urlopen(req,timeout=45,context=ssl.create_default_context(cafile="/etc/ssl/cert.pem")) as r:return json.load(r)
 except urllib.error.HTTPError as e:
  try:detail=json.loads(e.read()).get('error',{})
  except:detail={}
  raise RuntimeError('Airtable HTTP '+str(e.code)+': '+json.dumps(detail).replace(TOKEN,'[redacted]')) from None
 finally:time.sleep(.23)
if __name__=='__main__':
 schema=api('meta/bases/'+BASE+'/tables')
 Path('/private/tmp/football-airtable-schema.json').write_text(json.dumps(schema,indent=2))
 print(json.dumps({'tables':[{'id':t['id'],'name':t['name'],'fields':[{'name':f['name'],'type':f['type']} for f in t['fields']]} for t in schema['tables']]},indent=2))
