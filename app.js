const books = [
  {type:'magazine',title:'Guitar Journal · 示範號',author:'雜誌示範',cover:'GUITAR JOURNAL',tone:'a'},
  {type:'magazine',title:'Bass Workshop · 示範號',author:'雜誌示範',cover:'BASS WORKSHOP',tone:'b'},
  {type:'magazine',title:'Electric Guitar Monthly · 示範號',author:'雜誌示範',cover:'ELECTRIC GUITAR',tone:'c'},
  {type:'magazine',title:'Guitar Maintenance · 示範號',author:'雜誌示範',cover:'GUITAR CARE',tone:'d'},
  {type:'magazine',title:'Sound & Gear · 示範號',author:'雜誌示範',cover:'SOUND & GEAR',tone:'e'},
  {type:'book',title:'指板練習教材',author:'教材示範',cover:'FRETBOARD',tone:'c'},
  {type:'book',title:'吉他維護入門',author:'教材示範',cover:'GUITAR SETUP',tone:'a'},
  {type:'score',title:'練團單譜示範',author:'樂譜示範',cover:'SCORE',tone:'d'},
  {type:'video',title:'影音教材示範',author:'影片示範',cover:'VIDEO LESSON',tone:'b'},
];
let filter='magazine';
const escapeText=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderBooks(){
  const q=document.querySelector('#book-search').value.trim().toLowerCase();
  const rows=books.filter(x=>x.type===filter&&(!q||(x.title+' '+x.author).toLowerCase().includes(q)));
  document.querySelector('#book-count').textContent=({'magazine':'樂器雜誌','book':'吉他教材','score':'樂譜','video':'影音教材'}[filter])+' · '+rows.length+' 本（示範）';
  document.querySelector('#book-grid').innerHTML=rows.map(x=>'<article class="book-card"><div class="cover '+x.tone+'"><strong>'+escapeText(x.cover)+'</strong></div><h3>'+escapeText(x.title)+'</h3><p class="minor">'+escapeText(x.author)+'</p></article>').join('');
  document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
}
function route(){
  const key=location.hash.slice(1).split('/')[0]||'memory';
  const view=document.querySelector('[data-view="'+CSS.escape(key)+'"]')?'[data-view="'+CSS.escape(key)+'"]':'[data-view="memory"]';
  document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x.matches(view)));
  document.querySelectorAll('[data-nav]').forEach(x=>x.setAttribute('aria-current',x.dataset.nav===key?'page':'false'));
  if(key==='magazines')renderBooks();
  window.scrollTo(0,0);
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderBooks()}));
document.querySelector('#book-search').addEventListener('input',renderBooks);
window.addEventListener('hashchange',route);
route();
