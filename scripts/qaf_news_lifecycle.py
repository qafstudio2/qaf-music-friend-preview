"""Single-news lifecycle; public version archive, explicit hashes, no IO."""
import copy,hashlib,json,re
PATTERN=rb'(<script id="news-digest-data" type="application/json">)(.*?)(</script>)'
def packed(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2).encode('utf8')
def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(packed(x))
def unpack(page):
 m=re.search(PATTERN,page,re.S)
 if not m:raise ValueError('news JSON missing')
 return m,json.loads(m[2])
def history(raw):
 h=json.loads(raw) if raw else {'schema':1,'versions':{},'catalog':{},'events':[]}
 if h.get('schema')!=1:raise ValueError('history schema')
 previous=None
 for e in h['events']:
  body={k:v for k,v in e.items() if k!='hash'}
  if e['previous']!=previous or digest(body)!=e['hash']:raise ValueError('history chain corrupt')
  previous=e['hash']
 for key,v in h['versions'].items():
  if digest(v)!=key:raise ValueError('version corrupt')
 return h
def identity(i):return (i['brand'].strip().casefold(),i['product'].strip().casefold())
def same(a,b):return a['articleUrl'].rstrip('/')==b['articleUrl'].rstrip('/') or identity(a)==identity(b)
def card(i):
 if not re.fullmatch('[A-Za-z0-9-]+',i['id']):raise ValueError('invalid news ID')
 if len(i['function']+i['features'])>100 or not 0<=i['funScore']<=5:raise ValueError('card contract')
 if not re.fullmatch(r'assets/news-[a-z0-9-]+\.(png|jpg|jpeg|webp)',i['image']['src']):raise ValueError('image path')
 if i.get('demo',{}).get('url') and not re.fullmatch(r'https://www.youtube.com/watch\?v=[\w-]{11}',i['demo']['url']):raise ValueError('demo URL')
 if '</script' in json.dumps(i).lower():raise ValueError('script boundary in data')
def check_items(items):
 if len({i['id'] for i in items})!=len(items):raise ValueError('duplicate news ID')
 for n,i in enumerate(items):
  if any(same(i,j) for j in items[n+1:]):raise ValueError('duplicate product or source')
def validate_additions(before_page,after_page,raw,day):
 """Archive-aware quota/dedupe, in addition to the existing news validator."""
 _,before=unpack(before_page);_,after=unpack(after_page);h=history(raw)
 prior={i['id']:i for i in before['items']};known=dict(h['catalog'])
 for i in before['items']+after['items']:
  if i['id'] in known and known[i['id']]!=i['digestDate']:raise ValueError('historical digest date changed')
  known[i['id']]=i['digestDate']
 if sum(d==day for d in known.values())>3:raise ValueError('daily limit includes recoverably removed items')
 archived=list(h['versions'].values())
 for i in after['items']:
  if i['id'] not in prior and i['id'] in h['catalog']:raise ValueError('reserved news ID; use explicit restore')
  if any(j['id']!=i['id'] and same(i,j) for j in archived):raise ValueError('reserved archived product or source')
def apply(page,raw,spec,operation,day):
 if sha(page)!=spec['pageSha256'] or sha(raw)!=spec['historySha256']:raise ValueError('stale page or history')
 m,data=unpack(page);h=copy.deepcopy(history(raw));items=data['items'];check_items(items)
 if any(e['operation']==operation for e in h['events']):raise ValueError('operation already recorded; inspect receipt')
 for i in items:
  if i['id'] in h['catalog'] and h['catalog'][i['id']]!=i['digestDate']:raise ValueError('catalog date corrupt')
  h['catalog'][i['id']]=i['digestDate']
 id=spec['id'];action=spec['action'];matches=[n for n,i in enumerate(items) if i['id']==id];before=None;after=None;anchors=None
 if action in ('modify','remove'):
  if len(matches)!=1:raise ValueError('target missing')
  n=matches[0];before=items[n]
  if digest(before)!=spec['itemSha256']:raise ValueError('item version changed')
  h['versions'][digest(before)]=copy.deepcopy(before)
  if action=='modify':
   after=copy.deepcopy(spec['replacement']);card(after)
   if after['id']!=id or after['digestDate']!=before['digestDate']:raise ValueError('ID and digest date immutable')
   if after==before:raise ValueError('no change')
   items[n]=after
  else:
   anchors={'left':items[n-1]['id'] if n else None,'right':items[n+1]['id'] if n+1<len(items) else None,'sole':len(items)==1}
   items.pop(n)
 elif action=='restore':
  if matches:raise ValueError('restore ID collision')
  events=[e for e in h['events'] if e['id']==id]
  if not events or events[-1]['action']!='remove':raise ValueError('no outstanding removal')
  last=events[-1]
  if last['before']!=spec['itemSha256']:raise ValueError('restore version mismatch')
  after=copy.deepcopy(h['versions'][last['before']]);card(after);anchors=last['anchors']
  right=[n for n,i in enumerate(items) if i['id']==anchors['right']];left=[n for n,i in enumerate(items) if i['id']==anchors['left']]
  if right:n=right[0]
  elif left:n=left[0]+1
  elif not items and anchors['sole']:n=0
  else:raise ValueError('restore anchors missing; explicit replan')
  items.insert(n,after)
 else:raise ValueError('only modify/remove/restore supported')
 check_items(items)
 if after:
  for v in h['versions'].values():
   if v['id']!=id and same(after,v):raise ValueError('reserved archived product or source')
  h['versions'][digest(after)]=copy.deepcopy(after)
 if sum(d==day for d in h['catalog'].values())>3:raise ValueError('daily limit includes history')
 output=page[:m.start(2)]+packed(data)+page[m.end(2):]
 e={'operation':operation,'action':action,'id':id,'before':digest(before) if before else None,'after':digest(after) if after else None,'anchors':anchors,'pageBefore':sha(page),'pageAfter':sha(output),'previous':h['events'][-1]['hash'] if h['events'] else None};e['hash']=digest(e);h['events'].append(e)
 return output,packed(h)
