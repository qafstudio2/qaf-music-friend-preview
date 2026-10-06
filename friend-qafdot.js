/* Isolated reader for the public QAF dot column. */
(() => {
  'use strict';
  const prefix = '#column/column-qafdot';
  let previousHash = location.hash;
  window.addEventListener('hashchange', () => {
    if (previousHash.startsWith(prefix)) {
      const dialog = document.getElementById('column-image-lightbox');
      if (dialog?.open) dialog.close();
    }
    previousHash = location.hash;
  });
  function buildContents(article) {
    if (article.querySelector('.qafdot-toc')) return;
    const headings = [...article.querySelectorAll('.qafdot-body h4')];
    if (!headings.length) return;
    const toc = document.createElement('details');
    toc.className = 'column-article-toc qafdot-toc';
    const summary = document.createElement('summary');
    summary.textContent = '本文目錄';
    const hint = document.createElement('span');
    hint.textContent = '13 個段落，依需要閱讀';
    summary.append(hint);
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'QAF dot 協作指南目錄');
    headings.forEach((heading, index) => {
      heading.id = 'qafdot-guide-section-' + (index + 1);
      const link = document.createElement('a');
      link.href = '#' + heading.id;
      link.textContent = heading.textContent;
      link.addEventListener('click', event => {
        event.preventDefault();
        heading.scrollIntoView({behavior:'smooth', block:'start'});
        heading.setAttribute('tabindex', '-1');
        heading.focus({preventScroll:true});
      });
      nav.append(link);
    });
    toc.append(summary, nav);
    article.querySelector('.qafdot-article-intro')?.after(toc);
  }
  window.friendQafdotRoute = function () {
    const overview = document.getElementById('friend-qafdot-overview');
    const reader = document.getElementById('friend-qafdot-reader');
    if (!overview || !reader) return;
    const article = reader.querySelector('article.post-entry');
    const wanted = prefix + '/' + article.dataset.postId;
    const selected = location.hash === wanted;
    overview.hidden = selected;
    reader.hidden = !selected;
    article.hidden = !selected;
    document.title = selected
      ? article.querySelector('h3').textContent + '｜QAF dot 專欄'
      : 'QAF dot 專欄｜QAF 音樂學習';
    if (selected) buildContents(article);
    window.scrollTo(0, 0);
  };
})();
