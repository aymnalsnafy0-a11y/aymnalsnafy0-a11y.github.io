function cleanPersonalWord(value){
  if(!value||typeof value!=='object')return null;
  const hz=String(value.hz||'').trim();
  if(!/^[\u4e00-\u9fff]{1,12}$/.test(hz)||!value.py||!value.m)return null;
  const text=(v,n=400)=>String(v||'').slice(0,n);
  return {hz,py:text(value.py,150),syl:Array.isArray(value.syl)?value.syl.slice(0,12).map(v=>text(v,40)):[],m:text(value.m,250),tr:text(value.tr),ex_hz:text(value.ex_hz,150),ex_py:text(value.ex_py,350),ex_ar:text(value.ex_ar,350)};
}
(function(){
  const section=document.createElement('section');section.id='pg-mywords';section.className='page';
  section.innerHTML="<div class=\"card\"><h2>⭐ My words</h2><p>Words you choose, independent of the lessons.</p><form id=\"personalAskForm\" class=\"row\"><input id=\"personalAsk\" aria-label=\"A new word\" placeholder=\"Write a word in English or Chinese\" maxlength=\"120\" style=\"flex:1;min-width:0;padding:12px;border:1px solid #bdd0e3;border-radius:10px;font:inherit\"><button class=\"btn\" type=\"submit\">Ask the teacher</button></form><p id=\"personalCount\" class=\"muted\"></p></div><div id=\"personalWordList\"></div>";
  document.querySelector('main').appendChild(section);
  const nav=document.querySelector('nav button[data-p="chat"]');nav.dataset.p='mywords';nav.innerHTML="<b>⭐</b>My words";nav.setAttribute('onclick',"go('mywords')");
  let adding=false;
  window.paintPersonalWords=function(){
    const words=(state.myWords||[]).map(cleanPersonalWord).filter(Boolean);
    const known=state.personalKnown||{};
    document.getElementById('personalCount').textContent=words.length+" word · "+words.filter(w=>known[w.hz]).length+" Reserved";
    const list=document.getElementById('personalWordList');
    list.innerHTML=words.length?words.slice().reverse().map(w=>'<article class="card personal-word"><div class="row" style="justify-content:space-between;align-items:center"><span class="hz" style="font-size:36px">'+esc(w.hz)+'</span><button class="btn o" data-personal-speak="'+esc(w.hz)+"\">🔊 Speak</button></div><p class=\"py\" style=\"font-size:20px\">"+esc(w.py)+'</p><h3>'+esc(w.m)+'</h3>'+(w.tr?'<p class="note">'+esc(w.tr)+'</p>':'')+(w.ex_hz?'<div class="exbox"><div class="hz" style="font-size:24px">'+esc(w.ex_hz)+'</div><div class="pyline">'+esc(w.ex_py)+'</div><p>'+esc(w.ex_ar)+'</p></div>':'')+'<div class="row"><button class="btn '+(known[w.hz]?'g':'o')+'" data-personal-known="'+esc(w.hz)+'">'+(known[w.hz]?"✓ Reserved — return it for review":"✓ I memorized it")+'</button><button class="btn o" data-personal-explain="'+esc(w.hz)+"\">Ask about it</button></div></article>").join(''):"<div class=\"card\"><p>You don't have any saved words here yet.</p><p>Ask the teacher about any word, then click “Add to my words” under his response.</p></div>";
  };
  const priorGo=go;
  go=function(page){if(page==='mywords')paintPersonalWords();priorGo(page);};
  section.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.personalSpeak)speak(b.dataset.personalSpeak);
    if(b.dataset.personalExplain)tutorAsk("Explain "+b.dataset.personalExplain+" With an example");
    if(b.dataset.personalKnown){state.personalKnown=state.personalKnown||{};state.personalKnown[b.dataset.personalKnown]=!state.personalKnown[b.dataset.personalKnown];save();paintPersonalWords();}
  });
  document.getElementById('personalAskForm').onsubmit=e=>{e.preventDefault();const input=document.getElementById('personalAsk');if(input.value.trim())tutorAsk("Explain the word "+input.value.trim()+" In Chinese with pinyin and meaning");};
  myWordAdd=async function(query){
    if(adding){toast("The word is being added");return;}
    const saved=(state.myWords||[]).find(w=>w.hz===query);
    if(saved){toast("The word is found in “My Words”");return;}
    adding=true;
    try{
      let word=cleanPersonalWord(state.tutorWordSuggestions?.[query]);
      if(!word){
        if(!aiReady()){toast("Activate the parameter first");return;}
        typingOn();
        const r=await aiCall(query,{turns:[],system:"You are a Chinese–English dictionary. Prepare the intended word data from the student's question according to the chart. Use simplified Chinese and pinyin with accents, along with a short example and memorization trick. syl Pronounce each letter separately.",schema:MYWORD_SCHEMA,max:2048});
        word=cleanPersonalWord(JSON.parse(r.text));
      }
      if(!word)throw AIErr('parse');
      state.myWords=state.myWords||[];
      if(!state.myWords.some(w=>w.hz===word.hz))state.myWords.push(word);
      save();paintPersonalWords();typingOff();
      chatAdd('a',"<p>✓ Added <span class=\"hz\">"+esc(word.hz)+"</span> to “My Words”.</p><div class=\"trow\">"+actBtn("⭐ Open my words",'go','mywords')+'</div>');
      toast("added to my words");
    }catch(e){typingOff();chatAdd('a','<p>'+esc(AI_ERRS[e.code]||"The word could not be saved. Try again.")+'</p>');}
    finally{adding=false;}
  };
  const priorAction=chatAction;
  chatAction=function(action,value){if(action==='go'&&value==='mywords'){document.getElementById('tutorClose')?.click();}return priorAction(action,value);};
  paintPersonalWords();
})();
