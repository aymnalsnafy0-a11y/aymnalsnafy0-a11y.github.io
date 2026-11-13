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
    ? "Microphone use was not permitted. Allow the site to use the microphone from your browser settings (the lock icon next to the address)."
    : "The microphone on this device could not be turned on.";

  /* ---------- تقييم النطق ---------- */
  const sheet = document.createElement('div');
  sheet.className = 'modal'; sheet.id = 'mdPron';
  sheet.innerHTML = "<div class=\"sheet pron-sheet\"><h3><span>🎤 Evaluate my pronunciation</span><button class=\"btn o sm\" data-close>Close ✕</button></h3><div id=\"pronBody\"></div></div>";
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
      <div class="pron-target"><div class="hz">${e(P.hz)}</div>${P.py ? `<div class="pron-py">${e(P.py)}</div>` : ''}\n        <button class=\"btn o sm\" id=\"pronListen\">🔊 Listen to the correct pronunciation</button>\n        ${hist != null ? `<div class=\"sml muted\">Previous best result: ${hist}/100</div>` : ''}</div>
      ${needKey ? `<div class=\"note\"><b>Evaluation requires an intelligent teacher</b>Activate it once with your free Gemini key.<div style=\"margin-top:6px\"><button class=\"btn sm\" onclick=\"closeModal('mdPron');openModal('mdAI')\">🤖 Activate</button></div></div>` : `
      <button class="pron-mic ${Rec.active?'on':''}" id="pronMic" ${P.busy?'disabled':''}>${Rec.active ? "⏹ Stop recording" : (P.busy ? "⏳ The teacher is listening..." : "🎤 Press and speak")}</button>\n      <div class=\"pron-meter\"><i id=\"pronLvl\"></i></div>\n      <p class=\"sml muted\" style=\"text-align:center;margin:4px 0 0\">Listen first, then press the microphone and speak clearly, then press Stop.</p>`}
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
    if(a.secs < 0.4){ pronPaint("<div class=\"note r\">The recording is very short — press and speak.</div>"); return; }
    P.busy = true; P.rec = a; pronPaint("<div class=\"note b\">⏳ Your pronunciation is being analyzed...</div>");
    const sys = "You are a Chinese (Mandarin) pronunciation expert evaluating a beginning English student. Listen to the recording and carefully compare it with the required text: consonant and vowel sounds, especially the four tones and the light tone. Be honest, accurate and kind. Return JSON only.";
    const prompt = `Required text: ${P.hz}${P.py ? "\nThe correct pinyin: " + P.py : ''}\n`
      + "Rate the recording: score from 0 to 100. heard = what you actually heard in pinyin with tone marks. syllables = for each letter: hz, expected (correct pinyin), heard (what I heard), ok, and tip A very short English tip if it is wrong (eg: the third tone goes down and then goes up). summary = two sentences in English: What the student did well and the most important thing he did well. If the recording is silent or has no text, set the score to zero and say so.";
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
        <div class="pron-syl">${(d.syllables||[]).map(s=>`<div class="${s.ok?'ok':'no'}"><span class="hz">${e(s.hz)}</span><span>${e(s.expected)}</span>${s.ok?'':`<span class=\"heard\">I heard: ${e(s.heard)}</span>`}${!s.ok && s.tip ? `<small>${e(s.tip)}</small>` : ''}</div>`).join('')}</div>
        <p>${e(d.summary||'')}</p>\n        <div class=\"row eq\"><button class=\"btn o sm\" id=\"pronMine\">▶ Listen to your recording</button><button class=\"btn o sm\" id=\"pronModel\">🔊 Correct pronunciation</button></div></div>`);
      document.getElementById('pronMine').onclick = () => new Audio(P.rec.url).play();
      document.getElementById('pronModel').onclick = () => speak(P.hz);
    }catch(err){
      P.busy = false;
      pronPaint(`<div class="note r">${e((typeof AI_ERRS!=='undefined' && AI_ERRS[err.code]) || "Unable to evaluate now. Try again.")}</div>`);
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
    mic.type = 'button'; mic.className = 'btn o voice-mic'; mic.title = "Talk to the teacher"; mic.textContent = '🎙';
    inp.parentNode.insertBefore(mic, inp);
    const PH = "Ask the teacher..."; inp.placeholder = PH;
    const tools = document.createElement('div'); tools.className = 'tutor-voice';
    tools.innerHTML = `<label><input type=\"checkbox\" id=\"tutorSpeak\"> 🔊 Speak the teacher’s responses</label>\n      <select id=\"rolePick\" aria-label=\"Role playing\"><option value=\"\">🎭 Role playing...</option>\n        <option value=\"market\">In the market: You are the customer</option><option value=\"restaurant\">In the restaurant: You ask for food</option>\n        <option value=\"meet\">Dating at university</option><option value=\"taxi\">in the taxi</option><option value=\"phone\">A call with a friend</option>\n        <option value=\"stop\">⏹ End the role-playing</option></select>`;
    panel.querySelector('.tutor-actions').after(tools);
    const spk = tools.querySelector('#tutorSpeak'); spk.checked = !!state.set.tutorSpeak;
    spk.onchange = () => { state.set.tutorSpeak = spk.checked; save(); };

    const ROLES = {
      market: "You are a fruit and clothing seller in a Chinese market. The student is a customer. Start with a greeting and a question: What do you want to buy?",
      restaurant: "You are a waiter in a Chinese restaurant. The student is a customer. Start by saying hello and ask him what he wants to eat or drink.",
      meet: "You are a Chinese student meeting the student for the first time at the university. Start by greeting him and asking him his name and country.",
      taxi: "You are a taxi driver in Beijing. The student is riding. Ask him where he's going.",
      phone: "You are a Chinese friend calling the student. Start with 喂 and ask him what he is doing now."
    };
    const roleSys = () => state.set.role && ROLES[state.set.role]
      ? `\nRole playing: ${ROLES[state.set.role]} Speak very short HSK Level 1 Chinese sentences and student lesson words, one line at a time, then write the pinyin and the English translation underneath. If the student makes a mistake, gently correct him in a short English line, then complete the turn. Suggest to the student what he could say if he hesitates.` : '';
    const rp = tools.querySelector('#rolePick');
    const paintRole = () => { rp.value = ''; rp.options[0].textContent = state.set.role ? '🎭 ' + rp.querySelector(`option[value="${state.set.role}"]`).textContent : "🎭 Role playing..."; };
    paintRole();
    rp.onchange = () => {
      const v = rp.value; if(!v) return;
      if(v === 'stop'){ state.set.role = ''; save(); paintRole(); chatAdd('a', "<p>The role-playing is over. I did well! 👏</p>"); return; }
      state.set.role = v; save(); paintRole();
      tutorAsk("Let's start role-playing now. Start with the first sentence.");
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
      if(typeof aiReady === 'function' && !aiReady()){ chatAdd('a', "<p>Voice chat requires a smart teacher.</p><div class=\"trow\">" + actBtn("🤖 Activate the smart teacher",'ai','') + '</div>'); return; }
      try{ stopChineseAudio(); vr = await Rec.start(30); vr.onmax = sendVoice; mic.classList.add('rec'); mic.textContent = '⏹'; inp.placeholder = "🎙 I am recording… ⏹ to send"; }
      catch(err){ toast(micError(err)); }
    };
    async function sendVoice(){
      const a = Rec.stop(); vr = null; mic.classList.remove('rec'); mic.textContent = '🎙'; inp.placeholder = PH;
      if(!a || a.secs < 0.4){ toast("The recording is very short"); return; }
      chatAdd('u', `🎙 Voice message (${a.secs.toFixed(1)} s) <audio controls src=\"${a.url}" style="max-width:100%;height:32px;vertical-align:middle"></audio>`);
      typingOn();
      try{
        const sys = (typeof tutorSystem === 'function' ? tutorSystem() : '') + roleSys()
          + "\nThe student sent a voice message (in English, Chinese, or a mixture). Understand it and answer it. If he speaks in Chinese: Make the intro start with “I heard you say:” and put what he said as the first item in the items, and correct his pronunciation or grammar briefly if necessary. Don't use Markdown.";
        const r = await aiCall("(Voice message from the student - listen to it)", {system: sys + (window.TUTOR_BLOCK_RULES || ''), noRole: true, turns: aiTurns(12).concat([{role:'u', text:"(Voice message from the student - listen to it)"}]), skipUser: true, images: [{mime:'audio/wav', b64: a.b64}], schema: window.TUTOR_BLOCKS_SCHEMA, max: 3000, timeout: 35000, deadline: 60000});
        let html; try{ html = renderBlocks(JSON.parse(r.text)); if(!html) throw 0; }catch(_){ html = chatFmt(r.text.replace(/\n\s*\n+/g, '\n').trim()); }
        typingOff(); chatAdd('a', html + (typeof aiFoot === 'function' ? aiFoot() : ''));
      }catch(err){ typingOff(); chatAdd('a', '<p>' + e((AI_ERRS && AI_ERRS[err.code]) || "The voice message could not be sent.") + '</p>'); }
    }
  }
})();
