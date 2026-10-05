/* Article badges and contents, plus the compact effects-column reader. */
(() => {
  function decorateArticle(article, secondBadge) {
    if (!article || article.querySelector('.column-article-badges')) return;
    const category = article.dataset.category || '文章';
    const badges = document.createElement('div');
    badges.className = 'column-article-badges';
    for (const label of [category, secondBadge]) {
      const badge = document.createElement('span');
      badge.textContent = label;
      badges.append(badge);
    }
    article.prepend(badges);
    article.querySelector(':scope > .post-category')?.remove();
    article.querySelector(':scope > .muted')?.remove();
    const headings = [...article.querySelectorAll('h4,h5')];
    if (!headings.length) return;
    const toc = document.createElement('nav');
    toc.className = 'column-article-toc';
    toc.setAttribute('aria-label', '本文目錄');
    const title = document.createElement('strong');
    title.textContent = '本文目錄';
    toc.append(title);
    headings.forEach((heading, index) => {
      heading.id = 'column-section-' + (index + 1);
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({behavior:'smooth', block:'start'});
      });
      toc.append(link);
    });
    article.querySelector('time')?.after(toc);
  }
  const oldQafRoute = window.friendColumnRoute;
  window.friendColumnRoute = function() {
    oldQafRoute?.();
    const article = document.querySelector('#friend-column-reader article.post-entry:not([hidden])');
    decorateArticle(article, '務築青年 THE BUILDERS');
  };
  window.friendLabRoute = function() {
    const overview = document.getElementById('friend-column-overview');
    const reader = document.getElementById('friend-column-reader');
    if (!overview || !reader) return;
    const selected = location.hash === '#column/column-lab/post-qprof-dod-drag-20260928';
    overview.hidden = selected;
    reader.hidden = !selected;
    if (selected) {
      decorateArticle(reader.querySelector('article.post-entry'), 'Q教授');
      document.title = 'DOD 跩哥 DRAG DELAY｜效果器專欄';
    }
    window.scrollTo(0,0);
  };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-lab-category]');
    if (!button) return;
    document.querySelectorAll('[data-lab-category]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  });
  const main = document.getElementById('main');
  const routeReady = () => {
    if (location.hash.startsWith('#column/column-lab/') && main.querySelector('#friend-column-reader')) window.friendLabRoute();
  };
  new MutationObserver(routeReady).observe(main, {childList:true});
  routeReady();
})();
