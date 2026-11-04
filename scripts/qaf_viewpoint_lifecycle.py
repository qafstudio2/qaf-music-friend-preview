"""Isolated prototype: pure, explicit single-ID operations; no network or writes."""
import base64,copy,hashlib,html,json,re
from html.parser import HTMLParser
def sha(b):return hashlib.sha256(b).hexdigest()
def packed(x):return json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2).encode('utf8')
class Check(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=True);self.depth=0;self.count=0
 def handle_starttag(self,t,attrs):
  if t in ('script','iframe','object','embed','form','style','base','link','meta'):raise ValueError('unsafe element')
  if t=='article':
   if self.depth:raise ValueError('nested article')
   self.depth=1;self.count+=1
  elif not self.depth:raise ValueError('outside article')
  for k,v in attrs:
   if k.lower().startswith('on') or k.lower() in ('srcdoc','style'):raise ValueError('unsafe attribute')
   if k.lower() in ('href','src','action','formaction','xlink:href'):
    value=re.sub(r'[\x00-\x20]','',v or '').lower()
    if value.startswith(('javascript:','vbscript:','data:')):raise ValueError('unsafe URL')
 def handle_endtag(self,t):
  if t=='article':
   if not self.depth:raise ValueError('invalid article close')
   self.depth=0
 def handle_data(self,d):
  if not self.depth and d.strip():raise ValueError('outside text')
def article_id(b):
 m=re.search(rb'^<article\b[^>]*\bdata-viewpoint-id="([a-zA-Z0-9-]+)"',b)
 return m[1].decode() if m else None
def title(b):
 m=re.search(rb'<h3\b[^>]*>(.*?)</h3>',b,re.S)
 if not m:raise ValueError('title missing')
 return ' '.join(html.unescape(re.sub('<[^>]+>','',m[1].decode())).split()).casefold()
def articles(page):return list(re.finditer(rb'<article\b.*?</article>',page,re.S))
def valid_article(b,id):
 c=Check();c.feed(b.decode('utf8'));c.close()
 if c.depth or c.count!=1 or article_id(b)!=id:raise ValueError('replacement must be one article with same stable ID')
 title(b)
def load(raw):
 h=json.loads(raw) if raw else {'schema':1,'versions':{},'events':[]}
 if h.get('schema')!=1:raise ValueError('history schema')
 previous=None
 for e in h['events']:
  payload={k:v for k,v in e.items() if k!='hash'}
  if e['previous']!=previous or sha(packed(payload))!=e['hash']:raise ValueError('history chain corrupt')
  previous=e['hash']
 for digest,v in h['versions'].items():
  b=base64.b64decode(v,validate=True)
  if sha(b)!=digest:raise ValueError('version corrupt')
 return h
def apply(page,history,spec,operation):
 if sha(page)!=spec['pageSha256'] or sha(history)!=spec['historySha256']:raise ValueError('stale page or history')
 h=copy.deepcopy(load(history))
 if any(e['operation']==operation for e in h['events']):raise ValueError('operation already in history; inspect receipt')
 id=spec['id'];action=spec['action']
 if not re.fullmatch('[a-zA-Z0-9-]{3,100}',id):raise ValueError('stable ID required')
 found=articles(page);matches=[(n,m) for n,m in enumerate(found) if article_id(m[0])==id]
 if len(matches)>1:raise ValueError('duplicate stable ID')
 before=None;after=None;anchors=None
 if action in ('modify','remove'):
  if len(matches)!=1:raise ValueError('target missing or lacks stable ID; migration required')
  n,m=matches[0];before=m[0]
  if sha(before)!=spec['articleSha256']:raise ValueError('target version changed')
  h['versions'][sha(before)]=base64.b64encode(before).decode()
  if action=='modify':
   after=base64.b64decode(spec['replacementBase64'],validate=True);valid_article(after,id)
   # Modification is not a new publication or a way to move daily counts.
   dates=lambda b:re.findall(rb'data-(?:publication|prepared)-date="[^"]*"',b)
   if dates(before)!=dates(after):raise ValueError('historical dates immutable')
   if before==after:raise ValueError('no change')
  else:
   anchors={'left':sha(found[n-1][0]) if n else None,'right':sha(found[n+1][0]) if n+1<len(found) else None,'prefixBase64':base64.b64encode(page[:m.start()]).decode() if len(found)==1 else None}
  output=page[:m.start()]+(after or b'')+page[m.end():]
 elif action=='restore':
  if matches:raise ValueError('restore ID collision')
  events=[e for e in h['events'] if e['id']==id]
  if not events or events[-1]['action']!='remove':raise ValueError('no outstanding recoverable removal')
  removed=events[-1]
  if removed['before']!=spec['articleSha256']:raise ValueError('restore version mismatch')
  after=base64.b64decode(h['versions'][removed['before']],validate=True);valid_article(after,id)
  anchors=removed['anchors'];right=[m for m in found if sha(m[0])==anchors['right']];left=[m for m in found if sha(m[0])==anchors['left']]
  if len(right)==1:at=right[0].start()
  elif len(left)==1:at=left[0].end()
  elif not found and anchors['prefixBase64'] is not None:
   prefix=base64.b64decode(anchors['prefixBase64']);
   if not page.startswith(prefix):raise ValueError('restore anchor changed')
   at=len(prefix)
  else:raise ValueError('restore anchors changed; explicit replan required')
  output=page[:at]+after+page[at:]
 else:raise ValueError('only modify/remove/restore supported')
 allparts=[m[0] for m in articles(output)];titles=[title(a) for a in allparts]
 ids=[article_id(a) for a in allparts if article_id(a)]
 if len(titles)!=len(set(titles)) or len(ids)!=len(set(ids)):raise ValueError('title or ID collision')
 if after:h['versions'][sha(after)]=base64.b64encode(after).decode()
 e={'operation':operation,'action':action,'id':id,'before':sha(before) if before else None,'after':sha(after) if after else None,'anchors':anchors,'pageBefore':sha(page),'pageAfter':sha(output),'previous':h['events'][-1]['hash'] if h['events'] else None}
 e['hash']=sha(packed(e));h['events'].append(e)
 return output,packed(h)
