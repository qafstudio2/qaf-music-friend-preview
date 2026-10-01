// Synced from the local practice tools, 2026-10-01.
const seventhTypes={
 Cmaj7:{tones:{0:'1',4:'3',7:'5',11:'7'},notes:'C · E · G · B',hint:'大三和弦加大七度。'},
 Cm7:{tones:{0:'1',3:'♭3',7:'5',10:'♭7'},notes:'C · E♭ · G · B♭',hint:'Cmaj7的3與7各降半音。'},
 C7:{tones:{0:'1',4:'3',7:'5',10:'♭7'},notes:'C · E · G · B♭',hint:'Cmaj7只把7降半音，保留大三度。'},
 Cdim7:{tones:{0:'1',3:'♭3',6:'♭5',9:'♭♭7'},notes:'C · E♭ · G♭ · B♭♭',hint:'減七和弦是1、♭3、♭5、♭♭7；B♭♭與A同音，但不是Cm7♭5。每相鄰和弦音相隔小三度。'}
};
// Craig Agnew (2012), CAGED 7th Chord Arpeggios, CC BY 3.0.
// Explicit frets on strings 6 -> 1. Am7 patterns are transposed +3 to Cm7.
const seventhPatterns={
 Cmaj7:{C:[[0,3],[2,3],[2],[0],[0,1],[0,3]],A:[[3],[2,3],[2,5],[4,5],[5],[3]],G:[[7,8],[7],[5],[4,5],[5,8],[7,8]],E:[[7,8],[7,10],[9,10],[9],[8],[7,8]],D:[[12],[10],[9,10],[9,12],[12,13],[12]]},
 C7:{C:[[0,3],[1,3],[2],[0,3],[1],[0,3]],A:[[3,6],[3],[2,5],[3,5],[5],[3,6]],G:[[6,8],[7],[5,8],[5],[5,8],[6,8]],E:[[8],[7,10],[8,10],[9],[8,11],[8]],D:[[12],[10,13],[10],[9,12],[11,13],[12]]},
 Cm7:{C:[[3],[1,3],[1],[0,3],[1],[3]],A:[[3,6],[3,6],[5],[3,5],[4],[3,6]],G:[[6,8],[6],[5,8],[5,8],[8],[6,8]],E:[[8,11],[10],[8,10],[8],[8,11],[8,11]],D:[[11],[10,13],[10],[12],[11,13],[11]]},
 // Diminished seventh positions from the supplied six-position reference.
 Cdim7:{'1':[[2,5],[3],[1,4],[2,5],[4],[2,5]],'2':[[2,5],[3,6],[4],[5],[4,7],[5,8]],'3':[[5,8],[6],[4,7],[5,8],[7],[8]],'4':[[8],[9,12],[10],[8],[10],[8,11]],'5':[[11],[12],[10,13],[11],[10,13],[11,14]],'6':[[11],[12,15],[13],[11,14],[13],[14]]}
};
const shapeColors=['#6930b8','#006cba','#aa6500','#c12f65','#007a50','#665566'];
let activeShape=null,currentSeventh='Cmaj7';
function shapeName(name,type=currentSeventh){return type==='Cdim7'?'位置 '+name:name+' 形'}
function patternPoints(type,name,shift=0){return seventhPatterns[type][name].flatMap((frets,i)=>frets.map(f=>({s:5-i,f:f+shift}))).filter(p=>p.f>=0&&p.f<=24)}
function focusShape(name,shift=0){activeShape=name?{name,shift}:null;chooseSeventh(currentSeventh)}
function shapeButtons(){return Object.keys(seventhPatterns[currentSeventh]).map((name,i)=>'<button type="button" aria-pressed="'+Boolean(activeShape&&activeShape.name===name)+'" style="border-color:'+shapeColors[i]+'" onclick="focusShape(&quot;'+name+'&quot;)">'+shapeName(name)+'</button>').join('')+'<button type="button" onclick="focusShape(null)">顯示全部</button>'}
function roomyPatternOutline(points,x,y){
 const corners=points.flatMap(p=>[[-25,-24],[25,-24],[25,24],[-25,24]].map(([dx,dy])=>[x(p.f)+dx,y(p.s)+dy]));
 const sorted=corners.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 const half=items=>{const out=[];for(const p of items){while(out.length>1&&cross(out[out.length-2],out[out.length-1],p)<=0)out.pop();out.push(p)}return out};
 const lower=half(sorted),upper=half([...sorted].reverse());lower.pop();upper.pop();const hull=lower.concat(upper);
 const bends=hull.map((p,i)=>{const prev=hull[(i+hull.length-1)%hull.length],next=hull[(i+1)%hull.length];const toward=q=>{const len=Math.hypot(q[0]-p[0],q[1]-p[1]),d=Math.min(14,len/3);return [p[0]+(q[0]-p[0])*d/len,p[1]+(q[1]-p[1])*d/len]};return {p,enter:toward(prev),exit:toward(next)}});
 return 'M '+bends[0].enter.join(' ')+bends.map(({p,enter,exit},i)=>(i?' L '+enter.join(' '):'')+' Q '+p.join(' ')+' '+exit.join(' ')).join('')+' Z';
}
function seventhBoard(type){
 const chord=seventhTypes[type],opens=[64,59,55,50,45,40],x=f=>80+f*46,y=s=>237+s*31;
 const selected=activeShape?new Set(patternPoints(type,activeShape.name,activeShape.shift).map(p=>p.s+':'+p.f)):null;
 let svg='<svg viewBox="0 0 1220 510" onclick="if(!event.target.closest(&quot;[role=button]&quot;))focusShape(null)" role="group" aria-label="'+type+'琶音，紅色1為根音C，黑點為其他和弦音"><rect x="58" y="218" width="1150" height="192" rx="8" fill="#fff"/>';
 Object.keys(seventhPatterns[type]).forEach((name,i)=>{for(const shift of [0,12]){
  const points=patternPoints(type,name,shift);if(!points.length)continue;
  const lo=Math.min(...points.map(p=>p.f)),hi=Math.max(...points.map(p=>p.f)),cx=(x(lo)+x(hi))/2,ly=25+i*25;
  const on=!activeShape||(activeShape.name===name&&activeShape.shift===shift);
  svg+='<g data-shape="'+name+'" data-shift="'+shift+'" opacity="'+(on?1:.09)+'"><path d="'+roomyPatternOutline(points,x,y)+'" stroke-linejoin="round" fill="none" stroke="'+shapeColors[i]+'" stroke-width="'+(activeShape&&on?3:2)+'" '+(shift?'stroke-dasharray="9 7"':'')+'/>';
  svg+='<text x="'+cx+'" y="'+ly+'" text-anchor="middle" fill="'+shapeColors[i]+'" font-size="17" font-weight="700" role="button" tabindex="0" style="cursor:pointer" onclick="event.stopPropagation();focusShape(&quot;'+name+'&quot;,'+shift+')" onkeydown="if(event.key===&quot;Enter&quot;||event.key===&quot; &quot;){event.preventDefault();event.stopPropagation();focusShape(&quot;'+name+'&quot;,'+shift+')}">'+shapeName(name,type)+(shift?' +12':'')+' · '+lo+'–'+hi+'格</text></g>';
 }});
 for(let f=0;f<=24;f++){svg+='<text x="'+x(f)+'" y="458" text-anchor="middle" font-size="14">'+f+'</text>';if(f)svg+='<line x1="'+(x(f)-23)+'" y1="220" x2="'+(x(f)-23)+'" y2="408" stroke="#ddd"/>'}
 for(let s=0;s<6;s++){
  svg+='<text x="4" y="'+(y(s)+5)+'" font-size="13">'+(s+1)+'弦 '+['E','B','G','D','A','E'][s]+'</text><line x1="58" y1="'+y(s)+'" x2="1208" y2="'+y(s)+'" stroke="#aaa"/>';
  for(let f=0;f<=24;f++){const midi=opens[s]+f,pc=midi%12,degree=chord.tones[pc];if(!degree||selected&&!selected.has(s+':'+f))continue;
   svg+='<g data-string="'+(s+1)+'" data-fret="'+f+'" data-midi="'+midi+'" data-degree="'+degree+'"><title>'+(s+1)+'弦'+f+'格：'+degree+(pc===0?'（根音C）':'')+'</title><circle cx="'+x(f)+'" cy="'+y(s)+'" r="14" fill="'+(pc===0?'#c52f31':'#242424')+'"/><text x="'+x(f)+'" y="'+(y(s)+5)+'" text-anchor="middle" fill="white" font-size="'+(degree.length>2?12:14)+'">'+degree+'</text></g>';
  }
 }
 return svg+'</svg>';
}
function chooseSeventh(type){
 window.QafGuitar?.stop();
 if(!seventhTypes[type])return;currentSeventh=type;
 if(activeShape&&!seventhPatterns[type][activeShape.name])activeShape=null;
 document.getElementById('seventh-shapes').innerHTML=shapeButtons();
 document.getElementById('seventh-board').innerHTML=seventhBoard(type);
 document.getElementById('seventh-summary').textContent=type+'：'+seventhTypes[type].notes+'。'+(activeShape?shapeName(activeShape.name)+'：依逐弦指型顯示，保留各八度音。':seventhTypes[type].hint);
 document.querySelectorAll('[data-seventh]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.seventh===type)));
}
function seventhSection(){
 currentSeventh='Cmaj7';activeShape=null;
 return '<article id="memory-sevenths"><h2>03 七和弦琶音總表：全指板 × CAGED</h2><p>紅點 <b>1＝根音C</b>，黑點為其他和弦音，點內是音程。標準調弦，一弦在上、六弦在下。</p><p>點選形名，查看該形的逐弦音點；外框沿指型外圍保留空間，必要處以斜邊收起；音點依各弦指型顯示。點空白處或「顯示全部」恢復全指板；+12 是高八度同形。</p><div id="seventh-shapes" class="shape-buttons" role="group" aria-label="選擇琶音指型">'+shapeButtons()+'</div><div class="arp-board" id="seventh-board">'+seventhBoard('Cmaj7')+'</div><div class="seventh-buttons">'+Object.keys(seventhTypes).map(t=>'<button data-seventh="'+t+'" aria-pressed="'+(t==='Cmaj7')+'" onclick="chooseSeventh(\''+t+'\')">'+t+'</button>').join('')+'</div><p id="seventh-summary" aria-live="polite">Cmaj7：C · E · G · B。</p><p class="muted">五形依 Craig Agnew《CAGED 7th Chord Arpeggios》（2012，CC BY 3.0）重繪。原圖數字為指法，本圖改標音程；Am7 移調為 Cm7，開放把位省略琴枕外的音。減七和弦依提供的六個位置圖整理，使用 ♭♭7，不以6代替，也不套用五個大和弦形名。</p><p><b>每天練法：</b>先找紅色根音，沿所選指型由低音到高音彈奏並說出音程，再連接相鄰形。</p><p><span>Fretboard Mastery－五形定位－PDF第96頁</span> · <span>七和弦琶音－PDF第103頁</span> · <span>減七和弦－PDF第116頁</span></p></article>';
}


function wireMemoryBoard(){
 const host=document.getElementById('memory-sevenths');
 if(host)host.outerHTML=seventhSection();
}

window.QafGuitar=(()=>{
 let ctx,master,wave,timer=null,level=.35,tone='clean';try{tone=localStorage.getItem('qaf-demo-tone')==='drive'?'drive':'clean'}catch(e){}const voices=new Set();try{level=Math.max(0,Math.min(1,Number(localStorage.getItem('qaf-demo-volume')??.35)))}catch(e){}
 function setup(){if(!ctx){ctx=new AudioContext();master=ctx.createGain();master.gain.value=level;const limit=ctx.createDynamicsCompressor();limit.threshold.value=-12;limit.ratio.value=4;master.connect(limit);limit.connect(ctx.destination);wave=ctx.createPeriodicWave(new Float32Array(9),new Float32Array([0,1,.55,.3,.16,.09,.05,.025,.01]))}ctx.resume()}
 function note(midi,duration=1.15){if(!Number.isFinite(midi))return;setup();const o=ctx.createOscillator(),g=ctx.createGain(),filter=ctx.createBiquadFilter(),now=ctx.currentTime;o.setPeriodicWave(wave);o.frequency.value=440*2**((midi-69)/12);filter.type='lowpass';filter.frequency.setValueAtTime(3300,now);filter.frequency.exponentialRampToValueAtTime(1400,now+duration);filter.Q.value=.5;g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.23,now+.008);g.gain.exponentialRampToValueAtTime(.035,now+.35);g.gain.exponentialRampToValueAtTime(.0001,now+duration);let drive;if(tone==='drive'){drive=ctx.createWaveShaper();const curve=new Float32Array(2048);for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=Math.tanh(3*x)/Math.tanh(3)*.65}drive.curve=curve;drive.oversample='4x';o.connect(drive);drive.connect(filter);filter.frequency.setValueAtTime(2200,now)}else o.connect(filter);filter.connect(g);g.connect(master);voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();drive?.disconnect();filter.disconnect();g.disconnect()};o.start();o.stop(now+duration+.02)}
 function stop(){clearTimeout(timer);timer=null;for(const o of voices){try{o.stop()}catch(e){}}voices.clear();document.querySelectorAll('[data-demo-play]').forEach(b=>b.textContent=b.dataset.demoPlay)}
 function volume(v){level=Number(v)/100;if(master)master.gain.setTargetAtTime(level,ctx.currentTime,.02);try{localStorage.setItem('qaf-demo-volume',String(level))}catch(e){}document.querySelectorAll('[data-demo-volume]').forEach(e=>{e.value=v;e.nextElementSibling.value=v+'%'})}
 function run(notes,paint){stop();let i=0;const next=()=>{if(i>=notes.length)return;paint?.(i);note(notes[i++]);timer=setTimeout(next,650)};next()}
 function controls(host,kind){if(!host||host.querySelector('.qaf-audio-controls'))return;const box=document.createElement('div');box.className='qaf-audio-controls';box.innerHTML=(kind==='region'?'':kind==='world'?'<button data-demo-play="▶ 播放音階">▶ 播放音階</button><button data-demo-stop>停止</button>':'<button data-demo-chord>聽和弦</button><button data-demo-play="▶ 逐音演示">▶ 逐音演示</button><button data-demo-stop>停止</button>')+'<label>音色 <select data-demo-tone aria-label="示範音色"><option value="clean">柔和電吉他</option><option value="drive">破音電吉他</option></select></label><label>音量 <input data-demo-volume type="range" min="0" max="100" step="1" value="'+Math.round(level*100)+'" aria-label="示範音量"><output>'+Math.round(level*100)+'%</output></label>';host.append(box);box.querySelector('[data-demo-tone]').value=tone;box.querySelector('[data-demo-tone]').onchange=e=>{stop();tone=e.target.value;try{localStorage.setItem('qaf-demo-tone',tone)}catch(e){}document.querySelectorAll('[data-demo-tone]').forEach(s=>s.value=tone)};box.querySelector('input').oninput=e=>volume(e.target.value);box.querySelector('[data-demo-stop]')?.addEventListener('click',stop);const pitches=()=>Object.keys(seventhTypes[currentSeventh].tones).map(Number).map(v=>48+v);box.querySelector('[data-demo-chord]')?.addEventListener('click',()=>{stop();pitches().forEach(n=>note(n,1.8))});box.querySelector('[data-demo-play]')?.addEventListener('click',()=>{if(kind==='world'){const w=document.getElementById('memory-world-scale-wheel');const ns=JSON.parse(w.dataset.demoPitches||'[]');run(ns,i=>w.querySelector('[data-note-index="'+i+'"]')?.dispatchEvent(new CustomEvent('qaf-highlight')))}else run(pitches())})}
 function mount(){controls(document.getElementById('memory-world-scale-wheel'),'world');controls(document.querySelector('.seventh-buttons'),'seventh')}
 let pending=false;new MutationObserver(()=>{if(!pending){pending=true;requestAnimationFrame(()=>{pending=false;mount()})}}).observe(document.getElementById('main'),{childList:true,subtree:true});window.addEventListener('hashchange',stop);mount();return {note,stop,volume};
})();
