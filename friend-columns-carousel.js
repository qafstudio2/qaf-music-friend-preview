/* Continuous public article ticker; public-feed inclusion timestamps are traced to Git history. */
(() => {
  'use strict';
  const columns = new Set(['column-qaf','column-lab','column-qafdot']);
  const route = p => (p.column_id === 'column-qafdot' ? '?reader=20261011-columns4' : '') + '#column/' + p.column_id + '/' + p.id;
  const latest = items => items.filter(p => p.kind === 'post' && columns.has(p.column_id) && /^\d{4}-\d{2}-\d{2}$/.test(p.date)).slice().sort((a,b) => (Date.parse(b.public_feed_added_at)||0)-(Date.parse(a.public_feed_added_at)||0) || b.date.localeCompare(a.date) || a.id.localeCompare(b.id)).slice(0,5);
  window.friendColumnsCarouselCore = {latest,route};
  let feed=window.friendPublicColumnFeed, mounted=null, dispose=()=>{};
  function mount() {
    const directory=document.querySelector('.columns-directory');
    if(directory===mounted)return;
    dispose();mounted=directory;
    if(!directory||!feed)return;
    const posts=latest(feed.items);if(!posts.length)return;
    const hero=directory.previousElementSibling?.matches('.hub-hero')?directory.previousElementSibling:null;
    const region=document.createElement('section');region.className='columns-carousel columns-carousel-ticker';region.setAttribute('aria-label','最新文章');region.dataset.dateBasis='first-public-feed-commit';
    const viewport=document.createElement('div');viewport.className='columns-carousel-viewport';
    const track=document.createElement('div');track.className='columns-carousel-track';
    const group=document.createElement('div');group.className='columns-ticker-group';
    posts.forEach(p=>{const a=document.createElement('a');a.textContent=p.title;a.href=route(p);group.append(a);});
    track.append(group);viewport.append(track);region.append(viewport);(hero||directory).before(region);
    hero?.classList.add('columns-compact-hero');
    const main=directory.closest('main');main?.classList.add('columns-ticker-main');
    const motion=matchMedia('(prefers-reduced-motion: reduce)');let animation=null,hover=false,focus=false;
    function refresh(){region.dataset.readable=String(motion.matches||focus);if(motion.matches||focus){animation?.cancel();animation=null;return;}if(!animation){const distance=group.getBoundingClientRect().width;if(!distance)return;animation=track.animate([{transform:'translateX(0)'},{transform:'translateX(-'+distance+'px)'}],{duration:distance/36*1000,iterations:Infinity,easing:'linear'});}if(hover||document.hidden)animation.pause();else animation.play();}
    function resize(){animation?.cancel();animation=null;track.querySelectorAll('[data-ticker-copy]').forEach(n=>n.remove());const width=group.getBoundingClientRect().width;if(width){const copies=Math.max(1,Math.ceil(viewport.clientWidth/width));for(let i=0;i<copies;i++){const copy=group.cloneNode(true);copy.dataset.tickerCopy='';copy.setAttribute('aria-hidden','true');copy.querySelectorAll('a').forEach(a=>a.tabIndex=-1);track.append(copy);}}refresh();}
    region.onmouseenter=()=>{hover=true;refresh();};region.onmouseleave=()=>{hover=false;refresh();};
    region.addEventListener('focusin',()=>{focus=true;refresh();});region.addEventListener('focusout',e=>{if(!region.contains(e.relatedTarget)){focus=false;viewport.scrollLeft=0;refresh();}});
    document.addEventListener('visibilitychange',refresh);motion.addEventListener('change',refresh);
    const observer=new ResizeObserver(resize);observer.observe(viewport);resize();
    dispose=()=>{animation?.cancel();observer.disconnect();document.removeEventListener('visibilitychange',refresh);motion.removeEventListener('change',refresh);region.remove();hero?.classList.remove('columns-compact-hero');main?.classList.remove('columns-ticker-main');};
  }
  window.addEventListener('friend-public-column-feed',e=>{feed=e.detail;mounted=null;mount();});
  new MutationObserver(mount).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});mount();
})();
