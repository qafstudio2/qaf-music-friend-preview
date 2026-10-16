(() => {
  const api='/music/design-notes/api';
  const draftKey='qaf-design-meeting-note-draft';
  function element(tag,attrs={},text=''){
    const node=document.createElement(tag);
    for(const [name,value] of Object.entries(attrs))node.setAttribute(name,value);
    if(text)node.textContent=text;
    return node;
  }
  function showNotes(list,notes){
    list.replaceChildren();
    if(!notes.length)return;
    for(const note of notes){
      const entry=element('article',{class:'design-notes-entry'});
      entry.append(element('time',{datetime:note.createdAt},new Date(note.createdAt).toLocaleString('zh-TW')));
      if(note.text)entry.append(element('p',{},note.text));
      if(note.files?.length){
        const files=element('div',{class:'design-notes-files'});
        for(const file of note.files){
          const link=element('a',{href:`/music/design-notes/files/${encodeURIComponent(note.id)}/${encodeURIComponent(file.id)}`,target:'_blank',rel:'noopener noreferrer'});
          if(file.mime.startsWith('image/')&&!['image/heic','image/heif'].includes(file.mime)){
            link.append(element('img',{src:link.href,alt:file.name,loading:'lazy'}));
          }
          link.append(document.createTextNode(file.name));files.append(link);
        }
        entry.append(files);
      }
      list.append(entry);
    }
  }
  window.designNotesMount=function(main){
    if(location.hostname!=='qaf.tw')return;
    const box=element('section',{class:'design-notes','aria-label':'吉他設計筆記'});
    box.append(element('h2',{},'吉他記憶筆記'));
    const form=element('form'),textarea=element('textarea',{placeholder:'記錄今天討論的設計、尺寸、修改意見…','aria-label':'筆記文字'});
    textarea.value=localStorage.getItem(draftKey)||'';
    textarea.addEventListener('input',()=>localStorage.setItem(draftKey,textarea.value));
    const actions=element('div',{class:'design-notes-actions'});
    const filesInput=element('input',{type:'file',multiple:'',accept:'image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx','aria-label':'選擇附件'});
    const cameraInput=element('input',{type:'file',accept:'image/*',capture:'environment','aria-label':'拍照'});
    const filesLabel=element('label',{},'選擇附件'),cameraLabel=element('label',{},'拍照');
    filesLabel.append(filesInput);cameraLabel.append(cameraInput);
    const submit=element('button',{type:'submit'},'儲存筆記'),selection=element('div',{class:'design-notes-selection'}),status=element('div',{class:'design-notes-status',role:'status','aria-live':'polite'}),list=element('div',{class:'design-notes-list'});
    actions.append(cameraLabel,filesLabel,submit);form.append(textarea,actions,selection,status);box.append(form,list);
    const nav=main.querySelector('.design-projects');if(nav)nav.after(box);else main.prepend(box);
    const picked=[];
    function refreshSelection(){selection.textContent=picked.length?`已選 ${picked.length} 個附件：${picked.map(f=>f.name).join('、')}`:'';}
    function addFiles(source){for(const file of source){if(picked.length<8)picked.push(file);}refreshSelection();}
    filesInput.addEventListener('change',()=>{addFiles(filesInput.files);filesInput.value='';});
    cameraInput.addEventListener('change',()=>{addFiles(cameraInput.files);cameraInput.value='';});
    textarea.addEventListener('paste',event=>{const images=[...(event.clipboardData?.files||[])].filter(file=>file.type.startsWith('image/'));if(images.length){addFiles(images);status.textContent='已加入貼上的圖片，按「儲存筆記」即可保存。';}});
    let pendingId=null;
    async function refresh(){try{const response=await fetch(api,{cache:'no-store'});if(!response.ok)throw Error();showNotes(list,(await response.json()).notes||[]);}catch{status.textContent='目前讀不到筆記，請稍後重試。';}}
    form.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!textarea.value.trim()&&!picked.length){status.textContent='請輸入文字或加入附件。';return;}
      submit.disabled=true;
      try{
        if(!pendingId){
          status.textContent='正在儲存文字…';
          const response=await fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:textarea.value})});
          const data=await response.json();if(!response.ok)throw Error(data.error||'無法儲存文字');pendingId=data.note.id;
        }
        while(picked.length){
          const file=picked[0];status.textContent=`正在上傳 ${file.name}（${picked.length} 個待處理）…`;
          const response=await fetch(`${api}/${pendingId}/files?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream'},body:file});
          const data=await response.json();if(!response.ok)throw Error(data.error||'附件上傳失敗');picked.shift();refreshSelection();
        }
        pendingId=null;textarea.value='';localStorage.removeItem(draftKey);status.textContent='已儲存到網站。';await refresh();
      }catch(error){status.textContent=`${error.message}。已保存的文字和附件會留在網站；你可以再按一次儲存重試。`;await refresh();}
      finally{submit.disabled=false;}
    });
    refresh();
  };
})();
