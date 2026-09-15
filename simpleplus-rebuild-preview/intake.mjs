import {
  clone,uid,now,material,putMaterial,costKnown,stockKnown,number,audit
}
from './domain.mjs';
export function parseJson(text,max=60000000){
  if(typeof text!=='string'||text.length>max)throw Error('JSONが大きすぎます。');
  return JSON.parse(text.replace(/^\uFEFF/,''),(key,value)=>{
    if(['__proto__','constructor','prototype'].includes(key))throw Error('使用できないキーを含んでいます。');return value;
  });
}
export function intakePreview(d,input) {
  const p=typeof input==='string'?parseJson(input,12000000):clone(input);
  if(p?.format!=='simpleplus-material-intake'||p.version!==1||!Array.isArray(p.items))throw Error('素材追加用JSONを選んでください。全体JSONは「データ・設定 → バックアップ復元」から読み込みます。');
  if(typeof p.batchId!=='string'||!p.batchId.trim()||p.batchId.length>200||!p.items.length||p.items.length>250)throw Error('batchId（1〜200文字）と1〜250行のitemsを確認してください。');
  const keys=new Set();
  return p.items.map((raw,index)=>{
    if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('候補の各行はオブジェクトにしてください。');
    const itemId=String(raw.itemId??`row-${index+1}`),key=JSON.stringify([p.batchId,itemId]);
    if(!itemId||itemId.length>200||keys.has(key))throw Error('itemIdは資料内で一意にしてください。');keys.add(key);
    const prior=d.materialIntake.find(x=>x.key===key),receipt=d.materialIntakeReceipts.find(x=>x.key===key);
    let error='';try{
      validateNumbers(raw);material(raw);
    }catch(e){
      error=e.message;
    }
    const changed=prior&&JSON.stringify(prior.raw)!==JSON.stringify(raw);
    const diff=changed?[...new Set([...Object.keys(prior.raw),...Object.keys(raw)])].filter(k=>JSON.stringify(prior.raw[k])!==JSON.stringify(raw[k])).map(k=>({
      field:k,before:prior.raw[k],after:raw[k]
    })):[];
    return {
      id:prior?.id||uid(),key,batchId:p.batchId,itemId,raw:clone(raw),error,status:receipt?'registered':prior?(changed?'update':'same'):'new',diff,receipt,createdAt:prior?.createdAt||now(),similar:d.materials.filter(m=>normalize(m.name)===normalize(raw.name)).map(m=>({
        id:m.id,name:m.name,size:m.size,supplier:m.supplier
      })),action:prior?.action||'new',targetId:prior?.targetId||'',acquisition:prior?.acquisition||'existing'
    };
  });
}
const normalize=v=>String(v||'').normalize('NFKC').replace(/\s/g,'').toLowerCase();
function validateNumbers(raw){
  for(const key of ['purchaseQty','purchaseTotal','allocatedShipping','unitCost','stock','unitsPerPair','purchaseConversion'])if(raw[key]!=null&&typeof raw[key]!=='number')throw Error(`${key}はJSONの数値またはnullにしてください。`);
  for(const key of ['unitCostConfirmed','stockConfirmed','pairConvertible','shippingIncluded'])if(raw[key]!=null&&typeof raw[key]!=='boolean')throw Error(`${key}はtrue/falseで指定してください。`);
}
export function stageIntake(d,rows){
  let added=0,updated=0,skipped=0;
  for(const row of rows){
    if(d.materialIntakeReceipts.some(r=>r.key===row.key)){
      skipped++;
      continue;
    }
    const old=d.materialIntake.find(x=>x.key===row.key);
    if(old){
      if(row.status==='update'){
        audit(d,'intake-update',row.key,old.raw,row.raw,'差分を確認して候補を更新');
        Object.assign(old,clone(row));
        updated++;
      }else skipped++;
    }else{
      d.materialIntake.push(clone(row));
      added++;
    }
  }
  return {
    added,updated,skipped
  };
}
export function commitIntake(d,ids){
  const rows=d.materialIntake.filter(x=>ids.includes(x.id));
  if(!rows.length)throw Error('登録する候補を選んでください。');
  const results=[];
  for(const row of rows){
    if(d.materialIntakeReceipts.some(x=>x.key===row.key))continue;
    validateNumbers(row.raw);
    let m=material(row.raw);
    const target=d.materials.find(x=>x.id===row.targetId);
    if(row.action==='merge'){
      if(!target)throw Error('補完先を選んでください。');
      if(target.unit&&m.unit&&target.unit!==m.unit)throw Error('補完先と単位が違います。');
      const merged=clone(target);
      for(const f of ['name','reading','size','shape','material','color','supplier','hardwareType','unit','image','source'])if(!merged[f]&&m[f])merged[f]=m[f];
      if(!costKnown(target)&&costKnown(m)){
        merged.unitCost=m.unitCost;
        merged.unitCostMode='manual';
        merged.unitCostConfirmed=true;
      }
      if(row.acquisition==='purchase'){
        const delta=number(row.addStockQty,'今回の入荷数',{
          positive:true,required:true
        });
        if(!stockKnown(target))throw Error('残数未確認の素材への買い足しは、棚卸しで実残数を確認してから反映してください。購入情報のみの補完は可能です。');
        merged.stock=target.stock+delta;
        merged.stockConfirmed=true;
      }else if(!stockKnown(target)&&stockKnown(m)){
        merged.stock=m.stock;
        merged.stockConfirmed=true;
      }
      merged.purchaseReferences=[...(target.purchaseReferences||[]),{
        at:now(),raw:clone(row.raw),acquisition:row.acquisition
      }];
      m=putMaterial(d,merged);
    }else {
      if(row.action!=='new')throw Error('新規登録か既存補完を選んでください。');
      m=putMaterial(d,m);
    }
    d.materialIntakeReceipts.push({
      key:row.key,batchId:row.batchId,itemId:row.itemId,materialId:m.id,action:row.action,acquisition:row.acquisition,at:now(),source:clone(row.raw)
    });
    results.push(m.id);
  }
  d.materialIntake=d.materialIntake.filter(x=>!ids.includes(x.id));
  return results;
}
