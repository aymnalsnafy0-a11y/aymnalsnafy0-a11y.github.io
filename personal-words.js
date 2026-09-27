function cleanPersonalWord(value){
  if(!value||typeof value!=='object')return null;
  const hz=String(value.hz||'').trim();
  if(!/^[\u4e00-\u9fff]{1,12}$/.test(hz)||!value.py||!value.m)return null;
  const text=(v,n=400)=>String(v||'').slice(0,n);
  return {hz,py:text(value.py,150),syl:Array.isArray(value.syl)?value.syl.slice(0,12).map(v=>text(v,40)):[],m:text(value.m,250),tr:text(value.tr),ex_hz:text(value.ex_hz,150),ex_py:text(value.ex_py,350),ex_ar:text(value.ex_ar,350)};
}
(function(){
  const section=document.createElement('section');section.id='pg-mywords';section.className='page';
  section.innerHTML='<div class="card"><h2>⭐ كلماتي</h2><p>كلمات تختارها أنت، مستقلة عن الدروس.</p><form id="personalAskForm" class="row"><input id="personalAsk" aria-label="كلمة جديدة" placeholder="اكتب كلمة بالعربي أو بالصيني" maxlength="120" style="flex:1;min-width:0;padding:12px;border:1px solid #bdd0e3;border-radius:10px;font:inherit"><button class="btn" type="submit">اسأل المعلّم</button></form><p id="personalCount" class="muted"></p></div><div id="personalWordList"></div>';
  document.querySelector('main').appendChild(section);
  const nav=document.querySelector('nav button[data-p="chat"]');nav.dataset.p='mywords';nav.innerHTML='<b>⭐</b>كلماتي';nav.setAttribute('onclick',"go('mywords')");
  let adding=false;
  window.paintPersonalWords=function(){
    const words=(state.myWords||[]).map(cleanPersonalWord).filter(Boolean);
    const known=state.personalKnown||{};
    document.getElementById('personalCount').textContent=words.length+' كلمة · '+words.filter(w=>known[w.hz]).length+' محفوظة';
    const list=document.getElementById('personalWordList');
    list.innerHTML=words.length?words.slice().reverse().map(w=>'<article class="card personal-word"><div class="row" style="justify-content:space-between;align-items:center"><span class="hz" style="font-size:36px">'+esc(w.hz)+'</span><button class="btn o" data-personal-speak="'+esc(w.hz)+'">🔊 انطق</button></div><p class="py" style="font-size:20px">'+esc(w.py)+'</p><h3>'+esc(w.m)+'</h3>'+(w.tr?'<p class="note">'+esc(w.tr)+'</p>':'')+(w.ex_hz?'<div class="exbox"><div class="hz" style="font-size:24px">'+esc(w.ex_hz)+'</div><div class="pyline">'+esc(w.ex_py)+'</div><p>'+esc(w.ex_ar)+'</p></div>':'')+'<div class="row"><button class="btn '+(known[w.hz]?'g':'o')+'" data-personal-known="'+esc(w.hz)+'">'+(known[w.hz]?'✓ محفوظة — أعدها للمراجعة':'✓ حفظتها')+'</button><button class="btn o" data-personal-explain="'+esc(w.hz)+'">اسأل عنها</button></div></article>').join(''):'<div class="card"><p>ما عندك كلمات محفوظة هنا بعد.</p><p>اسأل المعلّم عن أي كلمة، ثم اضغط «أضف إلى كلماتي» تحت رده.</p></div>';
  };
  const priorGo=go;
  go=function(page){if(page==='mywords')paintPersonalWords();priorGo(page);};
  section.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.personalSpeak)speak(b.dataset.personalSpeak);
    if(b.dataset.personalExplain)tutorAsk('اشرح '+b.dataset.personalExplain+' مع مثال');
    if(b.dataset.personalKnown){state.personalKnown=state.personalKnown||{};state.personalKnown[b.dataset.personalKnown]=!state.personalKnown[b.dataset.personalKnown];save();paintPersonalWords();}
  });
  document.getElementById('personalAskForm').onsubmit=e=>{e.preventDefault();const input=document.getElementById('personalAsk');if(input.value.trim())tutorAsk('اشرح كلمة '+input.value.trim()+' بالصينية مع البينيين والمعنى');};
  myWordAdd=async function(query){
    if(adding){toast('جارٍ إضافة الكلمة');return;}
    const saved=(state.myWords||[]).find(w=>w.hz===query);
    if(saved){toast('الكلمة موجودة في «كلماتي»');return;}
    adding=true;
    try{
      let word=cleanPersonalWord(state.tutorWordSuggestions?.[query]);
      if(!word){
        if(!aiReady()){toast('فعّل المعلّم أولًا');return;}
        typingOn();
        const r=await aiCall(query,{turns:[],system:'أنت معجم صيني عربي. أعد بيانات الكلمة المقصودة من سؤال الطالب حسب المخطط. استخدم الصينية المبسطة والبينيين بالنبرات، مع مثال قصير وحيلة حفظ. syl نطق كل حرف على حدة.',schema:MYWORD_SCHEMA,max:2048});
        word=cleanPersonalWord(JSON.parse(r.text));
      }
      if(!word)throw AIErr('parse');
      state.myWords=state.myWords||[];
      if(!state.myWords.some(w=>w.hz===word.hz))state.myWords.push(word);
      save();paintPersonalWords();typingOff();
      chatAdd('a','<p>✓ أُضيفت <span class="hz">'+esc(word.hz)+'</span> إلى «كلماتي».</p><div class="trow">'+actBtn('⭐ افتح كلماتي','go','mywords')+'</div>');
      toast('أُضيفت إلى كلماتي');
    }catch(e){typingOff();chatAdd('a','<p>'+esc(AI_ERRS[e.code]||'تعذّر حفظ الكلمة. حاول مرة أخرى.')+'</p>');}
    finally{adding=false;}
  };
  const priorAction=chatAction;
  chatAction=function(action,value){if(action==='go'&&value==='mywords'){document.getElementById('tutorClose')?.click();}return priorAction(action,value);};
  paintPersonalWords();
})();
