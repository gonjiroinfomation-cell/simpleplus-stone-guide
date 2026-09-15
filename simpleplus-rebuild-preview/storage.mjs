import {
  blank,clone,execute
}
from './domain.mjs';
export const DB_NAME='simpleplus-rebuild';
export const STORE='documents';
export const DRAFT_KEY='simpleplus-rebuild-drafts';
export class Repository {
  constructor(){
    this.db=null;
    this.revision=0;
    this.data=blank();
    this.busy=false;
    this.channel=typeof BroadcastChannel==='function'?new BroadcastChannel('simpleplus-rebuild-updates'):null;
  }
  async open(){
    this.db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('別のタブを閉じてから再試行してください。'));
    });
    this.db.onversionchange=()=>this.db.close();
    return this.reload();
  }
  async reload(){
    const record=await new Promise((resolve,reject)=>{
      const tx=this.db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
    });
    this.data=record?.data||blank();
    this.revision=record?.revision||0;
    return this.data;
  }
  async save(operationId,work){
    if(this.busy)throw Error('保存中です。完了をお待ちください。');
    this.busy=true;
    try {
      const changed=execute(this.data,operationId,work);
      if(changed.duplicate)return changed.result;
      const expected=this.revision;
      await new Promise((resolve,reject)=>{
        const tx=this.db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let error;
        const get=store.get('main');
        get.onsuccess=()=>{
          if((get.result?.revision||0)!==expected){
            error=Error('別のタブで保存されています。入力を保留し、「最新データを読み直す」を押して内容を確認してください。');tx.abort();return;
          }
          store.put({
            revision:expected+1,schemaVersion:1,data:changed.data
          },'main');
        };
        tx.oncomplete=resolve;tx.onerror=()=>reject(error||tx.error||Error('保存に失敗しました。入力は残っています。'));tx.onabort=()=>reject(error||tx.error||Error('保存が中断されました。入力は残っています。'));
      });
      this.data=changed.data;
      this.revision=expected+1;
      this.channel?.postMessage({
        revision:this.revision
      });
      return changed.result;
    } finally {
      this.busy=false;
    }
  }
  async restore(next,operationId){
    return this.save(operationId,d=>{
      for(const k of Object.keys(d))delete d[k];Object.assign(d,clone(next));
    });
  }
}
export function readDrafts(){
  try{
    return JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}');
  }catch{
    return {
    };
  }
}
export function writeDrafts(drafts){
  localStorage.setItem(DRAFT_KEY,JSON.stringify(drafts));
}
