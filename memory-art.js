(function(root){
'use strict';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const groups={
 person:['你他们什件人','شخص واقف','تخيّل الجزء الملوّن جسم شخص وساقيه. لاحظ الميل والمسافة بين الخطوط.','#e8a557'],
 woman:['她妈好','شخص يجلس بذراعين متقاطعتين','اربط انعطافات الجزء الملوّن بوضعية شخص جالس، ثم طابق خطوطه.','#be75a6'],
 mouth:['吃吗哪叫名同','فم مفتوح','الإطار الصغير مثل فم مفتوح. احفظ مكانه بالنسبة لبقية الحرف.','#dc7983'],
 speech:['认识词谢请','بطاقة كلام','تخيّل الخطوط القصيرة بطاقة كلام، والخط المنحني حامل البطاقة.','#7d93df'],
 water:['没法','قطرات ماء','العلامات المنفصلة مثل ثلاث قطرات؛ احفظ اتجاهها ومكانها على الجانب.','#54a9d2'],
 tree:['本楼','شجرة','العمود جذع، والمائلان فرعان. الخطوط الملوّنة تحافظ على شكل الجزء في الرمز.','#a97747'],
 grass:['苹英','عشب صغير','الجزء العلوي يشبه عيدان عشب متجاورة. اربط العشب بمكانه فوق بقية الحرف.','#6baf69'],
 roof:['客室宿字','سقف بيت','تخيّل الخط العلوي سقفًا، وبقية الرمز أشياء تحته.','#db9971'],
 heart:['您','قلب وقطرات','تخيّل الشكل المنحني قلبًا، والنقاط الصغيرة حوله نبضات.','#d97691'],
 sun:['日是','نافذة مضيئة','الإطار والخط الداخلي يشبهان نافذة يقسمها عارض.','#d4a43e'],
 gate:['门们','باب','قائمتان تحيطان بفراغ الباب. ركّز على الخطاف في النهاية.','#b5825b'],
 rice:['米','نبتة تتشعّب','الخطوط تتشعّب من الوسط كأغصان نبتة تحمل حبوبًا.','#bd9849'],
 bridge:['工','جسر','خط علوي وسفلي يصل بينهما عمود: تخيّل جسرًا ودعامته.','#66a2ad'],
 cross:['十','طريقان يتقاطعان','خط أفقي وآخر رأسي: تقاطع طريقين. نقطة التقاطع هي علامة الحفظ.','#ca9c62'],
 shelves:['一二三','رفوف','احفظ عدد الرفوف الأفقية، وطول كل رف والمسافة بينهما.','#a78361'],
 umbrella:['个','مظلّة','المائلان سقف المظلّة والخط الرأسي عصاها.','#619fa0'],
 sign:['下','لافتة','خط أفقي فوق عمود وعلامة جانبية. تخيّل لافتة معلّقة.','#b79269'],
 dancer:['大','شخص يفتح ذراعيه','خط الذراعين فوق ساقين متباعدتين. حافظ على اتجاه الساقين.','#bc8fdb'],
 target:['中','سهم في هدف','الخط الرأسي يمرّ في وسط الإطار، كسهم يعبر هدفًا.','#d38a58'],
 book:['书','كتاب مربوط','تخيّل الانحناءات حلقات ربط كتاب؛ احفظ مواضعها مع الخط الطويل.','#80a8c1']
};
Object.assign(groups,{
 child:['学字','طفل يمدّ ذراعيه','تخيّل الجزء الملوّن طفلًا يفتح ذراعيه. اتبع الانحناء والخط العابر في الوسط.','#cf9d61'],
 plant:['生来','نبتة تطلع من الأرض','الخط الطويل ساق، والخطوط الجانبية أغصان. اربط نهاية الساق بخط الأرض.','#74a470'],
 tower:['高堂','برج بطوابق','تخيّل الإطارات نوافذ في برج، ثم احفظ ترتيبها من الأعلى إلى الأسفل.','#b29673'],
 enclosure:['图国','حديقة داخل سور','الإطار سور، والخطوط الداخلية أشياء داخل الحديقة. لا تنسَ إغلاق الإطار.','#76a692'],
 cloth:['师','قطعة قماش معلّقة','الإطار والخط النازل يشبهان قماشًا على حامل. احفظ موضع الجزء الملوّن.','#85aaca'],
 spoon:['食饭馆','ملعقة بجانب وعاء','الانحناءات والعمود تذكّر بملعقة طويلة. ركّز على الخطاف وطول العمود.','#d3a76d'],
 hand:['友对教','يد تحمل عصًا','المائلان كيد وعصا متقاطعتين. هذه حيلة للشكل وليست معنى الجزء.','#d4a07b'],
 hook:['也我气','خطاف منحني','ابدأ بعينك من رأس الخط الطويل واتبع انحناءه حتى الخطاف.','#8fa8bd'],
 walking:['起这边','طريق حول الشكل','الجزء الملوّن يلتف تحت بقية الرمز كطريق يصل إلى جانبه.','#b3a16e'],
 twins:['朋','نافذتان متجاورتان','صوّر الإطارين كنافذتين؛ لاحظ عدد الخطوط القصيرة داخل كل واحدة.','#b197bf'],
 coat:['衣服','قماش مطوي','المائلان طيّتان في قطعة قماش. احفظ اتجاه الطيات والخط الطويل.','#b995c1'],
 ladder:['五','سلّم صغير','تخيّل الخطوط المتصلة سلّمًا. احفظ اتجاه كل درجة ومكان العمود.','#bca17d'],
 ribbons:['公兴','شريطان يفتحان','المائلان يفتحان كطرفي شريط. لاحظ ما فوقهما وما تحتهما.','#c58b92'],
 beam:['士','عارضة على حامل','الخط الأفقي عارضة والعمودي حاملها. لاحظ أي الخطين الأفقيين أطول.','#9faca5']
});
// The same original paths are used in the picture and in its comparison outline.
const lookup={};Object.keys(groups).forEach(k=>Array.from(groups[k][0]).forEach(ch=>{if(!lookup[ch])lookup[ch]=k;}));
// Full-character pictures; other pictures intentionally focus on the radical only.
const whole=new Set(Array.from('人本日门米工十一二三个下大中书生来高朋衣五士也我气兴'));
const palette=['#d59151','#6aa598','#a181bf','#659cc1'];
function bounds(data,ids){
 const points=ids.flatMap(i=>data.medians && data.medians[i] || []);
 if(!points.length)return [170,100,680,730];
 const xs=points.map(p=>p[0]),ys=points.map(p=>900-p[1]);
 const x=Math.max(30,Math.min(...xs)-35),y=Math.max(30,Math.min(...ys)-35);
 return [x,y,Math.max(90,Math.max(...xs)-x+35),Math.max(110,Math.max(...ys)-y+35)];
}
function decoration(type,box){
 const [x,y,w,h]=box,inner=`translate(${x} ${y}) scale(${w/100} ${h/100})`;
 const circle=(cx,cy,r,fill)=>`<ellipse cx="${cx}" cy="${Math.max(4,cy)}" rx="${r}" ry="${r*w/h}" fill="${fill}"/>`;
 let a='';
 if(type==='person'||type==='dancer')a=circle(49,-5,9,'#f3cd9d')+'<path d="M37 22 Q49 32 65 23" fill="none" stroke="#b75c59" stroke-width="5" stroke-linecap="round"/>';
 if(type==='woman')a=circle(56,-3,8,'#f2c9ab')+'<path d="M47 -5 Q55 -18 65 -6" fill="none" stroke="#806b84" stroke-width="6"/>';
 if(type==='mouth')a='<ellipse cx="50" cy="52" rx="34" ry="25" fill="#7e4254"/><ellipse cx="50" cy="64" rx="23" ry="9" fill="#f4a7ad"/><path d="M28 35H73" stroke="#fff9ef" stroke-width="8" stroke-linecap="round"/>';
 if(type==='speech')a='<path d="M12 -10H76Q90 -10 90 4V22Q90 36 75 36H40L22 49V36H12Q0 36 0 22V4Q0 -10 12 -10Z" fill="#dce5fb" stroke="#8c9ddb" stroke-width="2"/><path d="M17 4H70M17 18H57" stroke="#9aabdf" stroke-width="3"/>';
 if(type==='water')a='<path d="M31 0Q5 25 25 36Q47 43 43 23ZM62 42Q39 66 59 78Q83 79 73 55ZM28 73Q8 92 23 100Q42 103 40 87Z" fill="#bde2ee" opacity=".8"/>';
 if(type==='tree')a='<path d="M8 21Q-5 -6 19 -10Q24 -34 47 -21Q70 -39 82 -12Q111 -6 96 22Q73 37 53 24Q30 42 8 21Z" fill="#9fc996"/><path d="M50 10V30M32 7L50 21L74 5" stroke="#709c67" fill="none" stroke-width="2"/>';
 if(type==='grass')a='<path d="M10 25Q-3 -2 15 -15Q23 4 21 25M49 25Q35 -9 52 -21Q60 0 60 25M82 25Q75 -2 99 -14Q100 7 90 25" fill="#a9d299"/>';
 if(type==='roof')a='<path d="M-8 17L50 -12L108 17" fill="#eed1ba" stroke="#bb7852" stroke-width="3"/><path d="M70 2V-14H81V8" fill="#d29b75"/>';
 if(type==='heart')a='<path d="M50 75C-19 32 5 -11 31 8Q49 20 50 30Q58 -2 81 8C117 35 84 58 50 75Z" fill="#f5cad5" opacity=".85"/>';
 if(type==='sun')a='<rect x="10" y="8" width="78" height="84" rx="3" fill="#f5deb0"/>'+circle(67,26,12,'#fff7df')+'<path d="M13 78Q30 45 47 70Q71 47 85 81" fill="#aabf9c"/>';
 if(type==='gate')a='<rect x="18" y="10" width="69" height="85" fill="#ead4ba"/>'+circle(70,54,4,'#b88546')+'<path d="M9 100H102" stroke="#c6b39a" stroke-width="4"/>';
 if(type==='rice')a='<g fill="#ead3a1"><ellipse cx="16" cy="20" rx="7" ry="12" transform="rotate(-40 16 20)"/><ellipse cx="79" cy="17" rx="7" ry="12" transform="rotate(40 79 17)"/><ellipse cx="20" cy="81" rx="7" ry="12" transform="rotate(40 20 81)"/><ellipse cx="82" cy="83" rx="7" ry="12" transform="rotate(-40 82 83)"/></g>';
 if(type==='bridge')a='<path d="M-2 81Q15 70 30 81T62 81T104 81M-2 95Q15 84 30 95T62 95T104 95" stroke="#a8d8e2" fill="none" stroke-width="4"/>';
 if(type==='cross')a='<path d="M0 49H100M50 0V100" stroke="#dfd7c6" stroke-width="23"/><path d="M0 49H100M50 0V100" stroke="#fffaf0" stroke-width="1.5" stroke-dasharray="4 5"/>';
 if(type==='shelves')a='<rect x="22" y="-40" width="15" height="39" rx="3" fill="#9cbfae"/><rect x="40" y="-30" width="12" height="29" rx="2" fill="#d7b27e"/><path d="M16 100H87" stroke="#e6dcc9" stroke-width="3"/>';
 if(type==='umbrella')a='<path d="M3 42Q46 -5 96 42Q80 31 63 44Q48 30 34 43Q15 32 3 42Z" fill="#acd1c8"/>';
 if(type==='sign')a='<rect x="23" y="18" width="62" height="24" rx="4" fill="#efd8a9"/><path d="M40 30H66L60 24M66 30L60 36" fill="none" stroke="#b38c4e" stroke-width="3"/>';
 if(type==='target')a='<ellipse cx="50" cy="50" rx="47" ry="43" fill="#f4ddc8"/><ellipse cx="50" cy="50" rx="32" ry="29" fill="#f9f0de"/><ellipse cx="50" cy="50" rx="15" ry="14" fill="#ebc3a1"/>';
 if(type==='child')a=circle(51,3,10,'#f0c6a4')+'<path d="M31 29Q47 42 69 28" fill="none" stroke="#b6d7c5" stroke-width="14"/>';
 if(type==='plant')a='<path d="M47 43Q10 46 10 19Q44 11 47 43ZM55 28Q81 -1 93 17Q82 41 55 28Z" fill="#bad5a2"/><path d="M-4 94Q43 85 104 96" stroke="#dac59a" stroke-width="6" fill="none"/>';
 if(type==='tower')a='<path d="M5 96V16L50 -5L95 16V96" fill="#e9d9bf"/><rect x="34" y="24" width="27" height="19" fill="#b6d4db"/><rect x="34" y="59" width="27" height="25" fill="#b6d4db"/>';
 if(type==='enclosure')a='<rect x="8" y="8" width="84" height="84" rx="9" fill="#dbe5cf"/><path d="M12 82Q27 55 48 76Q63 52 88 80" fill="#b2cfac"/><circle cx="77" cy="23" r="10" fill="#efd6a6"/>';
 if(type==='cloth')a='<path d="M12 9H91V93Q71 81 50 93Q30 81 12 93Z" fill="#d6e7ee"/><path d="M25 21V72M45 20V73M66 19V75M84 20V75" stroke="#acc7d6" stroke-width="2"/>';
 if(type==='spoon')a='<ellipse cx="54" cy="8" rx="18" ry="15" fill="#f0d9b3"/><path d="M22 71Q48 110 87 71Z" fill="#c5d9dc"/><ellipse cx="54" cy="71" rx="32" ry="10" fill="#e2eded"/>';
 if(type==='hand')a='<path d="M24 40Q4 20 20 13L44 36Q36 6 53 9L68 39Q88 26 93 44L65 70Q47 86 28 70Z" fill="#edd3bd"/>';
 if(type==='hook')a='<path d="M34 4H77V38Q88 65 70 82Q48 103 30 81" fill="none" stroke="#d7e2e8" stroke-width="16" stroke-linecap="round"/>';
 if(type==='walking')a='<path d="M10 15Q40 40 18 74Q22 96 98 91" fill="none" stroke="#e5d9b9" stroke-width="20" stroke-linecap="round"/><path d="M10 15Q40 40 18 74Q22 96 98 91" fill="none" stroke="#fff8e8" stroke-width="2" stroke-dasharray="5 5"/>';
 if(type==='twins')a='<rect x="2" y="3" width="37" height="91" rx="5" fill="#e3ddec"/><rect x="59" y="3" width="37" height="91" rx="5" fill="#e3ddec"/><path d="M9 22H30M66 22H87M9 57H30M66 57H87" stroke="#faf4ea" stroke-width="9"/>';
 if(type==='coat')a='<path d="M30 7L49 17L68 7L99 37L80 57L70 44V96H27V43L17 55L0 38Z" fill="#e7dced"/>';
 if(type==='ladder')a='<path d="M25 3V97M77 3V97M25 23H77M25 53H77M25 80H77" stroke="#e7d7bd" fill="none" stroke-width="12" stroke-linecap="round"/>';
 if(type==='ribbons')a='<path d="M11 1L45 50L30 96L20 75L0 82L17 44ZM91 1L59 50L73 96L83 75L101 82L88 44Z" fill="#efdae0"/>';
 if(type==='beam')a='<rect x="0" y="12" width="100" height="22" rx="5" fill="#dce6df"/><rect x="39" y="33" width="21" height="65" fill="#e4d7bf"/>';
 if(type==='book')a='<path d="M12 10Q32 3 51 14Q73 3 95 10V89Q72 82 51 94Q30 81 12 89Z" fill="#d4e6e8" stroke="#9abbc3" stroke-width="2"/><path d="M51 14V89M22 26H40M64 26H83M22 44H40M64 44H83" stroke="#a5c3c6" stroke-width="2"/>';
 return `<g transform="${inner}">${a}</g>`;
}
function render(ch,data,overlay){
 const type=lookup[ch],spec=type&&groups[type],full=whole.has(ch);
 const hasPaths=data&&Array.isArray(data.strokes)&&data.strokes.length;
 let svg='',title,caption,tag;
 if(hasPaths){
  const ids=full?data.strokes.map((_,i)=>i):data.radStrokes&&data.radStrokes.length?data.radStrokes:[];
  const usePicture=!!spec&&(full||ids.length);
  const active=new Set(ids),box=bounds(data,ids);
  title=usePicture?spec[1]:'خريطة شكل الحرف';
  caption=usePicture?spec[2]:'تتبّع مجموعات الخطوط الملوّنة كما هي: كل لون يجمع خطوطًا متجاورة. لا نفرض صورة على حرف لا يشبه شيئًا واضحًا.';
  tag=usePicture?(full?'صورة للحرف كاملًا':'صورة للجزء الملوّن من الحرف'):'مطابقة الخطوط الأصلية';
  const paths=data.strokes.map((d,i)=>`<path d="${escape(d)}" fill="${usePicture?(active.has(i)?spec[3]:'#bac4cf'):palette[Math.min(3,Math.floor(i*4/data.strokes.length))]}"/>`).join('');
  svg=`<svg viewBox="0 0 1024 1024" role="img" aria-label="${escape(ch+' — '+title)}"><rect x="12" y="12" width="1000" height="1000" rx="80" fill="#fbf7ee"/><circle cx="520" cy="440" r="386" fill="#f4edde"/>${usePicture?decoration(type,box):'<path d="M80 512H944M512 80V944" stroke="#e7decb" stroke-width="3" stroke-dasharray="12 15"/>'}<g transform="translate(0 900) scale(1 -1)">${paths}</g>${overlay?'<g transform="translate(0 900) scale(1 -1)" fill="none" stroke="#b33140" stroke-width="5" stroke-linejoin="round">'+data.strokes.map(d=>'<path d="'+escape(d)+'"/>').join('')+'</g>':''}</svg>`;
 }else{
  title='شكل الحرف';caption='تأمّل شكل الحرف، ثم افتح «اكتب الرمز» لمشاهدة ترتيب الخطوات إن توفرت بياناته.';tag='الحرف الأصلي';
  svg=`<svg viewBox="0 0 1024 1024" role="img" aria-label="${escape(ch)}"><rect x="12" y="12" width="1000" height="1000" rx="80" fill="#fbf7ee"/><text x="512" y="735" text-anchor="middle" font-size="730" font-family="Microsoft YaHei, PingFang SC, sans-serif" fill="#729dac" ${overlay?'stroke="#b33140" stroke-width="3"':''}>${escape(ch)}</text></svg>`;
 }
 return `<div class="memory-visual">${svg}<span class="memory-glyph" aria-hidden="true">${escape(ch)}</span></div><div class="memory-caption"><span class="memory-kind">${tag}</span><h3>${title}</h3><p>${caption}</p>${overlay?'<p class="memory-match">الحدود الحمراء تطابق خطوط الحرف الأصلية.</p>':''}</div>`;
}
root.HanziMemory={render};
})(window);
