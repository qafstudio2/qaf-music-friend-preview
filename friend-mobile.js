(() => {
  const nav = document.querySelector('.primary-nav');
  const toggle = document.getElementById('friend-nav-toggle');
  const mobile = matchMedia('(max-width:1200px), (hover:none) and (pointer:coarse)');
  let lastY = window.scrollY;
  function setOpen(open) {
    const active = mobile.matches && open;
    document.body.classList.toggle('friend-nav-open', active);
    toggle.setAttribute('aria-expanded', String(active));
    toggle.setAttribute('aria-label', active ? '隱藏主標籤列' : '顯示主標籤列');
  }
  toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('friend-nav-open')));
  nav.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  window.addEventListener('hashchange', () => setOpen(false));
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (mobile.matches && y > lastY + 5) setOpen(false);
    lastY = y;
  }, {passive:true});
  mobile.addEventListener('change', () => setOpen(false));
  setOpen(false);
})();
