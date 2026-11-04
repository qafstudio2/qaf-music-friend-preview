"""Viewpoint date, dedupe and ledger policy. Pure functions; no IO or scheduler."""
import copy,datetime,hashlib,html,json,re,unicodedata,base64
from html.parser import HTMLParser
import qaf_viewpoint_lifecycle as life
def packed(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2).encode('utf8')
def sha(b):return hashlib.sha256(b).hexdigest()
def normalize(s):return ' '.join(unicodedata.normalize('NFKC',html.unescape(s)).casefold().split())
def taiwan_day(now):
 if now.tzinfo is None or now.utcoffset() is None:raise ValueError('aware clock required')
 return now.astimezone(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
class Fields(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.attrs={};self.depth=0;self.skip=None;self.title_depth=0;self.title=[];self.body=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='article':
   if self.attrs:raise ValueError('nested article')
   if len(a)!=len(attrs):raise ValueError('duplicate attributes')
   self.attrs=a
  if t in ('br','img','hr','input','meta','link','source','wbr'):return
  self.depth+=1
  if t=='h3':self.title_depth=self.depth
  if t=='p' and 'viewpoint-dates' in a.get('class','').split():self.skip=self.depth
 def handle_endtag(self,t):
  if t in ('br','img','hr','input','meta','link','source','wbr'):return
  if self.depth==self.skip:self.skip=None
  if self.depth==self.title_depth:self.title_depth=0
  self.depth-=1
 def handle_startendtag(self,t,attrs):
  self.handle_starttag(t,attrs)
  if t not in ('br','img','hr','input','meta','link','source','wbr'):self.handle_endtag(t)
 def handle_data(self,d):
  if self.title_depth:self.title.append(d)
  elif not self.skip:self.body.append(d)
def metadata(a):
 p=Fields();p.feed(a.decode('utf8'));p.close();id=p.attrs.get('data-viewpoint-id')
 if not id or not re.fullmatch('[a-zA-Z0-9-]{3,100}',id):raise ValueError('stable ID required')
 date=p.attrs.get('data-publication-date');prepared=p.attrs.get('data-prepared-date')
 for value in (date,prepared):
  if value is not None:
   try:valid=datetime.date.fromisoformat(value).isoformat()==value
   except ValueError:valid=False
   if not valid:raise ValueError('invalid ISO date')
 title=normalize(' '.join(p.title));body=normalize(' '.join(p.body))
 if not title or not body:raise ValueError('title/body missing')
 return {'id':id,'publicationDate':date,'preparedDate':prepared,'title':title,'bodyHash':sha(body.encode()),'sourceDocument':p.attrs.get('data-source-document')}
def page_items(page):
 out={}
 for m in life.articles(page):
  d=metadata(m[0])
  if d['id'] in out:raise ValueError('duplicate ID')
  out[d['id']]={'article':m[0],'meta':d}
 return out
def load(raw):
 ledger=json.loads(raw) if raw else {'schema':1,'catalog':{},'events':[]}
 if ledger.get('schema')!=1:raise ValueError('ledger schema')
 previous=None
 for e in ledger['events']:
  payload={k:v for k,v in e.items() if k!='hash'}
  if e['previous']!=previous or sha(packed(payload))!=e['hash']:raise ValueError('ledger chain corrupt')
  previous=e['hash']
 return ledger
def reserve(catalog,a):
 d=metadata(a);id=d['id']
 if id in catalog and catalog[id]['publicationDate']!=d['publicationDate']:raise ValueError('historical publication date immutable')
 rec=catalog.setdefault(id,{'publicationDate':d['publicationDate'],'titles':[],'bodies':[],'sourceDocuments':[]})
 for k,v in [('titles',d['title']),('bodies',d['bodyHash']),('sourceDocuments',d['sourceDocument'])]:
  if v is not None and v not in rec[k]:rec[k].append(v)
def guard(before,after,ledger_raw,history_before,history_after,now,operation,action='append',target=None,backfill=None):
 day=taiwan_day(now);old=page_items(before);new=page_items(after);ledger=copy.deepcopy(load(ledger_raw))
 if any(e['operation']==operation for e in ledger['events']):raise ValueError('operation already recorded; inspect receipt')
 # Canonical Git hashes are also required by the surrounding publisher plan.
 for v in old.values():reserve(ledger['catalog'],v['article'])
 for raw in (history_before,history_after):
  h=life.load(raw)
  for value in h['versions'].values():reserve(ledger['catalog'],base64.b64decode(value,validate=True))
 added=set(new)-set(old);removed=set(old)-set(new);changed={id for id in set(old)&set(new) if old[id]['article']!=new[id]['article']}
 publications=[]
 if action=='append':
  if removed or changed:raise ValueError('append cannot alter old articles')
  if not added:raise ValueError('no new articles')
  for id in added:
   d=new[id]['meta'];life.valid_article(new[id]['article'],id)
   if id in ledger['catalog']:raise ValueError('reserved ID; use explicit restore')
   if d['publicationDate']!=day:raise ValueError('new publication date must equal Taiwan today')
   if d['preparedDate'] and d['preparedDate']>day:raise ValueError('future prepared date')
   publications.append(id)
  count=sum(v['publicationDate']==day for v in ledger['catalog'].values())
  if backfill is not None:
   if not isinstance(backfill,dict) or not isinstance(backfill.get('ids'),list) or not isinstance(backfill.get('reason'),str) or not backfill['reason'].strip():raise ValueError('reviewed backfill requires exact IDs and reason')
   if len(set(backfill['ids']))!=len(backfill['ids']) or set(backfill['ids'])!=set(publications):raise ValueError('backfill ID scope mismatch')
  if count+len(publications)>3 and backfill is None:raise ValueError('daily target includes removed publications; supply reviewed backfill IDs')
 elif action in ('modify','remove','restore'):
  if backfill is not None:raise ValueError('backfill applies only to new publications')
  expected={'modify':(set(),set(),{target}),'remove':(set(),{target},set()),'restore':({target},set(),set())}[action]
  if (added,removed,changed)!=expected:raise ValueError('unexpected lifecycle delta')
  hb=life.load(history_before);ha=life.load(history_after)
  if not ha['events'] or ha['events'][-1]['operation']!=operation or ha['events'][-1]['id']!=target or ha['events'][-1]['action']!=action:raise ValueError('matching lifecycle receipt required')
  if action=='restore':
   events=[e for e in hb['events'] if e['id']==target]
   if not events or events[-1]['action']!='remove' or sha(new[target]['article'])!=events[-1]['before']:raise ValueError('restore must use removed version')
 else:raise ValueError('unsupported operation')
 # Same source page can support distinct viewpoints; source alone is not a dupe.
 for id in added|changed:
  v=new[id]
  d=v['meta']
  for other,rec in ledger['catalog'].items():
   if other!=id and (d['title'] in rec['titles'] or d['bodyHash'] in rec['bodies']):raise ValueError('reserved title or same body')
  if any(other!=id and (d['title']==v2['meta']['title'] or d['bodyHash']==v2['meta']['bodyHash']) for other,v2 in new.items()):raise ValueError('duplicate normalized title or body')
 for v in new.values():reserve(ledger['catalog'],v['article'])
 e={'operation':operation,'action':action,'taiwanDate':day,'newPublicationIDs':sorted(publications),'reviewedBackfill':backfill,'dailyGoal':3,'beforePageSha256':sha(before),'afterPageSha256':sha(after),'previous':ledger['events'][-1]['hash'] if ledger['events'] else None};e['hash']=sha(packed(e));ledger['events'].append(e)
 return packed(ledger)
def lifecycle_candidate(page,ledger,history,spec,now,operation):
 after,newhistory=life.apply(page,history,spec,operation)
 newledger=guard(page,after,ledger,history,newhistory,now,operation,spec['action'],spec['id'])
 return after,newhistory,newledger
