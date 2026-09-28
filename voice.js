/* الصوت التفاعلي: مسجّل WAV، تقييم النطق بالميكروفون، والمحادثة الصوتية مع المعلّم ولعب الأدوار. */
(function(){
  'use strict';
  const e = s => (typeof esc === 'function' ? esc(s) : String(s));

  /* ---------- مسجّل WAV (16kHz أحادي) — الصيغة التي يقبلها Gemini ---------- */
  const Rec = {
    active: null,
    async start(maxSec){
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
      const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true, channelCount:1}});
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const src = ctx.createMediaStreamSource(stream);
      const node = ctx.createScriptProcessor(4096, 1, 1);
      const chunks = []; let level = 0;
      node.onaudioprocess = ev => {
        const d = ev.inputBuffer.getChannelData(0); chunks.push(new Float32Array(d));
        let m = 0; for(let i=0;i<d.length;i+=64) m = Math.max(m, Math.abs(d[i])); level = m;
      };
      src.connect(node); node.connect(ctx.destination);
      const rec = {stream, ctx, src, node, chunks, rate: ctx.sampleRate, t0: Date.now(), level: () => level};
      rec.timer = setTimeout(() => { if(Rec.active === rec && rec.onmax) rec.onmax(); }, (maxSec || 8) * 1000);
      Rec.active = rec; return rec;
    },
    stop(){
      const r = Rec.active; if(!r) return null; Rec.active = null; clearTimeout(r.timer);
      try{ r.node.disconnect(); r.src.disconnect(); }catch(_){}
      r.stream.getTracks().forEach(t => t.stop()); try{ r.ctx.close(); }catch(_){}
      const len = r.chunks.reduce((a,c)=>a+c.length, 0), all = new Float32Array(len); let o = 0;
      r.chunks.forEach(c => { all.set(c, o); o += c.length; });
      // تحويل إلى 16kHz
      const ratio = r.rate / 16000, n = Math.floor(all.length / ratio), pcm = new Int16Array(n);
      for(let i=0;i<n;i++){ const s = Math.max(-1, Math.min(1, all[Math.floor(i*ratio)])); pcm[i] = s < 0 ? s*0x8000 : s*0x7FFF; }
      const buf = new ArrayBuffer(44 + pcm.length*2), v = new DataView(buf);
      const w = (p, s) => { for(let i=0;i<s.length;i++) v.setUint8(p+i, s.charCodeAt(i)); };
      w(0,'RIFF'); v.setUint32(4, 36 + pcm.length*2, true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true);
      v.setUint32(24,16000,true); v.setUint32(28,32000,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40, pcm.length*2, true);
      new Int16Array(buf, 44).set(pcm);
      const bytes = new Uint8Array(buf); let bin = '';
      for(let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
      return { b64: btoa(bin), url: URL.createObjectURL(new Blob([buf], {type:'audio/wav'})), secs: n/16000 };
    }
  };
  window.VoiceRec = Rec;
  const micError = err => err && err.name === 'NotAllowedError'
    ? 'لم يُسمح باستخدام الميكروفون. اسمح للموقع بالميكروفون من إعدادات المتصفح (رمز القفل بجانب العنوان).'
    : 'تعذّر تشغيل الميكروفون على هذا الجهاز.';

  /* ---------- تقييم النطق ---------- */
  const sheet = document.createElement('div');
  sheet.className = 'modal'; sheet.id = 'mdPron';
  sheet.innerHTML = '<div class="sheet pron-sheet"><h3><span>🎤 قيّم نطقي</span><button class="btn o sm" data-close>إغلاق ✕</button></h3><div id="pronBody"></div></div>';
  document.body.appendChild(sheet);
  sheet.querySelector('[data-close]').onclick = () => { if(Rec.active) Rec.stop(); closeModal('mdPron'); };
  sheet.addEventListener('click', ev => { if(ev.target === sheet){ if(Rec.active) Rec.stop(); } });

  const PRON_SCHEMA = { type:'object', required:['score','heard','syllables','summary'], properties:{
    score:{type:'integer'}, heard:{type:'string'}, summary:{type:'string'},
    syllables:{type:'array', items:{type:'object', required:['hz','expected','heard','ok'], properties:{
      hz:{type:'string'}, expected:{type:'string'}, heard:{type:'string'}, ok:{type:'boolean'}, tip:{type:'string'} }}} }};
  let P = null; // {hz, py, rec, busy}
  function pronOpen(hz, py){
    P = {hz: String(hz||'').trim(), py: String(py||'').trim()};
    openModal('mdPron'); pronPaint();
  }
  window.pronCheck = pronOpen;
  function pronPaint(result){
    const b = document.getElementById('pronBody'); if(!b || !P) return;
    const hist = (state.pron || {})[P.hz];
    const needKey = typeof aiReady === 'function' && !aiReady();
    b.innerHTML = `
      <div class="pron-target"><div class="hz">${e(P.hz)}</div>${P.py ? `<div class="pron-py">${e(P.py)}</div>` : ''}
        <button class="btn o sm" id="pronListen">🔊 اسمع النطق الصحيح</button>
        ${hist != null ? `<div class="sml muted">أفضل نتيجة سابقة: ${hist}/100</div>` : ''}</div>
      ${needKey ? `<div class="note"><b>التقييم يحتاج المعلّم الذكي</b>فعّله مرة واحدة بمفتاح Gemini المجاني.<div style="margin-top:6px"><button class="btn sm" onclick="closeModal('mdPron');openModal('mdAI')">🤖 تفعيل</button></div></div>` : `
      <button class="pron-mic ${Rec.active?'on':''}" id="pronMic" ${P.busy?'disabled':''}>${Rec.active ? '⏹ أوقف التسجيل' : (P.busy ? '⏳ المعلّم يستمع…' : '🎤 اضغط وانطق')}</button>
      <div class="pron-meter"><i id="pronLvl"></i></div>
      <p class="sml muted" style="text-align:center;margin:4px 0 0">اسمع أولًا، ثم اضغط الميكروفون وانطق بوضوح، ثم اضغط إيقاف.</p>`}
      <div id="pronResult">${result || ''}</div>`;
    b.querySelector('#pronListen').onclick = () => speak(P.hz);
    const mic = b.querySelector('#pronMic'); if(mic) mic.onclick = pronToggle;
  }
  async function pronToggle(){
    if(P.busy) return;
    if(Rec.active){ return pronFinish(); }
    try{
      stopChineseAudio();
      const r = await Rec.start(8); r.onmax = pronFinish; pronPaint();
      const lv = () => { const el = document.getElementById('pronLvl'); if(!Rec.active || !el) return; el.style.width = Math.min(100, Rec.active.level()*260) + '%'; requestAnimationFrame(lv); }; lv();
    }catch(err){ document.getElementById('pronResult').innerHTML = `<div class="note r">${e(micError(err))}</div>`; }
  }
  async function pronFinish(){
    const a = Rec.stop(); if(!a) return;
    if(a.secs < 0.4){ pronPaint('<div class="note r">التسجيل قصير جدًا — اضغط ثم انطق.</div>'); return; }
    P.busy = true; P.rec = a; pronPaint('<div class="note b">⏳ جارٍ تحليل نطقك…</div>');
    const sys = 'أنت خبير نطق صيني (ماندرين) تُقيّم طالبًا عربيًا مبتدئًا. استمع للتسجيل وقارنه بالنص المطلوب بدقة: الأصوات الساكنة والمتحركة وخاصة النغمات الأربع والنغمة الخفيفة. كن صادقًا ودقيقًا ولطيفًا. أعد JSON فقط.';
    const prompt = `النص المطلوب: ${P.hz}${P.py ? '\nالبينيين الصحيح: ' + P.py : ''}\n`
      + 'قيّم التسجيل: score من 0 إلى 100. heard = ما سمعته فعلًا بالبينيين بعلامات النغمة. syllables = لكل حرف: hz، expected (البينيين الصحيح)، heard (ما سمعته)، ok، وtip نصيحة عربية قصيرة جدًا إن كان خطأ (مثل: النغمة الثالثة تنزل ثم تصعد). summary = جملتان بالعربية: ما أجاده الطالب وأهم شيء يصلحه. إذا كان التسجيل صامتًا أو لا يحتوي النص فاجعل score صفرًا وقل ذلك.';
    try{
      const r = await aiCall(prompt, {system: sys, turns: [], images: [{mime:'audio/wav', b64: a.b64}], schema: PRON_SCHEMA, temp: 0.1, max: 2500, timeout: 35000, deadline: 60000});
      let d; try{ d = JSON.parse(r.text); }catch(_){ throw AIErr('parse'); }
      const sc = Math.max(0, Math.min(100, Math.round(Number(d.score)||0)));
      state.pron = state.pron || {}; state.pron[P.hz] = Math.max(sc, state.pron[P.hz] || 0);
      state.pronLog = (state.pronLog || []).concat({hz:P.hz, s:sc, at:Date.now()}).slice(-200); save();
      touchStreak && touchStreak();
      const col = sc >= 85 ? 'g' : sc >= 60 ? 'b' : 'r';
      P.busy = false;
      pronPaint(`<div class="note ${col} pron-res"><div class="pron-score">${sc}<small>/100</small></div>
        <div class="pron-syl">${(d.syllables||[]).map(s=>`<div class="${s.ok?'ok':'no'}"><span class="hz">${e(s.hz)}</span><span>${e(s.expected)}</span>${s.ok?'':`<span class="heard">سمعت: ${e(s.heard)}</span>`}${!s.ok && s.tip ? `<small>${e(s.tip)}</small>` : ''}</div>`).join('')}</div>
        <p>${e(d.summary||'')}</p>
        <div class="row eq"><button class="btn o sm" id="pronMine">▶ اسمع تسجيلك</button><button class="btn o sm" id="pronModel">🔊 النطق الصحيح</button></div></div>`);
      document.getElementById('pronMine').onclick = () => new Audio(P.rec.url).play();
      document.getElementById('pronModel').onclick = () => speak(P.hz);
    }catch(err){
      P.busy = false;
      pronPaint(`<div class="note r">${e((typeof AI_ERRS!=='undefined' && AI_ERRS[err.code]) || 'تعذّر التقييم الآن. حاول مجددًا.')}</div>`);
    }
  }
  // زر 🎤 في أي مكان: data-pron="النص" data-py="البينيين"
  document.addEventListener('click', ev => {
    const b = ev.target.closest('[data-pron]'); if(!b) return;
    ev.preventDefault(); ev.stopPropagation(); pronOpen(b.dataset.pron, b.dataset.py || '');
  }, true);

  /* ---------- المحادثة الصوتية مع المعلّم ولعب الأدوار ---------- */
  const panel = document.getElementById('tutorPanel');
  const bar = document.getElementById('chatBar');
  if(panel && bar){
    const inp = document.getElementById('chatIn');
    const mic = document.createElement('button');
    mic.type = 'button'; mic.className = 'btn o voice-mic'; mic.title = 'تكلّم مع المعلّم'; mic.textContent = '🎙';
    inp.parentNode.insertBefore(mic, inp);
    const PH = 'اسأل المعلّم…'; inp.placeholder = PH;
    const tools = document.createElement('div'); tools.className = 'tutor-voice';
    tools.innerHTML = `<label><input type="checkbox" id="tutorSpeak"> 🔊 انطق ردود المعلّم</label>
      <select id="rolePick" aria-label="لعب الأدوار"><option value="">🎭 لعب أدوار…</option>
        <option value="market">في السوق: أنت الزبون</option><option value="restaurant">في المطعم: تطلب الأكل</option>
        <option value="meet">التعارف في الجامعة</option><option value="taxi">في التاكسي</option><option value="phone">مكالمة مع صديق</option>
        <option value="stop">⏹ إنهاء لعب الأدوار</option></select>`;
    panel.querySelector('.tutor-actions').after(tools);
    const spk = tools.querySelector('#tutorSpeak'); spk.checked = !!state.set.tutorSpeak;
    spk.onchange = () => { state.set.tutorSpeak = spk.checked; save(); };

    const ROLES = {
      market: 'أنت بائع فواكه وملابس في سوق صيني. الطالب زبون. ابدأ بتحية وسؤال: ماذا تريد أن تشتري؟',
      restaurant: 'أنت نادل في مطعم صيني. الطالب زبون. ابدأ بالترحيب واسأله ماذا يريد أن يأكل أو يشرب.',
      meet: 'أنت طالب صيني تلتقي الطالب لأول مرة في الجامعة. ابدأ بالتحية واسأله عن اسمه وبلده.',
      taxi: 'أنت سائق تاكسي في بكين. الطالب راكب. اسأله إلى أين يذهب.',
      phone: 'أنت صديق صيني يتصل بالطالب. ابدأ بـ 喂 واسأله ماذا يفعل الآن.'
    };
    const roleSys = () => state.set.role && ROLES[state.set.role]
      ? `\nلعب أدوار: ${ROLES[state.set.role]} تكلّم بالصينية بجمل قصيرة جدًا من مستوى HSK 1 ومن كلمات دروس الطالب، سطرًا واحدًا في كل مرة، ثم اكتب تحته البينيين والترجمة العربية. إذا أخطأ الطالب فصحّحه بلطف في سطر عربي قصير ثم أكمل الدور. اقترح على الطالب ما يمكن أن يقوله إذا تردّد.` : '';
    const rp = tools.querySelector('#rolePick');
    const paintRole = () => { rp.value = ''; rp.options[0].textContent = state.set.role ? '🎭 ' + rp.querySelector(`option[value="${state.set.role}"]`).textContent : '🎭 لعب أدوار…'; };
    paintRole();
    rp.onchange = () => {
      const v = rp.value; if(!v) return;
      if(v === 'stop'){ state.set.role = ''; save(); paintRole(); chatAdd('a', '<p>انتهى لعب الأدوار. أحسنت! 👏</p>'); return; }
      state.set.role = v; save(); paintRole();
      tutorAsk('لنبدأ لعب الأدوار الآن. ابدأ أنت بأول جملة.');
    };
    // تمرير تعليمات لعب الأدوار للمعلّم
    const baseAsk = aiCall;
    aiCall = function(text, opts){
      opts = Object.assign({}, opts || {});
      if(state.set.role && opts.system && !opts.noRole) opts.system += roleSys();
      return baseAsk(text, opts);
    };
    aiAsk = aiCall;

    // نطق الرد تلقائيًا: الجمل الصينية بصوت عصبي إن وُجد، وإلا صوت الجهاز
    const baseChatAdd = chatAdd;
    chatAdd = function(role, html){
      const r = baseChatAdd.apply(this, arguments);
      if(role === 'a' && state.set.tutorSpeak){
        const zh = (String(html).replace(/<[^>]+>/g,' ').match(/[一-鿿][一-鿿，。？！、]*/g) || []).filter(s => s.length > 0).slice(0, 6);
        (async () => { for(const s of zh){ await playText(s, 'zh', Number(state.set.rate)||0.9); } })();
      }
      return r;
    };

    // التسجيل الصوتي كرسالة للمعلّم
    let vr = null;
    mic.onclick = async () => {
      if(Rec.active && vr){ return sendVoice(); }
      if(typeof aiReady === 'function' && !aiReady()){ chatAdd('a', '<p>المحادثة الصوتية تحتاج المعلّم الذكي.</p><div class="trow">' + actBtn('🤖 فعّل المعلّم الذكي','ai','') + '</div>'); return; }
      try{ stopChineseAudio(); vr = await Rec.start(30); vr.onmax = sendVoice; mic.classList.add('rec'); mic.textContent = '⏹'; inp.placeholder = '🎙 أسجّل… ⏹ للإرسال'; }
      catch(err){ toast(micError(err)); }
    };
    async function sendVoice(){
      const a = Rec.stop(); vr = null; mic.classList.remove('rec'); mic.textContent = '🎙'; inp.placeholder = PH;
      if(!a || a.secs < 0.4){ toast('التسجيل قصير جدًا'); return; }
      chatAdd('u', `🎙 رسالة صوتية (${a.secs.toFixed(1)} ث) <audio controls src="${a.url}" style="max-width:100%;height:32px;vertical-align:middle"></audio>`);
      typingOn();
      try{
        const sys = (typeof tutorSystem === 'function' ? tutorSystem() : '') + roleSys()
          + '\nالطالب أرسل رسالة صوتية (بالعربية أو الصينية أو خليط). افهمها وأجب عنها. إذا تكلّم بالصينية: اجعل intro يبدأ بـ «سمعتك تقول:» وضع ما قاله كأول عنصر في items، وصحّح نطقه أو قواعده باختصار إن لزم. لا تستخدم Markdown.';
        const r = await aiCall('(رسالة صوتية من الطالب — استمع إليها)', {system: sys + (window.TUTOR_BLOCK_RULES || ''), noRole: true, turns: aiTurns(12).concat([{role:'u', text:'(رسالة صوتية من الطالب — استمع إليها)'}]), skipUser: true, images: [{mime:'audio/wav', b64: a.b64}], schema: window.TUTOR_BLOCKS_SCHEMA, max: 3000, timeout: 35000, deadline: 60000});
        let html; try{ html = renderBlocks(JSON.parse(r.text)); if(!html) throw 0; }catch(_){ html = chatFmt(r.text.replace(/\n\s*\n+/g, '\n').trim()); }
        typingOff(); chatAdd('a', html + (typeof aiFoot === 'function' ? aiFoot() : ''));
      }catch(err){ typingOff(); chatAdd('a', '<p>' + e((AI_ERRS && AI_ERRS[err.code]) || 'تعذّر إرسال الرسالة الصوتية.') + '</p>'); }
    }
  }
})();
