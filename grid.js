/* مربّعات الكتابة مثل الورق الصيني: 米字格 / 田字格 / بدون */
(function(){
  'use strict';
  const MODES = [
    {k: 'mi', label: '▦ 米字格'},
    {k: 'tian', label: '▦ 田字格'},
    {k: 'none', label: '▢ بدون خطوط'}
  ];
  function cur(){ const k = (typeof state !== 'undefined' && state.set && state.set.grid) || 'mi'; return MODES.find(m => m.k === k) || MODES[0]; }
  function apply(){
    const m = cur();
    document.body.classList.remove('grid-mi', 'grid-tian', 'grid-none');
    document.body.classList.add('grid-' + m.k);
    const b = document.getElementById('gridBtn'); if(b) b.textContent = m.label;
  }
  window.cycleGrid = function(){
    const i = MODES.indexOf(cur());
    state.set.grid = MODES[(i + 1) % MODES.length].k; save(); apply();
    toast(cur().k === 'mi' ? '米字格: خطوط أفقية وعمودية وقُطرية' : cur().k === 'tian' ? '田字格: خط أفقي وعمودي في المنتصف' : 'مربّع بدون خطوط');
  };
  function init(){ if(typeof state === 'undefined') return setTimeout(init, 200); apply(); }
  init();
})();
