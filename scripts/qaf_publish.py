"""Shared QAF writer. Uses existing Git authentication; never reads credentials.
prepare holds a machine-local lease until verify/abort. No automatic push/retry.
"""
import argparse,datetime,hashlib,json,os,re,subprocess,sys,urllib.request
from pathlib import Path
from html.parser import HTMLParser
REMOTE='https://github.com/qafstudio2/qaf-music-friend-preview.git'
API='https://api.github.com/repos/qafstudio2/qaf-music-friend-preview'
FORMAL='https://qaf.tw/music/'
STATE=Path.home()/'Documents'/'Codex'/'2026-10-16'/'task'/'qaf-publisher-state'
def sha(b):return hashlib.sha256(b).hexdigest()
def encode(d):return json.dumps(d,ensure_ascii=False,sort_keys=True,indent=2).encode('utf8')
def git(repo,*args):
 p=subprocess.run(['git','-C',str(repo),*args],capture_output=True)
 if p.returncode:raise RuntimeError('git '+args[0]+' failed; no automatic retry: '+p.stderr.decode('utf8','replace')[-1500:])
 return p.stdout.decode('utf8').strip()
def news(b):
 m=re.search(rb'<script id="news-digest-data" type="application/json">(.*?)</script>',b,re.S)
 if not m:raise ValueError('news data missing')
 return json.loads(m[1])['items']
def articles(b):return re.findall(rb'<article\b.*?</article>',b,re.S)
def title(a):
 m=re.search(rb'<h3[^>]*>(.*?)</h3>',a,re.S);return m[1] if m else b''
class Safe(HTMLParser):
 def handle_starttag(self,t,attrs):
  if t in ('script','iframe','object','embed','form','style'):raise ValueError('unsafe viewpoint element')
  if any(k.lower().startswith('on') or (v or '').strip().lower().startswith('javascript:') for k,v in attrs):raise ValueError('unsafe viewpoint attribute')
def validate(kind,old,new,day):
 """No deletions in this entry; per-entry modification allowed, history retained."""
 if kind=='news':
  before,after=news(old),news(new);ids=[i['id'] for i in after]
  if len(ids)!=len(set(ids)):raise ValueError('duplicate news id')
  prior={i['id']:i for i in before};current={i['id']:i for i in after}
  if not prior.keys()<=current.keys():raise ValueError('news removal requires separate reviewed procedure')
  urls=[i['articleUrl'].rstrip('/') for i in after];products=[(i['brand'].strip().casefold(),i['product'].strip().casefold()) for i in after]
  if len(set(urls))!=len(urls) or len(set(products))!=len(products):raise ValueError('duplicate source or product')
  added=[i for i in after if i['id'] not in prior]
  if any(i['digestDate']!=day for i in added):raise ValueError('new digest date must be current Taiwan day')
  if sum(i['digestDate']==day for i in after)>3:raise ValueError('daily limit exceeded')
  for i in after:
   if i['id'] in prior and i['digestDate']!=prior[i['id']]['digestDate']:raise ValueError('historical digest date changed')
   if i['id'] in prior and i==prior[i['id']]:continue
   if len(i['function']+i['features'])>100 or not 0<=i['funScore']<=5:raise ValueError('card contract')
   if not re.fullmatch(r'assets/news-[a-z0-9-]+\.(png|jpg|jpeg|webp)',i['image']['src']):raise ValueError('image path')
   d=i.get('demo',{})
   if d.get('url') and not re.fullmatch(r'https://www.youtube.com/watch\?v=[\w-]{11}',d['url']):raise ValueError('demo URL')
  return [i['id'] for i in added]
 before,after=articles(old),articles(new)
 # Exact old article preservation prevents a stale full-page snapshot losing edits.
 if any(a not in after for a in before):raise ValueError('viewpoint historical article changed or removed')
 added=[a for a in after if a not in before];titles=[title(a) for a in after]
 if len(set(titles))!=len(titles):raise ValueError('duplicate viewpoint title')
 ids=re.findall(rb'data-viewpoint-id="([^"]+)"',new)
 if len(ids)!=len(set(ids)):raise ValueError('duplicate viewpoint id')
 for a in added:Safe().feed(a.decode('utf8'))
 return [title(a).decode('utf8') for a in added]
