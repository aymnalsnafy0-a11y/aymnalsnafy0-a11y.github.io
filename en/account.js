(function(){
 'use strict';
 const GUEST='hsk_app_v2',core=CloudState;
 const button=document.createElement('button');button.id='accountButton';button.textContent='👤';button.title="My account";button.setAttribute('aria-label',"My account");button.type='button';
 document.getElementById('btnSet').parentNode.insertBefore(button,document.getElementById('btnSet'));
 const modal=document.createElement('div');modal.className='modal';modal.id='mdAccount';
 modal.innerHTML="<div class=\"sheet account-sheet\" role=\"dialog\" aria-label=\"My account\"><h3><span>My account</span><button class=\"btn o sm\" id=\"accountClose\">Close ✕</button></h3><div id=\"accountGuest\"><p>Log in to have your progress, lessons, and “My Words” with you on your devices.</p><div id=\"accountMode\"><button type=\"button\" class=\"btn\" id=\"accountLoginMode\">Log in</button><button type=\"button\" class=\"btn o\" id=\"accountSignupMode\">Create an account</button></div><form id=\"accountForm\"><label>Email<input id=\"accountEmailInput\" type=\"email\" required autocomplete=\"email\" dir=\"ltr\" placeholder=\"name@example.com\"></label><label>Password<input id=\"accountPassword\" type=\"password\" required minlength=\"6\" autocomplete=\"current-password\" dir=\"ltr\"></label><label id=\"accountConfirmLabel\" hidden>Confirm password<input id=\"accountConfirm\" type=\"password\" minlength=\"6\" autocomplete=\"new-password\" dir=\"ltr\"></label><label class=\"account-check\"><input id=\"accountImport\" type=\"checkbox\" checked><span>Add visitor progress on this device to my account.</span></label><div class=\"account-actions\"><button class=\"btn\" id=\"accountSubmit\" type=\"submit\" disabled>Log in</button><button class=\"btn o\" id=\"accountReset\" type=\"button\" disabled>I forgot my password</button></div></form><p class=\"account-status\">You can continue as a visitor; Visitor progress remains on this device.</p></div><div id=\"accountMember\" hidden><p>Logged in: <b id=\"accountEmail\" dir=\"ltr\"></b></p><p class=\"account-status\" id=\"accountSyncStatus\"></p><p class=\"account-status\">Automatic saving. Click Sync Now to bring in the latest changes from your other devices.</p><div class=\"account-actions\"><button class=\"btn\" id=\"accountSync\">Sync now</button><button class=\"btn o\" id=\"accountLogout\">Log out</button><button class=\"btn r\" id=\"accountDelete\" style=\"margin-top:10px;width:100%\">🗑 Permanently deleted my account and its data</button></div></div><p id=\"accountMessage\" role=\"status\" aria-live=\"polite\">Preparing login...</p><button class=\"btn o\" id=\"accountRetry\" hidden>Reconnect</button></div>";
 document.body.appendChild(modal);
 const $a=id=>document.getElementById(id),msg=text=>{$a('accountMessage').textContent=text;};
 button.onclick=()=>openModal('mdAccount');$a('accountClose').onclick=()=>closeModal('mdAccount');modal.onclick=e=>{if(e.target===modal)closeModal('mdAccount');};
 let sdk=null,auth=null,db=null,user=null,mode='login',loading=false,applying=false,timer=0,epoch=0,envelope={v:1,items:{}},baseline=core.flatten(state),pendingImport=null,inFlight=null,changed=0;
 const originalSave=save;
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch(_){return fallback;}};
 const cacheKey=uid=>'hsk_account_'+uid;
 const envKey=uid=>'hsk_cloud_'+uid;
 const normalize=s=>Object.assign(blank(),s||{},{set:Object.assign({},blank().set,s?.set||{})});
 function cloudStatus(text){$a('accountSyncStatus').textContent=text;}
 function errorText(e){const code=e?.code||'';return ({
  'auth/invalid-email':"Make sure you write the email correctly.",'auth/invalid-credential':"The email or password is incorrect.",'auth/wrong-password':"The email or password is incorrect.",'auth/user-not-found':"The email or password is incorrect.",'auth/email-already-in-use':"This email is registered; Choose Sign In or Recover Password.",'auth/weak-password':"Choose a password of at least 6 characters.",'auth/password-does-not-meet-requirements':"The password does not meet the account requirements. Choose a longer word with letters and numbers.",'auth/too-many-requests':"Many attempts; Wait a while and then try.",'auth/network-request-failed':"Unable to connect. Check the internet and try again.",'auth/operation-not-allowed':"Email login is not activated in the project.",'permission-denied':"Synchronization failed due to database privileges. Your progress is saved on this device.",'unavailable':"Synchronization is temporarily unavailable. Your progress is saved on this device.",'cloud/too-large':"The added lessons are great for the existing sync space. Your progress is saved locally; Use Progressive Copy to keep a copy."})[code]||"The operation could not be completed. Your progress is saved on the device; Try again.";}
 function ui(){
  $a('accountGuest').hidden=!!user;$a('accountMember').hidden=!user;
  $a('accountEmail').textContent=user?.email||'';button.textContent=user?'👤✓':'👤';button.title=user?"My account (registered)":"My account";
  for(const id of ['accountSubmit','accountReset'])$a(id).disabled=!sdk||loading;
  $a('accountSync').disabled=loading;$a('accountLogout').disabled=loading;if($a('accountDelete'))$a('accountDelete').disabled=loading;
 }
 function setMode(next){mode=next;$a('accountConfirmLabel').hidden=next!=='signup';$a('accountConfirm').required=next==='signup';$a('accountPassword').autocomplete=next==='signup'?'new-password':'current-password';$a('accountSubmit').textContent=next==='signup'?"Create an account":"Log in";$a('accountLoginMode').className='btn'+(next==='login'?'':' o');$a('accountSignupMode').className='btn'+(next==='signup'?'':' o');msg('');}
 $a('accountLoginMode').onclick=()=>setMode('login');$a('accountSignupMode').onclick=()=>setMode('signup');
 function applyState(next,home=false){
  applying=true;
  try{if(typeof stopChineseAudio==='function')stopChineseAudio();state=normalize(next);originalSave();
   LESSONS.splice(0,LESSONS.length,...window.__baseLessons);loadPacks();tagLessons();buildMyLesson();AIDX=null;
   if(home){quiz.live=false;useLesson(state.cur);go('home');}else{useLesson(state.cur);}
   paintChat();paintPersonalWords();
  }finally{applying=false;baseline=core.flatten(state);}
 }
 function record(){
  if(!user||applying)return false;const after=core.flatten(state);if(JSON.stringify(after)===JSON.stringify(baseline))return false;envelope=core.changes(envelope,baseline,after);baseline=after;changed++;
  try{localStorage.setItem(envKey(user.uid),JSON.stringify(envelope));}catch(_){}
  return true;
 }
 save=function(){originalSave();if(!record())return;cloudStatus("Saved on the device · Waiting for synchronization");clearTimeout(timer);timer=setTimeout(()=>sync(false).catch(()=>{}),1800);};
 async function sync(pull){
  if(!user||!sdk)return;const waitingEpoch=epoch;
  while(inFlight){try{await inFlight;}catch(_){}if(epoch!==waitingEpoch||!user)return;}
  const uid=user.uid,generation=epoch,sent=JSON.parse(JSON.stringify(envelope)),at=changed;
  cloudStatus("Synchronizing...");
  const job=(async()=>{
   try{
    const ref=sdk.doc(db,'learners',uid,'state','main');
    const merged=await sdk.runTransaction(db,async tx=>{
     const snap=await tx.get(ref);let remote={v:1,items:{}};
     if(snap.exists()){try{remote=JSON.parse(snap.data().payload);}catch(_){throw new Error('Invalid cloud state');}}
     const result=core.merge(remote,sent);const payload=JSON.stringify(result);
     if(new TextEncoder().encode(payload).length>830000)throw {code:'cloud/too-large'};
     if(!snap.exists()||snap.data().payload!==payload)tx.set(ref,{schema:1,payload,updatedAt:sdk.serverTimestamp()});
     return result;
    });
    if(epoch!==generation||user?.uid!==uid)return;
    envelope=core.merge(merged,envelope);try{localStorage.setItem(envKey(uid),JSON.stringify(envelope));}catch(_){}
    if(pull&&changed===at){applyState(core.restore(envelope,state),true);}
    cloudStatus(changed===at?"✓ Synchronization has been completed "+new Date().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'}):"There are new changes waiting to be saved");
   }catch(e){if(epoch===generation){cloudStatus(errorText(e));msg(errorText(e));}throw e;}
  })();inFlight=job;try{await job;}finally{if(inFlight===job)inFlight=null;}
 }
 async function accountChanged(next){
  epoch++;clearTimeout(timer);user=next;inFlight=null;changed=0;
  if(!next){KEY=GUEST;envelope={v:1,items:{}};applyState(read(GUEST,blank()),true);ui();return;}
  const uid=next.uid;KEY=cacheKey(uid);const previous=read(KEY,null),cached=normalize(previous||blank());
  envelope=read(envKey(uid),{v:1,items:{}});applyState(cached,true);
  if(previous&&!Object.keys(envelope.items||{}).length)envelope=core.changes(envelope,{},core.flatten(cached));
  if(pendingImport){const imported=core.flatten(pendingImport);for(const [key,value]of Object.entries(imported))if(!envelope.items[key])envelope.items[key]={t:1,value};pendingImport=null;applyState(core.restore(envelope,cached),true);}
  ui();msg("You are logged in.");await sync(true).catch(()=>{});
 }
 async function initialize(){
  if(loading)return;loading=true;ui();$a('accountRetry').hidden=true;msg("Preparing login...");
  try{
   const [appLib,authLib,storeLib]=await Promise.all([import('https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js'),import('https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js')]);
   sdk={...authLib,...storeLib};
   const app=appLib.getApps().length?appLib.getApp():appLib.initializeApp({apiKey:'AIzaSyAcA8JJ43RIg7o3lrv5mK_5DUVzxCPNG3Y',authDomain:'chinese-lessons-38ce0.firebaseapp.com',projectId:'chinese-lessons-38ce0',storageBucket:'chinese-lessons-38ce0.firebasestorage.app',messagingSenderId:'105280877994',appId:'1:105280877994:web:34aa1a15b26cb8b36e67d3'});
   auth=sdk.getAuth(app);auth.languageCode=document.documentElement.lang;db=sdk.getFirestore(app);
   await sdk.setPersistence(auth,sdk.browserLocalPersistence);
   sdk.onAuthStateChanged(auth,next=>accountChanged(next).catch(e=>msg(errorText(e))));msg('');
  }catch(e){sdk=null;msg("The login could not be loaded. You can continue studying as a visitor and reconnect later.");$a('accountRetry').hidden=false;}
  finally{loading=false;ui();}
 }
 $a('accountRetry').onclick=initialize;
 $a('accountForm').onsubmit=async e=>{
  e.preventDefault();if(!sdk||loading)return;
  const email=$a('accountEmailInput').value.trim(),password=$a('accountPassword').value;
  if(mode==='signup'&&password!==$a('accountConfirm').value){msg("The two passwords do not match.");return;}
  loading=true;ui();msg("Logging in...");pendingImport=$a('accountImport').checked?JSON.parse(JSON.stringify(state)):null;
  try{if(mode==='signup')await sdk.createUserWithEmailAndPassword(auth,email,password);else await sdk.signInWithEmailAndPassword(auth,email,password);$a('accountPassword').value='';$a('accountConfirm').value='';}
  catch(e){pendingImport=null;msg(errorText(e));}finally{loading=false;ui();}
 };
 $a('accountReset').onclick=async()=>{const email=$a('accountEmailInput').value.trim();if(!email||!$a('accountEmailInput').checkValidity()){msg("Write your email first to recover the password.");return;}loading=true;ui();try{await sdk.sendPasswordResetEmail(auth,email);msg("If the email is registered, you will receive a message to set a new password. See also junk mail.");}catch(e){msg(errorText(e));}finally{loading=false;ui();}};
 $a('accountSync').onclick=async()=>{loading=true;ui();try{await sync(true);}catch(_){}finally{loading=false;ui();}};
 $a('accountLogout').onclick=async()=>{loading=true;ui();try{await Promise.race([sync(false).catch(()=>{}),new Promise(r=>setTimeout(r,8000))]);await sdk.signOut(auth);msg("You are logged out. Visitor progress is separate from the account.");}catch(e){msg(errorText(e));}finally{loading=false;ui();}};
 $a('accountDelete').onclick=async()=>{
  const cu=auth&&auth.currentUser;if(!cu)return;
  const ok=typeof appConfirm==='function'?await appConfirm("Permanently delete the account","Your account will be deleted ("+(typeof esc==='function'?esc(cu.email):'')+") and all your progress saved in the cloud. Your progress on this device remains. It cannot be undone.","Delete my account"):confirm("Permanently delete the account?");
  if(!ok)return;loading=true;ui();msg("Account is being deleted...");
  try{try{await sdk.deleteDoc(sdk.doc(db,'learners',cu.uid,'state','main'));}catch(_){}
   await sdk.deleteUser(cu);msg("Your account and its data have been deleted from the cloud.");}
  catch(e){msg(e&&e.code==='auth/requires-recent-login'?"For the security of your account: Log out, then log in again, and then click “Delete my account” again.":errorText(e));}
  finally{loading=false;ui();}
 };
 window.addEventListener('online',()=>{if(user)sync(false).catch(()=>{});});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&user){clearTimeout(timer);sync(false).catch(()=>{});}});
 initialize();
})();
