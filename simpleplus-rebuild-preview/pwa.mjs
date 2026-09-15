export const pwa={ready:false,error:'',waiting:false,installed:matchMedia('(display-mode: standalone)').matches,prompt:null,persistent:null};
let registration;
const changed=()=>window.dispatchEvent(new Event('simpleplus-pwa'));
window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();pwa.prompt=event;changed();
});
window.addEventListener('appinstalled',()=>{
  pwa.installed=true;pwa.prompt=null;changed();
});
export async function installApp(){
  if(!pwa.prompt)return false;
  const event=pwa.prompt;pwa.prompt=null;
  await event.prompt();await event.userChoice;changed();return true;
}
export async function requestPersistentStorage(){
  pwa.persistent=navigator.storage?.persist?await navigator.storage.persist():false;
  changed();return pwa.persistent;
}
export function activateUpdate(){
  if(!registration?.waiting)return false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});
  registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
  return true;
}
export async function startPwa(){
  if(!isSecureContext||!('serviceWorker' in navigator)){
    pwa.error='オフライン準備にはHTTPSで開いてください。';changed();return;
  }
  try{
    registration=await navigator.serviceWorker.register('./service-worker.js',{scope:'./',updateViaCache:'none'});
    const inspect=()=>{pwa.waiting=!!registration.waiting;changed();};
    inspect();
    registration.addEventListener('updatefound',()=>registration.installing?.addEventListener('statechange',inspect));
    await navigator.serviceWorker.ready;
    pwa.ready=true;
    pwa.persistent=await navigator.storage?.persisted?.()??false;
    changed();
  }catch(error){pwa.error='オフライン準備に失敗しました。接続を確認して再読込してください。';changed();console.warn(error);}
}
