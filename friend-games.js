(() => {
  'use strict';
  const gameOrigin = 'https://qafstudio2.github.io';
  let dispose = null;
  window.friendGamesDispose = () => {
    dispose?.();
    dispose = null;
  };
  window.friendGamesMount = () => {
    window.friendGamesDispose();
    const section = document.getElementById('friend-games');
    const frame = document.getElementById('friend-games-frame');
    if (!section || !frame) return;
    const status = document.getElementById('friend-games-status');
    const back = document.getElementById('friend-games-back');
    const top = document.getElementById('friend-games-top');
    const source = frame.dataset.src;
    let timer;
    let ready = false;
    const loaded = () => {
      ready = true;
      clearTimeout(timer);
      status.hidden = true;
    };
    const startTimer = () => {
      clearTimeout(timer);
      ready = false;
      status.hidden = false;
      status.textContent = '遊戲載入中…';
      timer = setTimeout(() => {
        if (!ready) status.textContent = '遊戲載入較久，請按「遊戲列表」重新載入。';
      }, 15000);
    };
    const scrollTop = () => window.scrollTo({top:0,behavior:'smooth'});
    const reset = () => {
      startTimer();
      frame.src = source;
      section.scrollIntoView({block:'start',behavior:'smooth'});
    };
    const message = event => {
      if (event.origin !== gameOrigin || event.source !== frame.contentWindow) return;
      const data = event.data;
      if (!data || data.namespace !== 'qaf-game') return;
      if (data.type === 'resize' && typeof data.height === 'number' && Number.isFinite(data.height)) {
        frame.style.height = `${Math.min(5000, Math.max(240, Math.ceil(data.height)))}px`;
        loaded();
      } else if (data.type === 'scroll-top') {
        section.scrollIntoView({block:'start',behavior:'smooth'});
      }
    };
    window.addEventListener('message', message);
    frame.addEventListener('load', loaded);
    back.addEventListener('click', reset);
    top.addEventListener('click', scrollTop);
    dispose = () => {
      clearTimeout(timer);
      window.removeEventListener('message', message);
      frame.removeEventListener('load', loaded);
      back.removeEventListener('click', reset);
      top.removeEventListener('click', scrollTop);
      // Destroy the browsing context, including nested game audio and timers.
      frame.remove();
    };
    startTimer();
    frame.src = source;
  };
})();