class Publisher:
 def __init__(self,repo,state=STATE,remote=REMOTE,formal=FORMAL):
  self.repo=Path(repo).resolve();self.state=Path(state).resolve();self.state.mkdir(parents=True,exist_ok=True)
  self.remote=remote;self.formal=formal;self.lock=self.state/'writer.lock'
 def receipt(self,op):
  if not re.fullmatch(r'[A-Za-z0-9-]{8,100}',op):raise ValueError('invalid operation id')
  return self.state/(op+'.json')
 def read(self,op):return json.loads(self.receipt(op).read_text(encoding='utf8'))
 def save(self,r):
  f=self.receipt(r['operation']);tmp=f.with_suffix('.tmp');tmp.write_bytes(encode(r));os.replace(tmp,f)
 def owned(self,op):
  if not self.lock.exists() or self.lock.read_text()!=op:raise RuntimeError('operation does not own shared machine-local lease')
 def latest(self):
  git(self.repo,'fetch',self.remote,'main');return git(self.repo,'rev-parse','FETCH_HEAD')
 def prepare(self,plan):
  op=plan['operation'];path=self.receipt(op);fingerprint=sha(encode(plan))
  if path.exists():
   r=self.read(op)
   if r['planHash']!=fingerprint:raise ValueError('operation payload mismatch')
   return r # Never repeat a previous prepare/push automatically.
  fd=os.open(self.lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY)
  with os.fdopen(fd,'w') as f:f.write(op)
  r={'operation':op,'planHash':fingerprint,'status':'preparing','kind':plan['kind'],'files':{},'startedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat()};self.save(r)
  try:
   base=self.latest();r['base']=base;self.save(r)
   if base!=plan['base']:raise ValueError('stale plan: rebuild against fetched main with a new operation id')
   stage=self.state/(op+'-stage');git(self.repo,'worktree','add','--detach',str(stage),base);r['stage']=str(stage);self.save(r)
   originals={};changes={};kind=plan['kind']
   if kind not in ('news','viewpoints','maintenance'):raise ValueError('invalid publication kind')
   for entry in plan['files']:
    name=entry['path'];dest=stage/name
    allowed=(bool(re.fullmatch(r'scripts/qaf[-_a-z0-9]+\.(py|cjs|md)',name)) if kind=='maintenance' else name in ('friend-news-digest.html','qaf-page-viewpoints.html') and name==('friend-news-digest.html' if kind=='news' else 'qaf-page-viewpoints.html') or kind=='news' and bool(re.fullmatch(r'assets/news-[a-z0-9-]+\.(png|jpg|jpeg|webp)',name)))
    if not allowed:raise ValueError('out-of-scope file: '+name)
    if name in changes:raise ValueError('duplicate file path')
    old=dest.read_bytes() if dest.exists() else b''
    if sha(old)!=entry['beforeSha256']:raise ValueError('file base hash mismatch: '+name)
    source=Path(entry['source']).resolve();data=source.read_bytes()
    if sha(data)!=entry['sha256']:raise ValueError('source hash mismatch')
    originals[name]=old;changes[name]=data
   if not changes or all(originals[n]==b for n,b in changes.items()):raise ValueError('no content changes; do not republish')
   if kind!='maintenance':
    page='friend-news-digest.html' if kind=='news' else 'qaf-page-viewpoints.html'
    if page not in changes:raise ValueError('missing target page')
    day=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).date().isoformat()
    r['added']=validate(kind,originals[page],changes[page],day)
    if kind=='news':
     from PIL import Image
     for i in news(changes[page]):
      asset=i['image']['src'];file=stage/asset
      if asset in changes:
       import io
       im=Image.open(io.BytesIO(changes[asset]));im.load()
      else:
       if not file.is_file():raise ValueError('missing product image')
       im=Image.open(file);im.load()
     # Updating only common cache/size fields, never product-specific CSS.
    index=(stage/'index.html').read_bytes();label='news' if kind=='news' else 'viewpoints'
    index,count=re.subn(rb'("'+label.encode()+rb'":)\d+',lambda m:m[1]+str(len(changes[page])).encode(),index,count=1)
    if count!=1:raise ValueError('cache size mapping not found')
    index,count=re.subn(rb"(name === '"+label.encode()+rb"' \? ')[^']+(')",lambda m:m[1]+('guard-'+op).encode()+m[2],index,count=1)
    if count!=1:raise ValueError('cache version mapping not found')
    originals['index.html']=(stage/'index.html').read_bytes();changes['index.html']=index
   marker=stage/'qaf-publication.json';originals['qaf-publication.json']=marker.read_bytes() if marker.exists() else b''
   changes['qaf-publication.json']=encode({'operation':op,'base':base,'planHash':fingerprint,'kind':kind})
   backup=self.state/(op+'-backup');backup.mkdir()
   for name,data in originals.items():
    target=backup/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
   r['backup']=str(backup);r['beforeHashes']={n:sha(b) for n,b in originals.items()};self.save(r)
   for name,data in changes.items():
    dest=stage/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);r['files'][name]=sha(data)
   git(stage,'add','--',*changes);git(stage,'-c','user.name=Codex','-c','user.email=codex@openai.com','commit','-m',plan['message'])
   r['commit']=git(stage,'rev-parse','HEAD')
   for name in r['files']:
    blob=subprocess.run(['git','-C',str(stage),'show',r['commit']+':'+name],capture_output=True,check=True).stdout
    r['files'][name]=sha(blob) # Verify actual Git artifact bytes, not checkout EOL.
   r['status']='prepared';self.save(r);return r
  except Exception as e:
   r['status']='prepare_failed';r['error']=str(e);self.save(r)
   # Failed preparation never pushes; preserve evidence and release own lease.
   if self.lock.exists() and self.lock.read_text()==op:self.lock.unlink()
   raise
 def push(self,op):
  self.owned(op);r=self.read(op)
  if r['status']!='prepared':raise RuntimeError('not prepared; inspect outcome, never blind retry')
  head=self.latest()
  if head!=r['base']:
   r.update(status='needs_rebase',remote=head);self.save(r);raise RuntimeError('remote changed: stop, read main and rebuild plan; no automatic merge or push')
  # An operation can claim submission only once, including competing processes
  # that have both read "prepared". Unknown outcomes are never resubmitted.
  fd=os.open(self.state/(op+'-push.once'),os.O_CREAT|os.O_EXCL|os.O_WRONLY);os.close(fd)
  r['status']='push_pending';self.save(r)
  try:
   # Explicit ordinary refspec. No force, force-with-lease, or reset path.
   git(r['stage'],'push',self.remote,r['commit']+':refs/heads/main')
   r['status']='pushed';self.save(r);return r
  except Exception as e:
   r.update(status='push_uncertain_or_rejected',error=str(e));self.save(r)
   try:r['remoteAfterFailure']=self.latest();self.save(r)
   except Exception:pass
   raise # Keep lease; determine remote result before any further action.
 def abort(self,op):
  self.owned(op);r=self.read(op)
  if r['status'] not in ('prepared','needs_rebase'):raise RuntimeError('cannot abort pending/pushed/unknown operation')
  r['status']='aborted';self.save(r);self.lock.unlink();return r
 def verify(self,op,get=None):
  self.owned(op);r=self.read(op)
  if r['status'] not in ('pushed','push_pending','push_uncertain_or_rejected'):raise RuntimeError('not a submitted operation')
  get=get or (lambda u:urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'QAF-publication-readback'}),timeout=30).read())
  remote=json.loads(get(API+'/commits/main'))['sha']
  if remote!=r['commit']:raise RuntimeError('remote does not equal exact commit; stop and resolve, no retry')
  r['status']='pushed';self.save(r)
  runs=json.loads(get(API+'/actions/runs?head_sha='+r['commit']))['workflow_runs'];runs=[x for x in runs if x['head_sha']==r['commit'] and x['path']=='dynamic/pages/pages-build-deployment']
  if not runs:raise RuntimeError('exact Pages run not yet found; verify again later, do not repush')
  run=max(runs,key=lambda x:x['id']);r['run']=run['id'];self.save(r)
  if run['status']!='completed':raise RuntimeError('deployment pending; verify again later')
  if run['conclusion']!='success':raise RuntimeError('deployment failed; do not repush')
  for name,expected in r['files'].items():
   if sha(get(self.formal+name+'?qafverify='+op))!=expected:raise RuntimeError('formal readback mismatch: '+name)
  # Current HEAD checked again after reads; never bless a superseded artifact.
  if json.loads(get(API+'/commits/main'))['sha']!=r['commit']:raise RuntimeError('superseded during verification')
  r.update(status='formal_bytes_verified',verifiedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat());self.save(r)
  # Caller must finish browser acceptance before releasing the writer lease.
  return r
 def accept(self,op,browser_evidence):
  self.owned(op);r=self.read(op);e=json.loads(Path(browser_evidence).read_text(encoding='utf8'))
  if r['status']!='formal_bytes_verified' or e.get('operation')!=op or e.get('commit')!=r['commit'] or e.get('passed') is not True:raise ValueError('matching successful browser evidence required')
  r.update(status='verified',browserEvidence=e);self.save(r);self.lock.unlink();return r
def main(kind=None):
 a=argparse.ArgumentParser();a.add_argument('action',choices=['prepare','push','verify','accept','abort','status']);a.add_argument('input');a.add_argument('--repo',required=True);a.add_argument('--browser-evidence');args=a.parse_args();p=Publisher(args.repo)
 if args.action=='prepare':
  plan=json.loads(Path(args.input).read_text(encoding='utf8'))
  if kind and plan['kind']!=kind:raise ValueError('wrong writer entry')
  r=p.prepare(plan)
 elif args.action=='accept':r=p.accept(args.input,args.browser_evidence)
 elif args.action=='status':r=p.read(args.input)
 else:r=getattr(p,args.action)(args.input)
 print(json.dumps(r,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
