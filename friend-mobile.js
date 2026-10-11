(() => {
  const nav=document.querySelector('.primary-nav'),toggle=document.getElementById('friend-nav-toggle');
  const storageKey='friend-layout-mode';const valid=value=>['auto','desktop','mobile'].includes(value);
  let choice='auto',mobile=false,lastY=window.scrollY;
  try{const saved=localStorage.getItem(storageKey);if(valid(saved))choice=saved;}catch{}
  const label=document.createElement('label');label.className='friend-layout-switch';label.append(document.createTextNode('版面'));
  const select=document.createElement('select');select.setAttribute('aria-label','網站版面');
  for(const [value,text] of [['auto','自動'],['desktop','電腦版'],['mobile','手機版']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}label.append(select);
  const footer=document.querySelector('.site-footer');if(footer)footer.insertBefore(label,footer.lastElementChild);
  function setOpen(open){const active=mobile&&open;document.body.classList.toggle('friend-nav-open',active);toggle.setAttribute('aria-expanded',String(active));toggle.setAttribute('aria-label',active?'隱藏主導覽列':'顯示主導覽列');}
  function apply(){const phone=navigator.userAgentData?.mobile===true&&matchMedia('(pointer:coarse)').matches;mobile=choice==='mobile'||choice==='auto'&&(innerWidth<=700||phone);document.body.classList.toggle('friend-layout-mobile',mobile);document.body.classList.toggle('friend-layout-desktop',!mobile);document.body.dataset.layoutChoice=choice;select.value=choice;setOpen(false);}
  select.addEventListener('change',()=>{choice=select.value;try{localStorage.setItem(storageKey,choice);}catch{}apply();});
  toggle.addEventListener('click',()=>setOpen(!document.body.classList.contains('friend-nav-open')));
  nav.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
  window.addEventListener('hashchange',()=>setOpen(false));
  window.addEventListener('resize',apply);
  window.addEventListener('storage',event=>{if(event.key===storageKey){choice=valid(event.newValue)?event.newValue:'auto';apply();}});
  window.addEventListener('scroll',()=>{const y=scrollY;if(mobile&&y>lastY+5)setOpen(false);lastY=y;},{passive:true});apply();
})();
