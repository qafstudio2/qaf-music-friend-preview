/* Public column entrance carousels; no external article fetching. */
(() => {
  'use strict';
  const names = {'column-qaf':'務築青年','column-lab':'地下樂器職人研究室','column-qafdot':'QAF dot'};
  const route = p => (p.column_id === 'column-qafdot' ? '?reader=20261011-columns4' : '') + '#column/' + p.column_id + '/' + p.id;
  function latest(items) {
    return items.filter(p => p.kind === 'post' && names[p.column_id] && /^\d{4}-\d{2}-\d{2}$/.test(p.date))
      .slice().sort((a,b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  }
  function controller({count, render, notify, reduced, hidden, running=()=>{}, interval=6000, setTimer=setTimeout, clearTimer=clearTimeout}) {
    let index=0, paused=false, hover=false, focus=false, timer=null, disposed=false;
    const stop=()=>{if(timer!==null)clearTimer(timer);timer=null;};
    const schedule=()=>{stop();const active=!disposed && count>1 && !paused && !hover && !focus && !reduced() && !hidden();running(active);if(active)timer=setTimer(()=>{timer=null;move(1,false);},interval);};
    function move(step,manual=true){index=(index+step+count)%count;render(index);if(manual)notify(index);schedule();}
    return {start(){render(index);schedule();},move,toggle(){paused=!paused;schedule();return paused;},
      state(type,value){if(type==='hover')hover=value;if(type==='focus')focus=value;schedule();},refresh:schedule,
      dispose(){disposed=true;stop();running(false);},get index(){return index;}};
  }
  window.friendColumnsCarouselCore={latest,route,controller};
  const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
  let feed=window.friendPublicColumnFeed, mounted=null, dispose=()=>{};
  function carousel(label,pages,kind) {
    const region=node('section','columns-carousel columns-carousel-'+kind);
    region.setAttribute('aria-label',label);region.setAttribute('aria-roledescription','輪播');
    const header=node('header','columns-carousel-heading');if(kind!=='ticker')header.append(node('h3',null,label));
    const controls=node('div','columns-carousel-controls'), prev=node('button',null,'←'), pause=node('button',null,'暫停'), next=node('button',null,'→');
    prev.setAttribute('aria-label',label+'：上一組');next.setAttribute('aria-label',label+'：下一組');
    pause.setAttribute('aria-label',label+'：暫停自動輪播');pause.setAttribute('aria-pressed','false');
    if(kind==='ticker')pause.textContent='Ⅱ';
    for(const b of [prev,pause,next]){b.type='button';controls.append(b);}
    const count=node('span','columns-carousel-count');controls.append(count);header.append(controls);
    const viewport=node('div','columns-carousel-viewport'),track=node('div','columns-carousel-track');viewport.append(track);
    pages.forEach((page,i)=>{page.classList.add('columns-carousel-page');page.setAttribute('role','group');page.setAttribute('aria-roledescription','投影片');page.setAttribute('aria-label',`${i+1} / ${pages.length}`);track.append(page);});
    const status=node('span','columns-carousel-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    if(kind==='photos'){region.tabIndex=0;region.setAttribute('aria-label','文章照片輪播；左右方向鍵切換，空白鍵暫停');region.append(viewport,status);}else region.append(header,viewport,status);
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const c=controller({count:pages.length,reduced:()=>motion.matches,hidden:()=>document.hidden || !region.isConnected,interval:kind==='ticker'?12000:6000,running:active=>{region.dataset.running=String(active);},
      render(i){track.style.transform=`translateX(-${i*100}%)`;pages.forEach((p,j)=>{p.inert=i!==j;p.setAttribute('aria-hidden',String(i!==j));});count.textContent=`${i+1} / ${pages.length}`;},
      notify(i){status.textContent=`${label}，第 ${i+1} 組，共 ${pages.length} 組`;} });
    const motionState=()=>{pause.disabled=motion.matches || pages.length<2;pause.textContent=kind==='ticker'?(pause.getAttribute('aria-pressed')==='true'?'▶':'Ⅱ'):motion.matches?'靜態顯示':pause.getAttribute('aria-pressed')==='true'?'播放':'暫停';c.refresh();};
    prev.disabled=next.disabled=pages.length<2;
    prev.onclick=()=>c.move(-1);next.onclick=()=>c.move(1);
    pause.onclick=()=>{const paused=c.toggle();pause.setAttribute('aria-pressed',String(paused));pause.textContent=kind==='ticker'?(paused?'▶':'Ⅱ'):paused?'播放':'暫停';pause.setAttribute('aria-label',label+(paused?'：播放自動輪播':'：暫停自動輪播'));};
    region.onmouseenter=()=>c.state('hover',true);region.onmouseleave=()=>c.state('hover',false);
    region.onfocusin=()=>c.state('focus',true);region.onfocusout=e=>{if(!region.contains(e.relatedTarget))c.state('focus',false);};
    region.onkeydown=e=>{if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();c.move(e.key==='ArrowLeft'?-1:1);}else if(kind==='photos'&&e.key===' '&&e.target===region){e.preventDefault();const paused=c.toggle();region.setAttribute('aria-label','文章照片輪播；'+(paused?'已暫停':'自動播放')+'；左右方向鍵切換，空白鍵暫停');}};
    document.addEventListener('visibilitychange',c.refresh);motion.addEventListener('change',motionState);
    motionState();c.start();
    return {region,start:c.refresh,dispose(){c.dispose();document.removeEventListener('visibilitychange',c.refresh);motion.removeEventListener('change',motionState);}};
  }
  function mount(){
    const directory=document.querySelector('.columns-directory');
    if(directory===mounted)return;dispose();mounted=directory;
    if(!directory||!feed)return;
    const posts=latest(feed.items);if(!posts.length)return;
    const titles=posts.map(p=>{const page=node('div','columns-ticker-item');const copy=node('div','columns-ticker-copy');const a=node('a',null,p.title);a.href=route(p);copy.append(a);page.append(copy);return page;});
    const hero=directory.previousElementSibling?.matches('.hub-hero')?directory.previousElementSibling:null;
    const ticker=carousel('最新文章',titles,'ticker');(hero||directory).before(ticker.region);ticker.start();
    hero?.classList.add('columns-compact-hero');
    dispose=()=>{ticker.dispose();ticker.region.remove();hero?.classList.remove('columns-compact-hero');};
  }
  window.addEventListener('friend-public-column-feed',e=>{feed=e.detail;mounted=null;mount();});
  new MutationObserver(mount).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
  mount();
})();
