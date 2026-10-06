/* Overlay Google-confirmed local articles; preserve unrelated friend-only articles. */
(() => {
 let feed, scheduled=false;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n};
 const route=p=>'#column/'+p.column_id+'/'+p.id;
 const image=p=>p.blocks?.find(b=>b.type==='image')?.value;
 function card(p){
  const a=el('a',null,'friend-column-card');a.href=route(p);a.dataset.category=p.category||'';
  const cover=el('span',null,'friend-column-cover'),src=image(p);
  if(src){const i=el('img');i.src=src;i.alt=p.title;i.loading='lazy';cover.append(i)}
  const time=el('time',p.date);time.dateTime=p.date;
  a.append(cover,el('span',p.category,'post-category'),el('strong',p.title),time,el('span','閱讀文章 →','friend-column-read'));return a;
 }
 function article(p){
  const a=el('article',null,'post-entry');a.dataset.postId=p.id;a.dataset.category=p.category||'';a.dataset.localSnapshot=feed.exported_at;
  const badges=el('div',null,'column-article-badges');[...new Set([p.category||(p.column_id==='column-lab'?'效果器研究':'文章'),p.column_id==='column-qaf'?'務築青年 THE BUILDERS':p.column_id==='column-lab'?'Q教授':'QAF',...(p.tags||[])])].forEach(t=>badges.append(el('span',t)));a.append(badges,el('h3',p.title));
  const time=el('time',p.date);time.dateTime=p.date;a.append(time);
  const toc=el('details',null,'column-article-toc');toc.append(el('summary','本文目錄 · 展開段落'));const links=el('nav');toc.append(links);let count=0;
  for(const b of p.blocks||[]){
   if(b.type==='image'){
    const f=el('figure');f.dataset.placement=b.placement||'center';const i=el('img');i.src=b.value;i.alt=b.caption||p.title;i.loading='lazy';f.append(i);if(b.caption)f.append(el('figcaption',b.caption));const gallery=el('div',null,'post-image-gallery');gallery.append(f);a.append(gallery);
   }else if(b.type==='text'){
    const box=el('div',null,'hub-copy');
    for(const line of b.value.split(/\n/)){
     if(!line.trim())continue;const match=line.match(/^#{1,4}\s+(.+)/);
     if(match){const h=el('h4',match[1]);h.id='local-section-'+p.id+'-'+(++count);box.append(h);const link=el('a',match[1]);link.href='#'+h.id;link.onclick=e=>{e.preventDefault();h.scrollIntoView({behavior:'smooth'})};links.append(link)}
     else{const para=el('p');let cursor=0;const regex=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;for(const m of line.matchAll(regex)){para.append(document.createTextNode(line.slice(cursor,m.index)));if(m[3])para.append(el('strong',m[3]));else{const link=el('a',m[1]);link.href=m[2];link.target='_blank';link.rel='noopener noreferrer';para.append(link)}cursor=m.index+m[0].length}para.append(document.createTextNode(line.slice(cursor)));box.append(para)}
    }a.append(box);
   }else if(b.type==='video'&&/^https?:\/\//.test(b.value)){const link=el('a',b.caption||'觀看影片');link.href=b.value;link.target='_blank';link.rel='noopener noreferrer';a.append(link)}
  }
  if(count)time.after(toc);return a;
 }
 function apply(){
  if(!feed)return;const parts=location.hash.split('/'),column=parts[1],id=parts[2];if(parts[0]!=='#column')return;
  const posts=feed.items.filter(p=>p.kind==='post'&&p.column_id===column),overview=document.querySelector('#friend-column-overview'),reader=document.querySelector('#friend-column-reader');if(!overview||!reader)return;
  const grid=overview.querySelector('.friend-column-grid');if(grid)posts.forEach(p=>{const old=[...grid.querySelectorAll('a.friend-column-card')].find(a=>a.getAttribute('href')===route(p));if(old?.dataset.localSnapshot===feed.exported_at)return;const n=card(p);n.dataset.localSnapshot=feed.exported_at;if(old)old.replaceWith(n);else grid.append(n)});
  const selected=posts.find(p=>p.id===id);if(!selected)return;
  overview.hidden=true;reader.hidden=false;
  const current=reader.querySelector('article[data-local-snapshot]');if(current?.dataset.postId===id&&current.dataset.localSnapshot===feed.exported_at&&!current.hidden)return;
  reader.querySelectorAll('article.post-entry').forEach(a=>a.hidden=true);reader.querySelectorAll('[data-local-snapshot]').forEach(a=>a.remove());
  const body=article(selected);reader.insertBefore(body,reader.querySelector('article.post-entry')||reader.firstChild);reader.querySelectorAll('.column-reader-recommendations').forEach(n=>n.remove());
  const related=el('section',null,'column-reader-recommendations');related.append(el('h3','推薦專欄文章'));const cards=el('div',null,'friend-column-grid');feed.items.filter(p=>p.kind==='post'&&p.id!==id).slice(0,3).forEach(p=>cards.append(card(p)));related.append(cards);body.after(related);document.title=selected.title+'｜QAF專欄';
 }
 function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;apply()})}
 fetch('friend-local-articles.json?v=20261007',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('尚无本機複製版本');return r.json()}).then(data=>{if(data.schema_version!==1||!Array.isArray(data.items))throw Error('格式不符');feed=data;schedule()}).catch(()=>{});
 window.addEventListener('hashchange',schedule);
 new MutationObserver(schedule).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
})();
