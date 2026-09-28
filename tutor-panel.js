/* Shared teacher: server credential, existing lesson tools and device-local memory. */
(function(){
  'use strict';
  const panel=document.createElement('aside');
  panel.id='tutorPanel';panel.className='tutor-panel';panel.hidden=true;panel.dir='rtl';
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','معلّم الصينية');
  panel.innerHTML='<header class="tutor-head" title="اسحب من هنا لتحريك النافذة"><strong>老师 · معلّمك</strong><div><button type="button" id="tutorClear" title="مسح المحادثة">محادثة جديدة</button> <button type="button" id="tutorFull" title="ملء الشاشة" aria-label="ملء الشاشة">⛶</button> <button type="button" id="tutorClose" aria-label="إغلاق المعلّم">✕</button></div></header><div class="tutor-context" id="tutorContext"></div><div class="tutor-actions"><button type="button" data-tutor-question="اشرح لي ما أذاكره الآن مع مثال والبينيين">اشرح الحالي</button><button type="button" data-tutor-question="اختبرني بسؤال واحد من درسي وانتظر إجابتي">اختبرني</button><button type="button" data-tutor-question="ساعدني أحفظ شكل الحرف الحالي بحيلة بصرية، وميّزها عن أصل الحرف">ساعدني أحفظ</button></div>';
  document.body.appendChild(panel);
  const log=document.getElementById('chatLog'),bar=document.getElementById('chatBar');
  panel.append(log,bar);log.setAttribute('aria-live','polite');log.setAttribute('aria-relevant','additions');
  const fab=document.querySelector('.fab');fab.textContent='💬';fab.setAttribute('aria-label','المعلّم');fab.setAttribute('aria-controls','tutorPanel');fab.setAttribute('aria-expanded','false');
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
  fitChatBar=function(){
    if(!window.visualViewport)return;const vv=window.visualViewport;
    if(panel.classList.contains('is-full')){panel.style.maxHeight=vv.height+'px';panel.style.height=vv.height+'px';panel.style.top=vv.offsetTop+'px';return;}
    if(panel.classList.contains('is-moved')){const top=panel.getBoundingClientRect().top;panel.style.maxHeight=Math.max(160,vv.height+vv.offsetTop-top-8)+'px';return;}
    const gap=Math.max(0,window.innerHeight-vv.height-vv.offsetTop);panel.style.bottom=gap>100?(gap+8)+'px':'';panel.style.maxHeight=Math.max(140,vv.height-(gap>100?20:165))+'px';};
  /* نافذة المعلّم: ملء الشاشة، والسحب من الشريط العلوي، ويُحفظ المكان والحجم */
  const head=panel.querySelector('.tutor-head'),fullBtn=document.getElementById('tutorFull');
  function panelSave(){
    const full=panel.classList.contains('is-full');
    if(full){state.set.tutorWin=Object.assign({},state.set.tutorWin||{},{full:true});save();return;}
    const b=panel.getBoundingClientRect();state.set.tutorWin={full:false,moved:panel.classList.contains('is-moved'),x:b.left,y:b.top,w:b.width,h:b.height};save();}
  function placePanel(x,y){
    const b=panel.getBoundingClientRect();
    x=Math.max(4,Math.min(window.innerWidth-Math.min(b.width,window.innerWidth)-4,x));
    y=Math.max(4,Math.min(window.innerHeight-60,y));
    panel.classList.add('is-moved');panel.style.insetInlineStart='auto';panel.style.right='auto';panel.style.bottom='auto';panel.style.left=x+'px';panel.style.top=y+'px';
    panel.style.maxHeight=Math.max(160,window.innerHeight-y-8)+'px';
  }
  function setFull(on,persist){
    panel.classList.toggle('is-full',on);fullBtn.textContent=on?'🗗':'⛶';fullBtn.title=on?'تصغير النافذة':'ملء الشاشة';fullBtn.setAttribute('aria-label',fullBtn.title);
    if(on){panel.style.maxHeight='';panel.style.height='';}else{panel.style.top='';panel.style.height='';restorePanel(false);}
    fitChatBar();scroll();if(persist)panelSave();
  }
  function restorePanel(withFull){
    const t=state.set.tutorWin;if(!t)return;
    if(withFull&&t.full){setFull(true,false);return;}
    if(t.w&&t.h&&window.innerWidth>600){panel.style.width=Math.min(t.w,window.innerWidth-8)+'px';panel.style.height=Math.min(t.h,window.innerHeight-8)+'px';}
    if(t.moved)placePanel(t.x,t.y);
  }
  fullBtn.onclick=()=>setFull(!panel.classList.contains('is-full'),true);
  head.addEventListener('dblclick',e=>{if(!e.target.closest('button'))setFull(!panel.classList.contains('is-full'),true);});
  let pdrag=null;
  head.addEventListener('pointerdown',e=>{
    if(e.button!==0||!e.isPrimary||e.target.closest('button')||panel.classList.contains('is-full'))return;
    const b=panel.getBoundingClientRect();pdrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left,top:b.top,moved:false};head.setPointerCapture(e.pointerId);
  });
  head.addEventListener('pointermove',e=>{
    if(!pdrag||pdrag.id!==e.pointerId)return;const dx=e.clientX-pdrag.x,dy=e.clientY-pdrag.y;
    if(!pdrag.moved&&Math.hypot(dx,dy)<6)return;pdrag.moved=true;e.preventDefault();panel.classList.add('is-dragging');placePanel(pdrag.left+dx,pdrag.top+dy);
  });
  function endPanelDrag(e){if(!pdrag||pdrag.id!==e.pointerId)return;if(pdrag.moved)panelSave();pdrag=null;panel.classList.remove('is-dragging');if(head.hasPointerCapture(e.pointerId))head.releasePointerCapture(e.pointerId);}
  head.addEventListener('pointerup',endPanelDrag);head.addEventListener('pointercancel',endPanelDrag);
  if(window.ResizeObserver){let rt=0;new ResizeObserver(()=>{if(panel.hidden||panel.classList.contains('is-full'))return;clearTimeout(rt);rt=setTimeout(panelSave,400);}).observe(panel);}
  window.addEventListener('resize',()=>{if(!panel.hidden&&panel.classList.contains('is-moved')&&!panel.classList.contains('is-full')){const b=panel.getBoundingClientRect();placePanel(b.left,b.top);}});
  restorePanel(true);
  /* على chatgpt.site يوجد خادم /api/tutor بمفتاح مشترك. في أي موقع آخر (مثل GitHub Pages)
     لا يوجد خادم، فيتصل المعلّم بـ Gemini مباشرة بمفتاح الطالب المجاني المحفوظ في جهازه. */
  const SERVER=/(^|\.)chatgpt\.site$/.test(location.hostname);
  const direct={call:aiCall,ready:aiReady,model:aiModel,paint:aiPaint,test:aiTest};
  aiFoot=()=>'<div class="tles">🤖 معلّمك الذكي · Gemini</div>';
  if(SERVER){
  aiReady=()=>state.set.aiOn!==0;
  aiModel=()=> 'gemini-3.8-flash';
  AI_ERRS.nokey='المعلّم غير مفعّل على الخادم بعد.';
  AI_ERRS.badkey='تعذّر اتصال المعلّم بحساب Google. يلزم تحديث مفتاح الخادم.';
  AI_ERRS.quota='وصلنا لحد الاستخدام المتاح حاليًا. جرّب لاحقًا؛ تقدر تواصل مذاكرة الدروس المحفوظة.';
  AI_ERRS.model='نموذج المعلّم غير متاح حاليًا. جرّب لاحقًا.';
  aiCall=async function(text,opts){
    opts=opts||{};
    if(navigator.onLine===false)throw AIErr('offline');
    if(aiQuotaLeft()<=0)throw AIErr('cap');
    const turns=(opts.turns||aiTurns(10)).slice();
    if(!opts.skipUser && !(turns.length&&turns[turns.length-1].role==='u'&&turns[turns.length-1].text===text))turns.push({role:'u',text});
    const sys=opts.system==null?tutorSystem():opts.system;
    const body=AI_PROVIDERS.gemini.build(sys,turns,opts.images,Object.assign({},opts,{web:false}));
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),opts.timeout||65000);
    try{
      const r=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:ctl.signal});
      if(!r.ok)throw AI_PROVIDERS.gemini.fail(r.status,await r.text());
      const j=await r.json();aiCount();return {text:AI_PROVIDERS.gemini.parse(j),srcs:[]};
    }catch(e){if(e.code)throw e;throw AIErr(e.name==='AbortError'?'abort':'offline');}finally{clearTimeout(timer);}
  };
  }else{
  aiReady=direct.ready;aiModel=direct.model;aiTest=direct.test;
  AI_ERRS.nokey='المعلّم الذكي يحتاج مفتاح Gemini مجانيًا مرة واحدة فقط. اضغط «فعّل المعلّم الذكي» واتبع الخطوات (دقيقتان).';
  // النماذج القديمة (2.5) لم تعد متاحة للمفاتيح الجديدة؛ ونماذج pro غير متاحة في الخطة المجانية.
  if(!state.set.aiModel||/^gemini-(1\.|2\.)/.test(state.set.aiModel)){state.set.aiModel='gemini-flash-latest';save();}
  /* الخطة المجانية: حدّ يومي صغير (≈20 طلبًا) لكل نموذج على حدة.
     لذلك نوزّع الطلبات على كل نماذج flash المتاحة للمفتاح، ونتخطّى أي نموذج استنفد حصته حتى نهاية اليوم. */
  const BASE=['gemini-flash-latest','gemini-3.8-flash','gemini-3.7-flash','gemini-3.6-flash','gemini-3.5-flash','gemini-3-flash-preview','gemini-3.1-flash-lite','gemini-flash-lite-latest','gemini-3.5-flash-lite'];
  const SKIP=/tts|image|live|transcribe|omni|robotics|computer|embedding|audio|native/;
  const ver=m=>{const v=(m.match(/(\d+(?:\.\d+)?)/)||[0,0])[1];return /latest/.test(m)?99:Number(v);};
  async function modelList(){
    const c=state.set.aiModels;
    if(c&&c.day===today()&&c.list&&c.list.length)return c.list;
    try{
      const r=await fetch(AI_PROVIDERS.gemini.base+'models?pageSize=200',{headers:{'x-goog-api-key':aiKey()}});
      if(r.ok){const j=await r.json();const list=(j.models||[]).filter(m=>(m.supportedGenerationMethods||[]).includes('generateContent')).map(m=>m.name.replace('models/','')).filter(m=>/^gemini-.*flash/.test(m)&&!SKIP.test(m));
        if(list.length){state.set.aiModels={day:today(),list};save();return list;}}
    }catch(_){}
    return BASE;
  }
  // النماذج التي استنفدت حصتها اليوم (تُمسح تلقائيًا في يوم جديد)
  const spent=()=>{const s=state.set.aiSpent;if(!s||s.day!==today())state.set.aiSpent={day:today(),m:{}};return state.set.aiSpent.m;};
  const isDaily=e=>e&&e.code==='quota'&&(/PerDay/i.test(e.detail||'')||!/PerMinute|minute/i.test(e.detail||''));
  const retryable=e=>e&&(['model','quota','offline','abort'].includes(e.code)||/^HTTP 5\d\d/.test(e.detail||''))&&navigator.onLine!==false;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  aiCall=async function(text,opts){
    opts=Object.assign({},opts||{});
    if(opts.system==null)opts.system=tutorSystem();
    if(!opts.turns)opts.turns=aiTurns(20);
    if(opts.turns.length&&opts.turns[opts.turns.length-1].role==='u'&&opts.turns[opts.turns.length-1].text===text)opts.skipUser=true;
    const avail=await modelList();
    const lite=m=>/lite/.test(m);
    // الأقوى أولًا، ونماذج lite في النهاية (وفي مهام السمع هي آخر حل فقط)
    const pool=[opts.model||aiModel(),...BASE.filter(m=>avail.includes(m)),...avail.slice().sort((x,y)=>ver(y)-ver(x))]
      .filter((m,i,arr)=>arr.indexOf(m)===i);
    const models=pool.filter(m=>!lite(m)).concat(pool.filter(lite)).filter(m=>!spent()[m]);
    if(!models.length){const e=AIErr('quota');e.detail='daily: all models';throw e;}
    let last;
    for(const model of models){
      for(let attempt=0;attempt<2;attempt++){
        try{return await direct.call(text,Object.assign({},opts,{model}));}
        catch(e){
          last=e;if(!retryable(e))throw e;
          if(e.code==='model'){spent()[model]=1;save();break;}
          if(e.code==='quota'){if(isDaily(e)||attempt){spent()[model]=1;save();break;}await sleep(2500);continue;}
          if(attempt)break;await sleep(1200);
        }
      }
    }
    throw last;
  };
  AI_ERRS.quota='انتهت حصة Google المجانية لليوم في كل النماذج المتاحة لمفتاحك. تتجدّد تلقائيًا بعد منتصف الليل بتوقيت أمريكا (حوالي ١٠ صباحًا بتوقيت السعودية). تقدر تواصل الدروس والامتحان والإملاء بلا أي مشكلة.';
  aiPaint=function(){
    const st=document.getElementById('aiState');
    if(st&&!document.getElementById('aiKeyIn')){
      st.insertAdjacentHTML('afterend','<div class="note b" id="aiKeyBox" style="margin-top:8px"><b>تفعيل المعلّم الذكي (مجاني)</b>'
        +'١) افتح <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> وسجّل بحساب Google.<br>'
        +'٢) اضغط <span class="ltr">Create API key</span> وانسخ المفتاح.<br>٣) الصقه هنا واضغط «حفظ»، ثم «جرّب الاتصال».'
        +'<input id="aiKeyIn" type="password" dir="ltr" autocomplete="off" placeholder="AIza..." style="width:100%;margin-top:8px">'
        +'<div class="row eq" style="margin-top:6px"><button class="btn" onclick="aiSaveKey()">حفظ</button><button class="btn o" onclick="aiClearKey()">حذف المفتاح</button></div>'
        +'<label class="sml" style="display:block;margin-top:8px">النموذج (المقترح: gemini-flash-latest — نماذج pro تحتاج حسابًا مدفوعًا)<select id="aiModelSel" onchange="aiPickModel()" dir="ltr" style="width:100%"></select></label>'
        +'<p class="sml muted" style="margin:6px 0 0">المفتاح يبقى في هذا الجهاز فقط، ولا يدخل في «نسخ تقدّمي».</p></div>');
    }
    direct.paint();
  };
  }
  function tutorSystem(){
    const vocab=(W||[]).map(w=>wordHz(w)+' '+wordPy(w)+' = '+w.m).join('\n');
    const pats=(PATTERNS||[]).map(p=>p.name+' ← '+p.f).join('\n');
    const others=LESSONS.filter(l=>l!==L&&l.id!=='LX').map(l=>l.title+': '+l.words.map(wordHz).join(' ')).join('\n');
    const weak=pickWords(6,false).map(wordHz).join('، ');
    return [
      'أنت «المعلّم»: مدرّس خبير وصبور للغة الصينية، تُدرّس طالبًا عربيًا في بداية المنهج (New HSK Course 1).',
      'أسلوبك:',
      '- أجب بالعربية الواضحة، وبلا تنسيق Markdown (لا * ولا #). استخدم أسطرًا قصيرة وترقيمًا عاديًا (١، ٢، ٣) عند الحاجة.',
      '- كل كلمة أو جملة صينية: الحروف المبسّطة، ثم البينيين بعلامات النغمة، ثم المعنى بالعربية.',
      '- أجب عن أي سؤال: كلمات وجمل خارج الدروس، ترجمة من وإلى العربية، قواعد، نطق ونغمات، ترتيب ضربات الحروف، ثقافة الصين، الامتحانات، خطط مذاكرة، وحتى الأسئلة العامة. في الأسئلة العامة أجب بإيجاز ثم اربطها بالصينية إن أمكن (مثل: كيف تُقال بالصينية).',
      '- اشرح بعمق حين يُطلب الشرح: السبب، المقارنة بالعربية، الخطأ الشائع عند العرب، ومثالان. وكن مختصرًا في الأسئلة البسيطة.',
      '- عند شرح حرف: فكّكه إلى مكوّناته وأعطِ حيلة حفظ بصرية، وقل إنها حيلة للحفظ إذا لم تكن أصل الحرف التاريخي.',
      '- عند «اختبرني»: اسأل سؤالًا واحدًا فقط وانتظر، ثم صحّح إجابة الطالب بلطف واشرح الخطأ.',
      '- اربط الشرح بما درسه الطالب قدر الإمكان، وإذا استخدمت كلمة جديدة فاشرحها.',
      '- لا تخترع؛ إن لم تكن متأكدًا فقل ذلك.',
      'الدرس المختار الآن: '+(L?L.title:''),
      vocab?'مفرداته:\n'+vocab:'',
      pats?'قواعده:\n'+pats:'',
      others?'دروس أخرى درسها:\n'+others:'',
      weak?'كلمات يحتاج تقويتها: '+weak:''
    ].filter(Boolean).join('\n')+context();
  }
  aiAsk=aiCall;
  function setBusy(value){busy=value;document.getElementById('tutorClear').disabled=value;bar.querySelector('button[onclick="chatSend()"]').disabled=value;panel.querySelectorAll('[data-tutor-question]').forEach(b=>b.disabled=value);}
  /* الرد المقسّم: شرح عربي، بطاقات صينية (حروف ← بينيين ← معنى)، وتنبيهات — حتى لا يختلط اتجاه الكتابة */
  const ITEMS={type:'array',items:{type:'object',required:['zh','py','ar'],properties:{zh:{type:'string',description:'الحروف الصينية فقط'},py:{type:'string',description:'البينيين بعلامات النغمة'},ar:{type:'string',description:'المعنى بالعربية'}}}};
  const BLOCKS_PROPS={intro:{type:'string'},items:ITEMS,tips:{type:'array',items:{type:'string'}},outro:{type:'string'}};
  window.TUTOR_BLOCKS_SCHEMA={type:'object',required:['intro','items'],properties:BLOCKS_PROPS};
  window.TUTOR_BLOCK_RULES='\nشكل الرد (مهم جدًا): intro = شرح عربي قصير بلا جمل صينية. items = كل كلمة أو جملة صينية في عنصر مستقل: zh الحروف الصينية فقط (بلا بينيين ولا عربي)، py البينيين بعلامات النغمة، ar المعنى بالعربية. tips = تنبيهات أو قواعد أو أخطاء شائعة (جملة لكل تنبيه). outro = سؤال أو تشجيع قصير (اختياري). لا تكتب رموز 🔊 ولا Markdown.';
  const ZH=/([一-鿿][一-鿿　-〿！，？。、]*)/g;
  const inline=s=>esc(String(s||'').replace(/🔊/g,'')).replace(ZH,'<bdi class="hz tb-in">$1</bdi>').replace(PY_RE,m=>'<bdi class="pyx t'+tone(m)+'">'+m+'</bdi>');
  const pyLine=p=>String(p||'').replace(/[()（）]/g,'').trim().split(/\s+/).filter(Boolean).map(x=>'<span class="pyx t'+tone(x)+'">'+esc(x)+'</span>').join(' ');
  const onlyZh=s=>String(s||'').replace(/[^一-鿿　-〿！，？。、]/g,'').trim();
  function zhCard(it){
    const zh=onlyZh(it.zh); if(!zh)return it.ar?'<p class="tb-txt">'+inline(it.ar)+'</p>':'';
    return '<div class="tb-zh"><div class="tb-row"><span class="hz tb-hz" dir="ltr">'+esc(zh)+'</span><button class="cact spk" data-a="speak" data-v="'+esc(zh)+'" aria-label="استمع">🔊</button></div>'
      +(it.py?'<div class="tb-py" dir="ltr">'+pyLine(it.py)+'</div>':'')+(it.ar?'<div class="tb-ar">'+inline(it.ar)+'</div>':'')+'</div>';
  }
  window.renderBlocks=function(d){
    if(!d)return '';
    return (d.intro?'<p class="tb-txt">'+inline(d.intro)+'</p>':'')
      +(d.items||[]).map(zhCard).join('')
      +(d.tips||[]).filter(Boolean).map(x=>'<div class="tb-tip">💡 '+inline(x)+'</div>').join('')
      +(d.outro?'<p class="tb-txt">'+inline(d.outro)+'</p>':'');
  };
  const replySchema={type:'object',required:['intro','items','words'],properties:Object.assign({},BLOCKS_PROPS,{words:{type:'array',maxItems:3,items:MYWORD_SCHEMA}})};
  tutorAsk=async function(question){
    const text=String(question||'').trim().slice(0,6000);if(!text)return;
    if(busy){toast('انتظر رد المعلّم أولًا');return;}
    if(panel.hidden)open();
    setBusy(true);chatAdd('u',esc(text));
    if(!aiReady()){chatAdd('a','<p>'+esc(AI_ERRS.nokey)+'</p><div class="trow">'+actBtn('🤖 فعّل المعلّم الذكي','ai','')+'</div>'+tutorAnswer(text));setBusy(false);return;}
    typingOn();
    try{
      const sys=tutorSystem()+'\nأجب عن أي كلمة أو ترجمة يطلبها الطالب، ولو لم تكن في الدرس. أعد JSON بالمخطط الموضّح في «شكل الرد»، وwords؛ words يحتوي فقط الكلمات الأساسية التي تشرحها في هذا الرد (حتى 3) مع بياناتها الصحيحة للحفظ. لا تضف كل كلمات الأمثلة. حقل syl نطق كل حرف على حدة. حقل tr حيلة للحفظ لا ادعاء عن أصل الحرف. يجوز words فارغًا في الأسئلة العامة. لا تقل إنك حفظت الكلمات، الطالب سيضغط زر الإضافة.'+TUTOR_BLOCK_RULES;
      const r=await aiAsk(text,{system:sys,schema:replySchema,max:4096});
      let data;try{data=JSON.parse(r.text);}catch(_){throw AIErr('parse');}
      const body=(data.intro||(data.items&&data.items.length))?renderBlocks(data):(typeof data.reply==='string'&&data.reply.trim()?chatFmt(data.reply.replace(/\n\s*\n+/g,'\n').trim()):'');
      if(!body)throw AIErr('parse');
      const words=(Array.isArray(data.words)?data.words:[]).slice(0,3).map(cleanPersonalWord).filter(Boolean);
      state.tutorWordSuggestions=state.tutorWordSuggestions||{};
      for(const w of words)state.tutorWordSuggestions[w.hz]=w;
      const keys=Object.keys(state.tutorWordSuggestions);for(const key of keys.slice(0,Math.max(0,keys.length-100)))delete state.tutorWordSuggestions[key];
      typingOff();chatAdd('a',body+aiFoot()+'<div class="trow">'+words.map(w=>actBtn((state.myWords||[]).some(x=>x.hz===w.hz)?'✓ '+w.hz+' في كلماتي':'＋ أضف '+w.hz+' إلى كلماتي','add',w.hz,'g')).join('')+'</div>');
    }
    catch(e){typingOff();const available=tutorScore(text)>=70?tutorAnswer(text):'';const setup=(!SERVER&&['nokey','badkey'].includes(e.code))?actBtn('🤖 إعداد المعلّم الذكي','ai',''):'';chatAdd('a','<p>'+esc(AI_ERRS[e.code]||AI_ERRS.http)+'</p>'+(e.detail?'<p class="sml muted ltr">'+esc(e.detail)+'</p>':'')+available+'<div class="trow">'+setup+actBtn('أعد المحاولة','retry',text)+'</div>');}
    finally{setBusy(false);scroll();}
  };
  chatSend=function(){if(busy){toast('انتظر رد المعلّم أولًا');return;}const inp=document.getElementById('chatIn');const text=inp.value.trim();if(!text)return;inp.value='';tutorAsk(text);};
  if(SERVER){
  aiPaint=function(){document.getElementById('aiState').innerHTML='<div class="note g"><b>المعلّم متصل بحساب Google</b>متاح من زر «المعلّم» في كل الصفحات. يحتاج الإنترنت وتطبق حدود Google المجانية.</div>';document.getElementById('aiOnBtn').textContent=state.set.aiOn===0?'مُعطّل — شغّله':'مفعّل — أوقفه';};
  aiTest=async function(){const el=document.getElementById('aiTest');el.textContent='جارٍ تجربة المعلّم…';try{const r=await aiCall('قل مرحبًا بالصينية مع البينيين والمعنى.',{turns:[]});el.textContent=r.text;}catch(e){el.textContent=AI_ERRS[e.code]||AI_ERRS.http;}};
  }
  paintChat();context();
  new MutationObserver(()=>{if(!panel.hidden)context();}).observe(document.querySelector('main')||document.getElementById('pg-vocab'),{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
})();
