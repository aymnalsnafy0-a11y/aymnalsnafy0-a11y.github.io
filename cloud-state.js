(function(root){
  'use strict';
  const safe=k=>!['__proto__','prototype','constructor'].includes(k);
  const copy=v=>JSON.parse(JSON.stringify(v));
  // بيانات الميزات الجديدة تُزامَن كقيمة واحدة لكل حقل
  const EXTRA=['hsk','pron','pronLog','dict','weekly','hidden','wsrs','grpDone','plan'];
  function flatten(s){
    const out={};
    for(const field of ['w','wr','daily','personalKnown'])for(const [key,value]of Object.entries(s[field]||{}))if(safe(key))out[field+':'+key]=copy(value);
    for(const [lesson,rows]of Object.entries(s.quiz||{}))for(const row of Array.isArray(rows)?rows:[])out['quiz:'+lesson+'|'+row.at]=copy({lesson,row});
    for(const word of s.myWords||[])if(word.hz)out['word:'+word.hz]=copy(word);
    for(const pack of s.packs||[]){const id=(pack.lesson||pack).id;if(id)out['pack:'+id]=copy(pack);}
    if(s.streak)out.streak=copy(s.streak);
    for(const f of EXTRA)if(s[f]!=null)out['x:'+f]=copy(s[f]);
    return out;
  }
  function changes(envelope,before,after,now=Date.now()){
    const result=copy(envelope||{v:1,items:{}});result.items=result.items||{};
    for(const key of new Set([...Object.keys(before),...Object.keys(after)])){
      if(JSON.stringify(before[key])===JSON.stringify(after[key]))continue;
      const t=Math.max(now,(result.items[key]?.t||0)+1);
      result.items[key]=key in after?{t,value:copy(after[key])}:{t,deleted:true};
    }return result;
  }
  function merge(a,b){
    const result={v:1,items:{}};
    for(const src of [a,b])for(const [k,v]of Object.entries(src?.items||{})){
      if(!safe(k)||!v||!Number.isFinite(v.t))continue;
      const old=result.items[k];
      if(!old||v.t>old.t||(v.t===old.t&&JSON.stringify(v)>JSON.stringify(old)))result.items[k]=copy(v);
    }return result;
  }
  function restore(env,local){
    const s=copy(local);for(const f of ['w','wr','daily','personalKnown','quiz'])s[f]={};s.myWords=[];s.packs=[];s.streak={last:null,n:0};
    for(const [key,entry]of Object.entries(env.items||{})){
      if(entry.deleted)continue;const value=copy(entry.value),colon=key.indexOf(':'),kind=colon<0?key:key.slice(0,colon),id=key.slice(colon+1);
      if(!safe(id))continue;
      if(['w','wr','daily','personalKnown'].includes(kind))s[kind][id]=value;
      else if(kind==='word')s.myWords.push(value);
      else if(kind==='pack')s.packs.push(value);
      else if(kind==='quiz'&&value.lesson&&safe(value.lesson)){(s.quiz[value.lesson]||(s.quiz[value.lesson]=[])).push(value.row);}
      else if(kind==='streak')s.streak=value;
      else if(kind==='x'&&EXTRA.includes(id))s[id]=value;
    }
    for(const rows of Object.values(s.quiz))rows.sort((a,b)=>b.at-a.at);
    return s;
  }
  const api={flatten,changes,merge,restore};root.CloudState=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
