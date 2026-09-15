import {
  APP,blank,clone,known,eventDates,datePart,saleEventCandidates
}
from './domain.mjs';
import {
  parseJson
}
from './intake.mjs';
const tables=['materials','products','checkouts','events','customers','productionRecords','stockMovements','productMovements','cashClosings','plans','materialIntake','materialIntakeReceipts','audit'];
export function backup(data){
  return {
    format:'simpleplus-rebuild-backup',schemaVersion:1,app:APP,exportedAt:new Date().toISOString(),data:clone(data)
  };
}
export function migrationPreview(input){
  const pack=typeof input==='string'?parseJson(input):clone(input);
  if(!pack||Array.isArray(pack))throw Error('全体バックアップのオブジェクト形式を確認してください。');
  if(pack.format==='simpleplus-material-intake')throw Error('素材追加JSONです。「素材 → 素材をまとめて追加」を使ってください。');
  const raw=pack.data&&typeof pack.data==='object'?pack.data:pack;
  if(!['materials','products','checkouts','sales','events'].some(k=>Array.isArray(raw[k])))throw Error('対応するSimple+のデータ配列がありません。');
  if(pack.format&&pack.format!=='simpleplus-rebuild-backup')throw Error('対応しないバックアップ形式です。');
  const native=pack.format==='simpleplus-rebuild-backup';
  if(native&&pack.schemaVersion!==1)throw Error('この版で読めない新しいスキーマです。新しいアプリをご利用ください。');
  const warnings=[],d={
    ...blank(),...clone(raw)
  },retained=[];
  for(const k of tables){
    if(raw[k]!=null&&!Array.isArray(raw[k]))throw Error(`${k}は配列ではありません。`);
    d[k]=clone(raw[k]||[]);
  }
  d.settings={
    ...blank().settings,...clone(raw.settings||{
    })
  };
  d.operations=clone(raw.operations||[]);
  if(!Array.isArray(d.operations)||d.operations.some(x=>typeof x!=='string'))throw Error('保存操作IDの配列が不正です。');
  for(const table of tables)if(d[table].some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error(`${table}にオブジェクト以外の行があります。`);
  for(const key of ['paymentMethods','platforms','shippingMethods','customizationPresets','hardwareReplacementRules','recentMaterialIds'])if(!Array.isArray(d.settings[key]))throw Error(`設定の${key}は配列にしてください。`);
  for(const key of Object.keys(raw))if(![...Object.keys(blank()),'sales','legacySource'].includes(key))retained.push(key);
  for(const table of tables.filter(t=>!['materialIntakeReceipts','audit'].includes(t))){
    const ids=new Set();
    d[table].forEach((row,i)=>{
      if(!row||typeof row!=='object')throw Error(`${table}に不正な行があります。`);if(!row.id){
        row.id=`legacy-${table}-${i+1}`;warnings.push(`${table}[${i+1}]：IDがなく安定した移行IDを付与`);
      }
      if(ids.has(row.id))throw Error(`${table}に重複IDがあります：${row.id}`);ids.add(row.id);
    });
  }
  if(!native){
    d.legacySource=clone(pack);
    function optional(v,path,{
      positive=false,signed=false
    }
    ={
    }){
      if(v==null||v==='')return null;
      const n=Number(v);
      if(typeof v==='boolean'||!Number.isFinite(n)||(!signed&&n<0)||(positive&&n<=0)){
        warnings.push(`${path}：不正値を未確認にし、原情報をlegacySourceに保管`);
        return null;
      }
      return n;
    }
    d.materials=d.materials.map(m=>({
      ...m,unit:m.unit||'',unitCost:m.unitCostConfirmed===false?null:optional(m.unitCost,`${m.id}.unitCost`),unitCostConfirmed:m.unitCostConfirmed!==false&&optional(m.unitCost,`${m.id}.unitCost`)!==null,unitCostMode:known(m.unitCost)||m.unitCost!=null?'manual':'auto',stock:m.stockConfirmed===false?null:optional(m.stock,`${m.id}.stock`),stockConfirmed:m.stockConfirmed!==false&&optional(m.stock,`${m.id}.stock`)!==null,stockEpoch:m.stockEpoch||0,purchaseQty:optional(m.purchaseQty,`${m.id}.purchaseQty`,{
        positive:true
      }),purchaseTotal:optional(m.purchaseTotal,`${m.id}.purchaseTotal`),allocatedShipping:optional(m.allocatedShipping,`${m.id}.allocatedShipping`),hardwareType:m.hardwareType||''
    }));
    d.products=d.products.map(p=>({
      ...p,stock:optional(p.stock??p.qty,`${p.id}.stock`),stockConfirmed:optional(p.stock??p.qty,`${p.id}.stock`)!==null,price:optional(p.price,`${p.id}.price`),stockEpoch:p.stockEpoch||0,recipe:(p.recipe||[]).map(r=>({
        ...r,usageUnit:r.usageUnit||d.materials.find(m=>m.id===r.materialId)?.unit||''
      }))
    }));
    d.events=d.events.map(e=>{
      const declared=eventDates({...e,daysData:[]});
      const dates=[...new Set([...declared,...eventDates(e)])].sort();
      // Preserve every original daily record while filling missing declared days.
      const daysData=[...(e.daysData||[])];
      for(const date of dates)if(!daysData.some(day=>day.date===date))daysData.push({date,transport:null,parking:null,customExpenses:[]});
      return {...e,start:e.start||e.startDate||'',daysCount:e.daysCount??e.days??dates.length,daysData};
    });
    if(!d.checkouts.length&&Array.isArray(raw.sales)){
      warnings.push('旧sales形式：会計へ変換。根拠のない原価・手数料は未確定。元の行を保持。');
      d.checkouts=raw.sales.map((s,i)=>({
        ...s,id:s.id||`legacy-sale-${i}`,date:s.date,items:[{
          lineId:`${s.id||i}:0`,productId:s.productId||'',name:s.name||'旧売上',qty:s.qty??1,unitPrice:s.price,cost:s.cost??null,costConfirmed:s.cost!=null
        }],listTotal:s.total??s.qty*s.price,productNet:s.productNet??s.total,finalTotal:s.finalTotal??s.total,platformName:s.channel||s.platformName,customerType:s.customerType||'不明',totalCost:s.cost??null
      }));
    }
    d.checkouts=d.checkouts.map(c=>{
      const items=(c.items||[]).map((i,n)=>({
        ...i,lineId:i.lineId||`${c.id}:${n}`,cost:i.costConfirmed===false?null:optional(i.cost,`${c.id}.items[${n}].cost`),costConfirmed:i.costConfirmed!==false&&i.cost!=null,customizations:clone(i.customizations||[])
      }));
      // Recorded accounting values are never rebuilt from today's material masters.
      if(c.totalCost==null||c.paymentFee==null||c.platformFee==null)warnings.push(`${c.id}：保存済み原価・手数料の欠落あり。未確定として表示`);
      return {
        ...c,migrated:true,items,status:c.status||'active',customerType:c.customerType||'不明',totalCost:c.costConfirmed===false?null:optional(c.totalCost,`${c.id}.totalCost`),paymentFee:optional(c.paymentFee,`${c.id}.paymentFee`),platformFee:optional(c.platformFee,`${c.id}.platformFee`),shippingCost:c.shippingCost??null,needsReview:c.costConfirmed===false||c.totalCost==null||items.some(i=>!i.productId),date:c.date,legacyDate:c.date
      };
    });
    for(const c of d.checkouts) {
      const existing=d.events.find(e=>e.id===c.eventId);
      // A valid stored ID is stronger evidence than a date-based inference.
      if(existing) {
        c.eventName=existing.name;
        if(!eventDates(existing).includes(datePart(c.date)))warnings.push(`${c.id}：元のイベントIDを維持しましたが、日本時間の販売日が開催日と一致しません。`);
        continue;
      }
      const candidates=saleEventCandidates(d,c);
      const originalEventId=c.eventId||'',originalEventName=c.eventName||'';
      if(!candidates.length&&!originalEventId&&!originalEventName&&datePart(c.date))continue;
      const nonEventNeedsReview=!!c.needsReview;
      c.eventLink={method:'legacy-date-Asia/Tokyo',date:datePart(c.date),originalEventId,originalEventName,candidateIds:candidates.map(e=>e.id),nonEventNeedsReview};
      if(candidates.length===1) {
        c.eventId=candidates[0].id;c.eventName=candidates[0].name;c.eventLinkPending=false;
        c.eventLink.status='inferred';
        warnings.push(`${c.id}：日本時間 ${datePart(c.date)} の開催候補が1件のため「${c.eventName}」へ紐づけました。`);
      } else {
        c.eventId='';c.eventName='';c.eventLinkPending=true;c.needsReview=true;
        c.eventLink.status='needs-review';
        warnings.push(`${c.id}：イベント候補${candidates.length}件。自動確定せず要確認にしました。売上の詳細から確認できます。`);
      }
    }
    for(const c of d.checkouts)for(const i of c.items){
      if(i.productId&&!d.products.some(p=>p.id===i.productId))warnings.push(`${c.id}：商品参照 ${i.productId} が未解決`);
    }
    for(const p of d.products)for(const r of p.recipe||[])if(!d.materials.some(m=>m.id===r.materialId))warnings.push(`${p.id}：素材参照 ${r.materialId} が未解決。原価未確定`);
    if(d.settings.customizationPresets?.some(p=>!p.operations))warnings.push('旧追加セットは原情報を保持。選択式／固定素材行を新会計へ適用できます。旧交換ルールも一覧から選択可能。');
    warnings.push('実データJSONは開発時未提供。今回の読込内容はプレビューでご確認ください。旧会計の数量・材料訂正と旧制作取消は自動巻戻し対象外。');
    if(d.events.some(e=>e.fee==null||e.daysData.some(day=>day.transport==null||day.parking==null)))warnings.push('イベント経費の未入力部分は未確定。確定利益として扱いません。');
  }else {
    for(const m of d.materials)for(const k of ['unitCost','stock','purchaseQty','purchaseTotal','allocatedShipping'])if(m[k]!=null&&(!known(m[k])||m[k]<0))throw Error(`バックアップの数値が不正です：${m.id}.${k}`);
    for(const c of d.checkouts)if(!Array.isArray(c.items))throw Error('会計明細が不正です。');
    for(const p of d.products){
      if(!Array.isArray(p.recipe))throw Error('商品の材料表が不正です。');
      for(const key of ['price','stock','sold','manualCost'])if(p[key]!=null&&(!known(p[key])||p[key]<0))throw Error(`商品の数値が不正です：${p.id}.${key}`);
    }
    for(const table of ['paymentMethods','platforms','shippingMethods'])for(const r of d.settings[table]){
      if(!r||typeof r!=='object'||!r.id)throw Error('料金設定の行が不正です。');
      const value=r[table==='shippingMethods'?'fee':'feeRate'];
      if(value!=null&&(!known(value)||value<0))throw Error('料率・送料の値が不正です。');
    }
  }
  const counts=tables.map(k=>({
    table:k,source:Array.isArray(raw[k])?raw[k].length:0,result:d[k].length
  }));
  return {
    data:d,counts,warnings:[...new Set(warnings)],retained,native,sourceSchema:pack.schemaVersion??'番号なし',sourceFormat:native?'Rebuildバックアップ':Array.isArray(raw.sales)&&!raw.checkouts?.length?'旧sales形式':'旧checkouts形式'
  };
}
