"""Lossless stable-ID migration; explicit hash-guarded reversal, no IO."""
import json,re,hashlib
def sha(b):return hashlib.sha256(b).hexdigest()
def packed(x):return json.dumps(x,sort_keys=True,indent=2).encode()
def parts(page):return list(re.finditer(rb'<article\b.*?</article>',page,re.S))
def ids(page):return re.findall(rb'<article\b[^>]*\sdata-viewpoint-id="([^"]+)"',page)
def strip_id(a,id):
 token=b'<article data-viewpoint-id="'+id.encode()+b'"'
 if not a.startswith(token):raise ValueError('migration attribute position changed')
 return b'<article'+a[len(token):]
def apply(page,manifest,spec,operation):
 if sha(page)!=spec['pageSha256'] or sha(manifest)!=spec['manifestSha256']:raise ValueError('stale page or mapping')
 existing=ids(page)
 if len(existing)!=len(set(existing)):raise ValueError('existing ID collision')
 action=spec['action']
 if action=='migrate':
  if manifest:raise ValueError('mapping already exists; inspect prior migration')
  missing=[m for m in parts(page) if not ids(m[0])]
  if len(missing)!=spec['expectedCount'] or not missing:raise ValueError('unexpected legacy count')
  entries=[];replacements={};used=set(existing)
  for m in missing:
   before=m[0];id='legacy-'+sha(before)[:24];key=id.encode()
   if key in used:raise ValueError('generated ID collision')
   used.add(key);after=before.replace(b'<article',b'<article data-viewpoint-id="'+key+b'"',1)
   assert strip_id(after,id)==before
   entries.append({'id':id,'beforeSha256':sha(before),'afterSha256':sha(after)})
   replacements[m.start()]=after
  out=page
  for m in reversed(parts(page)):
   if m.start() in replacements:out=out[:m.start()]+replacements[m.start()]+out[m.end():]
  record={'schema':1,'operation':operation,'active':True,'pageBeforeSha256':sha(page),'pageAfterSha256':sha(out),'entries':entries}
  return out,packed(record)
 if action=='revert':
  record=json.loads(manifest)
  if record.get('schema')!=1 or record.get('active') is not True:raise ValueError('no active migration')
  if sha(page)!=record['pageAfterSha256']:raise ValueError('later page changes; replan, never overwrite')
  mappings={e['id']:e for e in record['entries']}
  if len(mappings)!=len(record['entries']):raise ValueError('corrupt mapping')
  out=page;seen=set()
  for m in reversed(parts(page)):
   found=ids(m[0])
   if found and found[0].decode() in mappings:
    id=found[0].decode();e=mappings[id]
    if sha(m[0])!=e['afterSha256']:raise ValueError('article changed')
    before=strip_id(m[0],id)
    if sha(before)!=e['beforeSha256']:raise ValueError('original hash mismatch')
    out=out[:m.start()]+before+out[m.end():];seen.add(id)
  if seen!=set(mappings) or sha(out)!=record['pageBeforeSha256']:raise ValueError('incomplete reversal')
  record['active']=False;record['revertOperation']=operation
  return out,packed(record)
 raise ValueError('only migrate/revert supported')
