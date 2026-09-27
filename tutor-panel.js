/* Shared teacher: server credential, existing lesson tools and device-local memory. */
(function(){
  'use strict';
  const panel=document.createElement('aside');
  panel.id='tutorPanel';panel.className='tutor-panel';panel.hidden=true;panel.dir='rtl';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','معلّم الصينية');
  panel.innerHTML='<header class="tutor-head"><strong>老师 · معلّمك</strong><div><button type="button" id="tutorClear" title="مسح المحادثة">محادثة جديدة</button> <button type="button" id="tutorClose" aria-label="إغلاق المعلّم">✕</button></div></header><div class="tutor-context" id="tutorContext"></div><div class="tutor-actions"><button type="button" data-tutor-question="اشرح لي ما أذاكره الآن مع مثال والبينيين">اشرح الحالي</button><button type="button" data-tutor-question="اختبرني بسؤال واحد من درسي وانتظر إجابتي">اختبرني</button><button type="button" data-tutor-question="ساعدني أحفظ شكل الحرف الحالي بحيلة بصرية، وميّزها عن أصل الحرف">ساعدني أحفظ</button></div>';
  document.body.appendChild(panel);
  const log=document.getElementById('chatLog'),bar=document.getElementById('chatBar');
  panel.append(log,bar);log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');
  const fab=document.querySelector('.fab');fab.textContent='💬 المعلّم';fab.setAttribute('aria-controls','tutorPanel');fab.setAttribute('aria-expanded','false');
  let busy=false,previousFocus=null;
  const scroll=()=>{log.scrollTop=log.scrollHeight;};
  function context(){
    const page=document.querySelector('.page.on')?.id||'';
    const word=page==='pg-vocab'&&vList[vPos]?wordHz(vList[vPos]):'';
    document.getElementById('tutorContext').textContent=(L?.title||'دروسك')+(word?' · '+word:'')+' · المحادثة محفوظة على هذا الجهاز';
    return '\nالصفحة الحالية: '+page+(word?'\nالكلمة المعروضة: '+word:'')+'\nالكلمات المحفوظة في الدرس: '+(W||[]).filter(w=>status(w)==='known').map(wordHz).join('، ');
  }
  function open(){previousFocus=document.activeElement;panel.hidden=false;fab.setAttribute('aria-expanded','true');context();scroll();document.getElementById('chatIn').focus({preventScroll:true});fitChatBar();}
  function close(){panel.hidden=true;fab.setAttribute('aria-expanded','false');(previousFocus&&previousFocus!==document.body?previousFocus:fab).focus({preventScroll:true});}
  window.openTutorPanel=open;
  let drag=null,lastDragAt=0;
  fab.title='اسأل المعلّم · اسحب الزر لتغيير مكانه';
  fab.setAttribute('aria-description','اضغط لفتح المعلّم، أو اسحب لتغيير مكان الزر. يمكنك استخدام مفاتيح الأسهم لتحريكه.');
  function placeFab(x,y,persist){
    const maxX=Math.max(8,window.innerWidth-fab.offsetWidth-8),maxY=Math.max(8,window.innerHeight-fab.offsetHeight-8);
    x=Math.max(8,Math.min(maxX,x));y=Math.max(8,Math.min(maxY,y));
    fab.style.insetInlineStart='auto';fab.style.right='auto';fab.style.bottom='auto';fab.style.left=x+'px';fab.style.top=y+'px';
    if(persist){state.set.tutorPosition={x:maxX>8?(x-8)/(maxX-8):0,y:maxY>8?(y-8)/(maxY-8):0};save();}
  }
  function restoreFab(){
    const p=state.set.tutorPosition;if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    placeFab(8+Math.max(0,window.innerWidth-fab.offsetWidth-16)*p.x,8+Math.max(0,window.innerHeight-fab.offsetHeight-16)*p.y,false);
  }
  fab.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary)return;
    const box=fab.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left,top:box.top,moved:false};
    fab.setPointerCapture(e.pointerId);
  });
  fab.addEventListener('pointermove',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<6)return;
    drag.moved=true;fab.classList.add('is-dragging');e.preventDefault();
    placeFab(drag.left+dx,drag.top+dy,false);
  });
  function endDrag(e){
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.moved){const box=fab.getBoundingClientRect();placeFab(box.left,box.top,true);lastDragAt=Date.now();}
    drag=null;fab.classList.remove('is-dragging');
    if(fab.hasPointerCapture(e.pointerId))fab.releasePointerCapture(e.pointerId);
  }
  fab.addEventListener('pointerup',endDrag);fab.addEventListener('pointercancel',endDrag);
  fab.addEventListener('lostpointercapture',()=>{drag=null;fab.classList.remove('is-dragging');});
  fab.addEventListener('keydown',e=>{
    const shift={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(!shift)return;
    e.preventDefault();const box=fab.getBoundingClientRect();placeFab(box.left+shift[0],box.top+shift[1],true);
  });
  window.addEventListener('resize',restoreFab);restoreFab();
  fab.onclick=()=>{if(Date.now()-lastDragAt<400)return;panel.hidden?open():close();};
  document.getElementById('tutorClose').onclick=close;
  document.getElementById('tutorClear').onclick=()=>{if(busy)return;if(state.chat.length&&!confirm('تمسح المحادثة وتبدأ من جديد؟ تقدّم الدروس يبقى محفوظًا.'))return;state.chat=[];save();paintChat();};
  panel.querySelectorAll('[data-tutor-question]').forEach(b=>b.onclick=()=>tutorAsk(b.dataset.tutorQuestion));
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close();}});
  const oldGo=go;
  go=function(page){if(page==='chat'){open();return;}oldGo(page);context();};
  const oldOpenModal=openModal;
  openModal=function(id){if(!panel.hidden)close();oldOpenModal(id);};
  tutorFromContext=open;
  window.visualViewport?.addEventListener('resize',fitPanelViewport);
  window.visualViewport?.addEventListener('scroll',fitPanelViewport);
  function fitPanelViewport(){fitChatBar();}
  paintChat=function(){const msgs=state.chat||[];log.innerHTML=msgs.length?msgs.map(m=>'<div class="msg '+(m.r==='u'?'me':'ai')+'"><div class="bubble">'+m.h+'</div></div>').join(''):'<div class="msg ai"><div class="bubble">你好 (nǐ hǎo) — مرحبًا! أنا معلّمك. اسألني عن الدرس أو اضغط «اشرح الحالي».<br><small>تحتاج الإجابات الذكية اتصالًا بالإنترنت.</small></div></div>';scroll();};
  typingOn=function(){typingOff();const d=document.createElement('div');d.id='tTyping';d.className='msg ai';d.textContent='المعلّم يكتب…';log.appendChild(d);scroll();};
  fitChatBar=function(){if(!window.visualViewport)return;const vv=window.visualViewport;const gap=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);panel.style.bottom=gap>100?(gap+8)+'px':'';panel.style.maxHeight=Math.max(140,vv.height-(gap>100?20:165))+'px';};
  aiReady=()=>state.set.aiOn!==0;
  aiModel=()=> 'gemini-3.8-flash';
  AI_ERRS.nokey='المعلّم غير مفعّل على الخادم بعد.';
  AI_ERRS.badkey='تعذّر اتصال المعلّم بحساب Google. يلزم تحديث مفتاح الخادم.';
  AI_ERRS.quota='وصلنا لحد الاستخدام المتاح حاليًا. جرّب لاحقًا؛ تقدر تواصل مذاكرة الدروس المحفوظة.';
  AI_ERRS.model='نموذج المعلّم غير متاح حاليًا. جرّب لاحقًا.';
  aiFoot=()=>'<div class="tles">🤖 معلّمك الذكي · Gemini</div>';
  aiCall=async function(text,opts){
    opts=opts||{};
    if(navigator.onLine===false)throw AIErr('offline');
    if(aiQuotaLeft()<=0)throw AIErr('cap');
    const turns=(opts.turns||aiTurns(10)).slice();
    if(!opts.skipUser && !(turns.length&&turns[turns.length-1].role==='u'&&turns[turns.length-1].text===text))turns.push({role:'u',text});
    const sys=opts.system==null?aiSystem().replace('- التزم بمفردات الدرس أدناه، ولا تُدخل كلمات أصعب إلا إذا سُئلت عنها.','- اشرح أي كلمة يسأل عنها الطالب حتى لو كانت خارج دروسه، واجعل الشرح مناسبًا للمبتدئ.')+context():opts.system;
    const body=AI_PROVIDERS.gemini.build(sys,turns,opts.images,Object.assign({},opts,{web:false}));
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),opts.timeout||65000);
    try{
      const r=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
      if(!r.ok)throw AI_PROVIDERS.gemini.fail(r.status,await r.text());
      const j=await r.json();aiCount();return {text:AI_PROVIDERS.gemini.parse(j),srcs:[]};
    }catch(e){if(e.code)throw e;throw AIErr(e.name==='AbortError'?'abort':'offline');}finally{clearTimeout(timer);}
  };
  aiAsk=aiCall;
  function setBusy(value){busy=value;document.getElementById('tutorClear').disabled=value;bar.querySelector('button[onclick="chatSend()"]').disabled=value;panel.querySelectorAll('[data-tutor-question]').forEach(b=>b.disabled=value);}
  const replySchema={type:'object',required:['reply','words'],properties:{reply:{type:'string'},words:{type:'array',maxItems:3,items:MYWORD_SCHEMA}}};
  tutorAsk=async function(question){
    const text=String(question||'').trim().slice(0,6000);if(!text)return;
    if(busy){toast('انتظر رد المعلّم أولًا');return;}
    if(panel.hidden)open();
    setBusy(true);chatAdd('u',esc(text));
    if(!aiReady()){chatAdd('a',tutorAnswer(text));setBusy(false);return;}
    typingOn();
    try{
      const sys=aiSystem()+context()+'\nأجب عن أي كلمة أو ترجمة يطلبها الطالب، ولو لم تكن في الدرس. أعد JSON بالمخطط: reply يحتوي شرحك بالعربية والصينية والبينيين؛ words يحتوي فقط الكلمات الأساسية التي تشرحها في هذا الرد (حتى 3) مع بياناتها الصحيحة للحفظ. لا تضف كل كلمات الأمثلة. حقل syl نطق كل حرف على حدة. حقل tr حيلة للحفظ لا ادعاء عن أصل الحرف. يجوز words فارغًا في الأسئلة العامة. لا تقل إنك حفظت الكلمات، الطالب سيضغط زر الإضافة.';
      const r=await aiAsk(text,{system:sys,schema:replySchema,max:4096});
      let data;try{data=JSON.parse(r.text);}catch(_){throw AIErr('parse');}
      if(typeof data.reply!=='string'||!data.reply.trim())throw AIErr('parse');
      const words=(Array.isArray(data.words)?data.words:[]).slice(0,3).map(cleanPersonalWord).filter(Boolean);
      state.tutorWordSuggestions=state.tutorWordSuggestions||{};
      for(const w of words)state.tutorWordSuggestions[w.hz]=w;
      const keys=Object.keys(state.tutorWordSuggestions);for(const key of keys.slice(0,Math.max(0,keys.length-100)))delete state.tutorWordSuggestions[key];
      typingOff();chatAdd('a',chatFmt(data.reply)+aiFoot()+'<div class="trow">'+words.map(w=>actBtn((state.myWords||[]).some(x=>x.hz===w.hz)?'✓ '+w.hz+' في كلماتي':'＋ أضف '+w.hz+' إلى كلماتي','add',w.hz,'g')).join('')+'</div>');
    }
    catch(e){typingOff();const available=tutorScore(text)>=70?tutorAnswer(text):'';chatAdd('a','<p>'+esc(AI_ERRS[e.code]||AI_ERRS.http)+'</p>'+available+'<div class="trow">'+actBtn('أعد المحاولة','retry',text)+'</div>');}
    finally{setBusy(false);scroll();}
  };
  chatSend=function(){if(busy){toast('انتظر رد المعلّم أولًا');return;}const inp=document.getElementById('chatIn');const text=inp.value.trim();if(!text)return;inp.value='';tutorAsk(text);};
  aiPaint=function(){document.getElementById('aiState').innerHTML='<div class="note g"><b>المعلّم متصل بحساب Google</b>متاح من زر «المعلّم» في كل الصفحات. يحتاج الإنترنت وتطبق حدود Google المجانية.</div>';document.getElementById('aiOnBtn').textContent=state.set.aiOn===0?'مُعطّل — شغّله':'مفعّل — أوقفه';};
  aiTest=async function(){const el=document.getElementById('aiTest');el.textContent='جارٍ تجربة المعلّم…';try{const r=await aiCall('قل مرحبًا بالصينية مع البينيين والمعنى.',{turns:[]});el.textContent=r.text;}catch(e){el.textContent=AI_ERRS[e.code]||AI_ERRS.http;}};
  paintChat();context();
  new MutationObserver(()=>{if(!panel.hidden)context();}).observe(document.querySelector('main')||document.getElementById('pg-vocab'),{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
})();
