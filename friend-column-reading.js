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
    const toc = document.createElement('details');
    toc.className = 'column-article-toc';
    const summary = document.createElement('summary');
    summary.innerHTML = '本文目錄 <span>展開段落</span>';
    toc.append(summary);
    const links = document.createElement('nav');
    links.setAttribute('aria-label', '本文目錄');
    headings.forEach((heading, index) => {
      heading.id = 'column-section-' + (index + 1);
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({behavior:'smooth', block:'start'});
      });
      links.append(link);
    });
    toc.append(links);
    article.querySelector('time')?.after(toc);
  }
  const recommendations = [
    {id:'post-ai-workstation-20261001',column:'column-qaf',category:'AI協作',title:'AI協作實踐(一):QAF音樂學習實驗工作站',date:'2026-10-01',image:'assets/friend-ai-v3-home.webp'},
    {id:'post-sn2-qaf1-specs-20260929',column:'column-qaf',category:'QAF x SOGOLO',title:'QAF.1吉他設計與實踐（二）材料篇 ｜清楚的稜角，柔和的呼吸',date:'2026-09-29',image:'assets/friend-qaf_sogolo_materials_2_00_featured_black_logo_v3.webp'},
    {id:'post-sn2-qaf1-20260929',column:'column-qaf',category:'QAF x SOGOLO',title:'QAF.1吉他設計與實踐（一）電路篇 ｜雙線圈，2/4段，都能一鍵切換',date:'2026-09-29',image:'assets/friend-qaf1-revised-149hIeGO-1.webp'},
    {id:'post-qprof-dod-drag-20260928',column:'column-lab',category:'效果器研究',title:'DOD 跩哥 DRAG DELAY',date:'2026-09-28',image:'assets/dod-drag-gallery-01.webp'}
  ];
  function showRecommendations(article) {
    if (!article) return;
    const reader = article.closest('#friend-column-reader');
    reader.querySelector('.column-reader-recommendations')?.remove();
    const section = document.createElement('section');
    section.className = 'column-reader-recommendations';
    section.setAttribute('aria-label', '推薦專欄文章');
    const heading = document.createElement('h3');
    heading.textContent = '推薦專欄文章';
    const grid = document.createElement('div');
    grid.className = 'friend-column-grid';
    recommendations.filter(item => item.id !== article.dataset.postId).slice(0,3).forEach(item => {
      const card = document.createElement('a');
      card.className = 'friend-column-card';
      card.href = '#column/' + item.column + '/' + item.id;
      const cover = document.createElement('span');
      cover.className = 'friend-column-cover';
      const image = document.createElement('img');
      image.src = item.image;
      image.alt = item.title + '首圖';
      image.loading = 'lazy';
      cover.append(image);
      const category = document.createElement('span');
      category.className = 'post-category';
      category.textContent = item.category;
      const title = document.createElement('strong');
      title.textContent = item.title;
      const date = document.createElement('time');
      date.dateTime = item.date;
      date.textContent = item.date;
      const read = document.createElement('span');
      read.className = 'friend-column-read';
      read.textContent = '閱讀文章 →';
      card.append(cover, category, title, date, read);
      grid.append(card);
    });
    section.append(heading, grid);
    article.after(section);
  }
  const oldQafRoute = window.friendColumnRoute;
  window.friendColumnRoute = function() {
    oldQafRoute?.();
    const article = document.querySelector('#friend-column-reader article.post-entry:not([hidden])');
    decorateArticle(article, '務築青年 THE BUILDERS');
    showRecommendations(article);
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
      showRecommendations(reader.querySelector('article.post-entry'));
      document.title = 'DOD 跩哥 DRAG DELAY｜效果器專欄';
    }
    window.scrollTo(0,0);
  };
  let suppressImageClickUntil = 0;
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest?.('.column-image-close')) return;
    suppressImageClickUntil = Date.now() + 400;
    document.getElementById('column-image-lightbox')?.close();
  }, true);
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
  document.addEventListener('click', event => {
    if (Date.now() < suppressImageClickUntil) return;
    const image = event.target.closest('#main article.post-entry figure img');
    if (!image || image.closest('.post-video-reference')) return;
    const link = image.closest('a');
    if (link?.hasAttribute('href') && !/^data:image\//.test(link.href) && !/\.(png|jpe?g|webp|gif)(?:[?#]|$)/i.test(link.href)) return;
    event.preventDefault();
    let dialog = document.getElementById('column-image-lightbox');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'column-image-lightbox';
      dialog.className = 'column-image-lightbox';
      dialog.innerHTML = '<form method="dialog"><button type="submit" aria-label="關閉圖片" class="column-image-close">×</button></form><img alt=""><p></p>';
      dialog.querySelector('button').addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); suppressImageClickUntil = Date.now() + 400; dialog.close(); }, true);
      dialog.addEventListener('click', e => { if (e.target === dialog) { suppressImageClickUntil = Date.now() + 400; dialog.close(); } });
      document.body.append(dialog);
    }
    dialog.querySelector('img').src = link?.href || image.currentSrc || image.src;
    dialog.querySelector('img').alt = image.alt || '文章圖片';
    dialog.querySelector('p').textContent = image.closest('figure')?.querySelector('figcaption')?.textContent || '';
    dialog.showModal();
  }, true);
})();
