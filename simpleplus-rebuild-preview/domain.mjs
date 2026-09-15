import {datePart,dateToday,localTime,timestamp} from './time.mjs';
export {datePart,dateToday,localTime,timestamp,formatDateTime,csvDateTime,TIME_ZONE} from './time.mjs';
export const APP = 'Simple+ Rebuild v0.1.1 Mobile Preview';
export const SCHEMA = 1;
export const clone = value => structuredClone(value);
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const known = v => typeof v === 'number' && Number.isFinite(v);
export const costKnown = m => !!m && m.unitCostConfirmed !== false && known(m.unitCost) && m.unitCost >= 0 && !!m.unit;
export const stockKnown = m => !!m && m.stockConfirmed !== false && known(m.stock);
export function number(v, label='数値', {
  signed=false, positive=false, required=false
}
={
}) {
  if (v === '' || v == null) {
    if(required) throw Error(`${label}を入力してください。`);
    return null;
  }
  if(typeof v === 'boolean' || typeof v === 'object' || !Number.isFinite(Number(v)) || (!signed && Number(v)<0) || (positive && Number(v)<=0)) throw Error(`${label}は${positive?'0より大きい':signed?'有限の':'0以上の'}数値にしてください。`);
  return Number(v);
}
export function money(v) {
  if(!known(v))return '未確定';
  if(v>0&&v<0.01)return `¥${v.toPrecision(4)}`;
  return `¥${v.toLocaleString('ja-JP',{maximumFractionDigits:2})}`;
}
export const total = xs => xs.every(known) ? xs.reduce((a,b)=>a+b,0) : null;
export const sum = xs => xs.filter(known).reduce((a,b)=>a+b,0);
export const qtyRound = n => Number(n.toFixed(9));
export function blank() {
  return {
    materials:[],products:[],checkouts:[],events:[],customers:[],productionRecords:[],stockMovements:[],productMovements:[],cashClosings:[],plans:[],materialIntake:[],materialIntakeReceipts:[],audit:[],operations:[],settings:{
      paymentMethods:[{
        id:'cash',name:'現金',feeRate:0
      }],platforms:[{
        id:'counter',name:'対面',feeRate:0
      }],shippingMethods:[],pricingPolicy:null,customizationPresets:[],hardwareReplacementRules:[],recentMaterialIds:[],eventMode:{
        active:false
      },targetMargin:null,safetyRate:null
    }
  };
}
export function imageData(v) {
  if(!v)return '';
  if(typeof v!=='string'||v.length>4000000||!/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/.test(v))throw Error('写真は3MB以下のPNG・JPEG・WebPを選んでください。');
  return v;
}
export function convert(m, qty, from) {
  if(!known(qty)||qty<0||!from||!m?.unit)return null;
  if(from===m.unit)return qty;
  const lengths={
    mm:0.1,cm:1,m:100
  };
  if(lengths[from]&&lengths[m.unit])return qty*lengths[from]/lengths[m.unit];
  if(m.pairConvertible&&known(m.unitsPerPair)&&m.unitsPerPair>0){
    if(from==='個'&&m.unit==='ペア')return qty/m.unitsPerPair;
    if(from==='ペア'&&m.unit==='個')return qty*m.unitsPerPair;
  }
  if(known(m.purchaseConversion)&&m.purchaseConversion>0&&from===m.purchaseUnit)return qty*m.purchaseConversion;
  return null;
}
export function purchaseCost(raw) {
  try {
    const q=number(raw.purchaseQty,'購入数量',{
      positive:true
    }),p=number(raw.purchaseTotal,'購入金額'),s=number(raw.allocatedShipping,'配分送料');
    if(raw.shippingIncluded&&s!==null&&s!==0)throw Error('送料込み金額には配分送料を重ねて加算できません。');
    const managed=convert({
      ...raw,unitsPerPair:number(raw.unitsPerPair),purchaseConversion:number(raw.purchaseConversion)
    },q,raw.purchaseUnit);
    if(q===null||p===null||!managed)return {
      value:null,managedQty:null,message:q!==null&&p!==null?'購入単位を換算できません。粒数・長さの根拠を補うか、単価未確認で保存できます。':'購入金額・購入数量・両方の単位が揃うと自動計算します。'
    };
    const value=(p+(s??0))/managed;
    if(!known(value))throw Error('計算結果が扱える範囲を超えています。');
    return {
      value,managedQty:managed,message:`(${p}円 + ${s??0}円) ÷ ${managed}${raw.unit} = ${money(value)} / ${raw.unit}　${raw.shippingIncluded?'購入金額に送料込み':s===null?'送料未算入／未確認':'明示された配分送料を算入'}`
    };
  }catch(e){
    return {
      value:null,managedQty:null,message:e.message,error:true
    };
  }
}
export function material(raw, existing={
}) {
  const m={
    ...clone(existing),...clone(raw),id:existing.id||raw.id||uid()
  };
  m.name=String(m.name||'').trim();
  m.image=imageData(m.image);
  if(!m.name&&!m.image)throw Error('素材名か写真のどちらかを追加してください。');
  if(!m.name)m.name='名前未確認の素材';
  for(const f of ['purchaseQty','purchaseTotal','allocatedShipping','stock','unitCost','unitsPerPair','purchaseConversion','reorder'])m[f]=number(m[f],f,{
    positive:['purchaseQty','unitsPerPair','purchaseConversion'].includes(f)
  });
  m.unit=m.unit||'';
  m.purchaseUnit=m.purchaseUnit||'';
  m.unitCostMode=m.unitCostMode||(known(m.unitCost)?'manual':'auto');
  const calculated=purchaseCost(m);
  if(calculated.error)throw Error(calculated.message);
  if(m.unitCostMode==='auto')m.unitCost=calculated.value;
  m.calculatedCandidate=calculated.value;
  if(m.unitCostConfirmed===false)m.unitCost=null;
  m.unitCostConfirmed=known(m.unitCost);
  if(m.stockConfirmed===false)m.stock=null;
  m.stockConfirmed=known(m.stock);
  m.createdAt=existing.createdAt||now();
  m.updatedAt=now();
  m.stockEpoch=existing.stockEpoch||0;
  return m;
}
export function audit(d,kind,id,before,after,reason='') {
  d.audit.push({
    id:uid(),at:now(),kind,refId:id,reason,before:clone(before),after:clone(after)
  });
}
export function putMaterial(d,raw) {
  const old=d.materials.find(m=>m.id===raw.id),m=material(raw,old);
  if(old&&old.unit!==m.unit&&(d.products.some(p=>p.recipe?.some(r=>r.materialId===m.id))||d.stockMovements.some(x=>x.materialId===m.id)||d.checkouts.some(c=>JSON.stringify(c).includes(m.id))))throw Error('履歴・材料表で使っている素材の管理単位は変更できません。別素材として登録してください。');
  if(old&&(old.stock!==m.stock||old.stockConfirmed!==m.stockConfirmed)) {
    m.stockEpoch=(old.stockEpoch||0)+1;
    d.stockMovements.push({
      id:uid(),date:now(),materialId:m.id,materialName:m.name,delta:stockKnown(old)&&stockKnown(m)?m.stock-old.stock:null,unit:m.unit,reason:'棚卸し・実残数の確認',refType:'stock-count',refId:m.id,stockApplied:stockKnown(m),balanceBefore:old.stock,balanceAfter:m.stock,stockEpoch:m.stockEpoch,createdAt:now()
    });
  }
  if(old)d.materials[d.materials.indexOf(old)]=m;
  else d.materials.push(m);
  audit(d,'material',m.id,old||null,m,'素材情報を保存');
  return m;
}
export function materialRow(d,row) {
  if(!row?.materialId)throw Error('使う素材を選んでください。');
  const m=d.materials.find(x=>x.id===row.materialId);
  const q=number(row.qty,'使用量',{
    positive:true,required:true
  }),managed=convert(m,q,row.usageUnit||m?.unit);
  if(managed===null)throw Error(`${m?.name||'素材'}の使用単位を換算できません。`);
  return {
    ...clone(row),materialId:m.id,materialName:m.name,qty:q,usageUnit:row.usageUnit||m.unit,managedQty:managed,managedUnit:m.unit,unitCost:costKnown(m)?m.unitCost:null,cost:costKnown(m)?managed*m.unitCost:null,stockEpoch:m.stockEpoch||0
  };
}
export function productCost(d,p) {
  const rows=(p?.recipe||[]).map(r=>{
    try{
      return materialRow(d,r);
    }catch(e){
      return {
        ...r,cost:null,error:e.message
      };
    }
  });
  const adjustment=number(p?.costAdjust??0,'追加原価',{
    signed:true
  });
  const recipeCost=rows.length?total(rows.map(r=>r.cost)):known(p?.manualCost)?p.manualCost:null;
  const value=recipeCost===null?null:recipeCost+(adjustment??0);
  return {
    rows,recipeCost,total:value,knownSubtotal:sum(rows.map(r=>r.cost))+(adjustment??0),confirmed:value!==null
  };
}
export function putProduct(d,raw) {
  const old=d.products.find(x=>x.id===raw.id);
  const p={
    ...clone(old||{
    }),...clone(raw),id:raw.id||uid(),updatedAt:now(),createdAt:old?.createdAt||now()
  };
  if(!p.name?.trim())throw Error('商品名を入力してください。');
  p.price=number(p.price,'販売価格');
  p.stock=number(p.stock,'完成品在庫');
  p.stockConfirmed=p.stock!==null;
  p.sold=number(old?.sold??p.sold??0,'累計販売数');
  p.min=number(p.min,'補充基準');
  if(p.stock!==null&&!Number.isInteger(p.stock))throw Error('完成品在庫は整数にしてください。');
  p.costAdjust=number(p.costAdjust??0,'追加原価',{
    signed:true
  });
  p.manualCost=number(p.manualCost,'本体原価');
  p.recipe=(p.recipe||[]).map(r=>{
    materialRow(d,r);return {
      ...r,id:r.id||uid()
    };
  });
  if(productCost(d,p).total<0)throw Error('商品原価が負数になっています。');
  p.stockEpoch=(old?.stockEpoch||0)+(old&&old.stock!==p.stock?1:0);
  if(old&&old.stock!==p.stock)d.productMovements.push({
    id:uid(),productId:p.id,date:now(),delta:known(old.stock)&&known(p.stock)?p.stock-old.stock:null,balanceAfter:p.stock,reason:'棚卸し',stockEpoch:p.stockEpoch
  });
  if(old)d.products[d.products.indexOf(old)]=p;
  else d.products.push(p);
  d.settings.recentMaterialIds=[...new Set([...p.recipe.map(r=>r.materialId),...(d.settings.recentMaterialIds||[])])].slice(0,16);
  audit(d,'product',p.id,old||null,p);
  return p;
}
function mergedDeltas(rows,key) {
  const out=new Map();
  for(const r of rows){
    if(!known(r.delta))throw Error('在庫増減が不正です。');
    out.set(r[key],{
      ...r,delta:qtyRound((out.get(r[key])?.delta||0)+r.delta)
    });
  }
  return [...out.values()].filter(r=>r.delta!==0);
}
export function applyStock(d,materials,products,refType,refId,reason) {
  const moves=[];
  for(const r of mergedDeltas(materials,'materialId')) {
    const m=d.materials.find(x=>x.id===r.materialId);
    if(!m)throw Error('対象素材が見つかりません。');
    const k=stockKnown(m),before=k?m.stock:null;
    if(k&&qtyRound(m.stock+r.delta)<0)throw Error(`${m.name}の在庫が不足しています（残 ${m.stock}${m.unit}・必要 ${-r.delta}${m.unit}）。下書きに保留し、実残数を確認してください。`);
    if(k)m.stock=qtyRound(m.stock+r.delta);
    const move={
      ...r,id:uid(),date:now(),createdAt:now(),materialName:m.name,unit:m.unit,stockEpoch:m.stockEpoch||0,stockApplied:k,balanceBefore:before,balanceAfter:k?m.stock:null,refType,refId,reason
    };
    d.stockMovements.push(move);
    moves.push(move);
  }
  const pmoves=[];
  for(const r of mergedDeltas(products,'productId')) {
    const p=d.products.find(x=>x.id===r.productId);
    if(!p)throw Error('商品が見つかりません。');
    const k=stockKnown(p),before=k?p.stock:null;
    if(k&&p.stock+r.delta<0)throw Error(`${p.name}の完成品在庫が不足しています。下書きに保留して制作・棚卸しを確認してください。`);
    if(k)p.stock+=r.delta;
    const move={
      ...r,id:uid(),date:now(),stockEpoch:p.stockEpoch||0,stockApplied:k,balanceBefore:before,balanceAfter:k?p.stock:null,refType,refId,reason
    };
    d.productMovements.push(move);
    pmoves.push(move);
  }
  return {
    materials:moves,products:pmoves
  };
}
export function produce(d,raw) {
  if(d.productionRecords.some(x=>x.id===raw.id))return d.productionRecords.find(x=>x.id===raw.id);
  const p=d.products.find(x=>x.id===raw.productId),q=number(raw.qty,'制作数',{
    positive:true,required:true
  });
  if(!Number.isInteger(q)||!p)throw Error('商品と整数の制作数を確認してください。');
  const cost=productCost(d,p);
  const ingredients=(p.recipe||[]).map(r=>materialRow(d,r));
  const id=raw.id||uid();
  const moves=applyStock(d,ingredients.map(r=>({
    materialId:r.materialId,delta:-r.managedQty*q
  })),[{
    productId:p.id,delta:q
  }],'production',id,'制作');
  const rec={
    ...raw,id,productName:p.name,date:now(),qty:q,ingredients,costPerItem:cost.total,totalCost:cost.total===null?null:cost.total*q,costConfirmed:cost.confirmed,status:'active',moves
  };
  d.productionRecords.push(rec);
  return rec;
}
export function pricing(delta,policy) {
  if(!policy||![policy.multiplier,policy.laborFee].every(known)||!known(delta))return null;
  let value=delta*policy.multiplier+policy.laborFee;
  if(value<0&&policy.discountPolicy==='none')value=0;
  else if(value<0&&policy.discountPolicy!=='allow')return null;
  const step=policy.rounding||0;
  if(step>0)value=Math.ceil(value/step)*step;
  return value;
}
export function customization(d,line,priorOps=[]) {
  const ops=[],deltas=[];
  let hardwarePrice=number(line.hardwarePriceDelta??0,'金具料金差',{
    signed:true
  }),hardwareCost=number(line.hardwareCostDelta??0,'金具原価差',{
    signed:true
  });
  let addonPrice=0,addonCost=0,knownSubtotal=0,quoted=0,hasUnknown=false;
  for(const source of line.customizations||[]) {
    const op=clone(source);
    let cost=null,comparison=null,rows=[];
    const prior=priorOps.find(x=>x.id===source.id&&JSON.stringify(x.inputSnapshot)===JSON.stringify(source));
    if(prior){
      const saved=clone(prior);
      ops.push(saved);
      deltas.push(...(saved.inventoryDeltas||[]));
      if(saved.type==='hardware'){
        hardwareCost=total([hardwareCost,saved.costDelta]);
        hardwarePrice=total([hardwarePrice,saved.priceDelta]);
      }else{
        addonCost=total([addonCost,saved.costDelta]);
        addonPrice=total([addonPrice,saved.priceDelta]);
      }
      hasUnknown||=saved.type==='hardware'&&saved.disposition==='unknown';
      continue;
    }
    const firstDelta=deltas.length;
    if(op.type==='hardware') {
      const old=materialRow(d,op.from),next=materialRow(d,op.to);
      rows=[old,next];
      comparison=total([next.cost,old.cost===null?null:-old.cost]);
      cost=op.disposition==='return'?comparison:op.disposition==='discard'?next.cost:null;
      if(op.disposition==='return')deltas.push({
        materialId:old.materialId,delta:old.managedQty
      });
      if(op.disposition!=='unknown')deltas.push({
        materialId:next.materialId,delta:-next.managedQty
      });
      else hasUnknown=true;
    }else {
      rows=(op.rows||[]).map(r=>materialRow(d,r));
      if(!rows.length)throw Error('追加する素材を選んでください。');
      cost=total(rows.map(r=>r.cost));
      comparison=cost;
      deltas.push(...rows.map(r=>({
        materialId:r.materialId,delta:-r.managedQty
      })));
    }
    const price=op.priceMode==='free'?0:op.priceMode==='rule'?pricing(comparison,d.settings.pricingPolicy):op.priceMode==='manual'?number(op.priceDelta,'追加料金',{
      signed:true
    }):null;
    Object.assign(op,{
      id:op.id||uid(),inputSnapshot:clone(source),inventoryDeltas:clone(deltas.slice(firstDelta)),rows,priceDelta:price,costDelta:cost,comparisonCostDelta:comparison,priceConfirmed:price!==null,costConfirmed:cost!==null,policySnapshot:op.priceMode==='rule'?clone(d.settings.pricingPolicy):null
    });
    ops.push(op);
    quoted+=comparison??0;
    knownSubtotal+=sum(rows.slice(op.type==='hardware'?1:0).map(r=>r.cost));
    if(op.type==='hardware'){
      hardwareCost=total([hardwareCost,cost]);
      hardwarePrice=total([hardwarePrice,price]);
    }
    else{
      addonCost=total([addonCost,cost]);
      addonPrice=total([addonPrice,price]);
    }
  }
  return {
    ops,deltas,hardwareCost,hardwarePrice,addonCost,addonPrice,costDelta:total([hardwareCost,addonCost]),priceDelta:total([hardwarePrice,addonPrice]),hasUnknown,quoted,knownSubtotal
  };
}
export function allocate(amount,weights) {
  if(amount===null)return weights.map(()=>null);
  if(!weights.length)return [];
  const weight=sum(weights);
  let used=0;
  return weights.map((w,i)=>{
    const n=i===weights.length-1?Number((amount-used).toFixed(2)):Number((weight?amount*w/weight:amount/weights.length).toFixed(2));used+=n;return n;
  });
}
export function checkoutQuote(d,raw,{
  previous=null
}
={
}) {
  if(!raw.items?.length)throw Error('商品を1点追加してください。');
  const items=raw.items.map(line=>{
    const p=d.products.find(x=>x.id===line.productId),q=number(line.qty,'商品数量',{
      positive:true,required:true
    });if(!Number.isInteger(q))throw Error('商品数量は整数にしてください。');
    const price=number(line.unitPrice,'販売単価',{
      required:true
    });
    const prior=previous?.items.find(x=>x.lineId===line.lineId);
    const base=prior&&!line.reconfirmCost?prior.baseUnitCost:p?productCost(d,p).total:number(line.baseUnitCost,'本体原価');
    const c=customization(d,line,prior?.customizations);const finalPrice=total([price,c.priceDelta]);
    if(finalPrice!==null&&finalPrice<0)throw Error('変更後の販売額が負数です。');
    const finalCost=total([base,c.costDelta]);if(finalCost!==null&&finalCost<0)throw Error('変更後の原価が負数です。');
    return {
      ...clone(line),lineId:line.lineId||uid(),name:line.name||p?.name||'未登録商品',productId:p?.id||'',qty:q,unitPrice:price,baseUnitCost:base,hardwarePriceDelta:c.hardwarePrice,hardwareCostDelta:c.hardwareCost,additionalPriceDelta:c.addonPrice,additionalMaterialUnitCost:c.addonCost,customizations:c.ops,customizationRequestedDeltas:c.deltas.map(x=>({
        ...x,delta:x.delta*q
      })),customizationPending:c.hasUnknown,unitFinalPrice:finalPrice,unitFinalCost:finalCost,listTotal:finalPrice===null?null:finalPrice*q,cost:finalCost===null?null:finalCost*q,packagingCost:0,knownSubtotal:sum([base,c.costDelta]),costConfirmed:finalCost!==null,priceConfirmed:finalPrice!==null
    };
  });
  const pack={
    boxQty:0,bagQty:0,...clone(raw.packaging||{
    })
  };
  const pCosts=[];
  if(!pack.included&&(Number(pack.boxQty)>0||Number(pack.bagQty)>0)&&items.some(i=>d.products.find(p=>p.id===i.productId)?.packagingIncluded))throw Error('商品原価に包装費が含まれています。同じ包装なら「商品原価に含まれている」を確認してください。追加の別包装は包装費を含まない商品として整理してください。');
  for(const kind of ['box','bag']){
    const q=number(pack[kind+'Qty']??0,'包装数量',{
      required:true
    });
    if(!Number.isInteger(q))throw Error('包装数量は整数にしてください。');
    pack[kind+'Qty']=q;
    const p=number(pack[kind+'UnitCost'],'包装単価');
    pack[kind+'UnitCost']=p;
    pCosts.push(q===0||pack.included?0:p===null?null:q*p);
  }
  const packagingCost=total(pCosts),weights=items.map(i=>i.listTotal??0),alloc=allocate(packagingCost,weights);
  items.forEach((i,n)=>{
    i.packagingCost=alloc[n];i.cost=total([i.cost,alloc[n]]);
    const prior=previous?.items.find(x=>x.lineId===i.lineId),original=previous?.inputSnapshot?.items.find(x=>x.lineId===i.lineId),input=raw.items.find(x=>x.lineId===i.lineId);
    if(prior?.explicitCostCorrection&&original&&input.productId===original.productId&&JSON.stringify(input.customizations||[])===JSON.stringify(original.customizations||[])){
      if(i.qty!==prior.qty)throw Error('明示的に原価訂正した明細です。数量変更前に、訂正後の原価を別の会計として確認してください。');
      i.cost=total([prior.cost-(prior.packagingCost??0),alloc[n]]);i.unitFinalCost=(prior.cost-(prior.packagingCost??0))/i.qty;i.explicitCostCorrection=clone(prior.explicitCostCorrection);
    }
    i.costConfirmed=i.cost!==null;
  });
  const listTotal=total(items.map(i=>i.listTotal)),discount=number(raw.discount??0,'値引き',{
    required:true
  }),shippingCharge=number(raw.shippingCharge??0,'お客様からの送料',{
    required:true
  }),shippingCost=number(raw.shippingCost??0,'実送料');
  if(listTotal!==null&&discount>listTotal)throw Error('値引きが商品売上を超えています。');
  const productNet=listTotal===null?null:listTotal-discount,finalTotal=productNet===null?null:productNet+shippingCharge;
  const payment=d.settings.paymentMethods.find(x=>x.id===raw.paymentId),platform=d.settings.platforms.find(x=>x.id===raw.platformId);
  const paymentRate=raw.paymentFeeRateOverride!==undefined?number(raw.paymentFeeRateOverride,'決済料率'):previous&&previous.paymentId===raw.paymentId?previous.paymentFeeRate:payment?.feeRate??null;
  const platformRate=raw.platformFeeRateOverride!==undefined?number(raw.platformFeeRateOverride,'販売先料率'):previous&&previous.platformId===raw.platformId?previous.platformFeeRate:platform?.feeRate??null;
  const paymentFee=known(finalTotal)&&known(paymentRate)?Math.round(finalTotal*paymentRate/100):null,platformFee=known(finalTotal)&&known(platformRate)?Math.round(finalTotal*platformRate/100):null;
  const totalCost=total(items.map(i=>i.cost));
  return {
    ...clone(raw),inputSnapshot:clone(raw),id:raw.id||uid(),items,packaging:pack,listTotal,discount,productNet,shippingCharge,shippingCost,finalTotal,paymentFee,platformFee,paymentFeeRate:paymentRate,platformFeeRate:platformRate,paymentName:payment?.name||'未設定',platformName:platform?.name||'未設定',customerName:d.customers.find(x=>x.id===raw.customerId)?.name||'',customerType:raw.customerType||'不明',eventName:d.events.find(x=>x.id===raw.eventId)?.name||'',totalCost,costConfirmed:totalCost!==null,profit:total([finalTotal,totalCost===null?null:-totalCost,paymentFee===null?null:-paymentFee,platformFee===null?null:-platformFee,shippingCost===null?null:-shippingCost]),needsReview:items.some(i=>!i.productId||!i.costConfirmed||i.customizationPending)||paymentFee===null||platformFee===null||shippingCost===null,status:'active'
  };
}
export function saveCheckout(d,raw) {
  if(d.checkouts.some(c=>c.id===raw.id))throw Error('記録済みです。修正は会計履歴から開いてください。');
  const c=checkoutQuote(d,raw);
  if(c.finalTotal===null)throw Error('変更・追加の料金が未設定です。共通ルール、今回の料金、無料確定のいずれかを選んでください。');
  if(!Number.isFinite(timestamp(c.date)))throw Error('販売日時を確認してください。');
  const event=d.events.find(e=>e.id===c.eventId);
  if(event&&!eventDates(event).includes(datePart(c.date)))throw Error('イベントの対象日を選んでください。');
  c.createdAt=now();
  c.moves=applyStock(d,c.items.flatMap(i=>i.customizationRequestedDeltas),c.items.filter(i=>i.productId&&!i.inventoryAlreadyApplied).map(i=>({
    productId:i.productId,delta:-i.qty
  })),'checkout',c.id,'販売・今回の変更追加');
  c.soldApplied=c.items.filter(i=>i.productId).map(i=>({
    productId:i.productId,qty:i.qty
  }));
  for(const r of c.soldApplied){
    const p=d.products.find(p=>p.id===r.productId);
    p.sold=(p.sold??0)+r.qty;
  }
  c.items.forEach(i=>{
    i.inventoryApplied=!!i.productId&&(i.inventoryAlreadyApplied||c.moves.products.some(m=>m.productId===i.productId&&m.stockApplied));i.customizationInventoryApplied=!i.customizationPending&&i.customizationRequestedDeltas.every(r=>c.moves.materials.some(m=>m.materialId===r.materialId&&m.stockApplied));i.snapshotAt=now();
  });
  d.checkouts.push(c);
  audit(d,'checkout',c.id,null,c,'売上記録');
  return c;
}
export function editMemo(d,id,note) {
  const c=d.checkouts.find(x=>x.id===id);
  if(!c)throw Error('会計が見つかりません。');
  audit(d,'checkout-note',id,c.note,note,'メモのみ変更。金額・在庫は不変');
  c.note=note;
  if(c.inputSnapshot)c.inputSnapshot.note=note;
  c.updatedAt=now();
  return c;
}
function checkEpoch(d,moves) {
  for(const [kind,key,table] of [['materials','materialId','materials'],['products','productId','products']])for(const m of moves?.[kind]||[])if(m.stockApplied){
    const entity=d[table].find(x=>x.id===m[key]);
    if(!entity||(entity.stockEpoch||0)!==(m.stockEpoch||0))throw Error('この記録後に棚卸しされています。過去の在庫反映は自動で戻せません。返品・棚卸しで現在の実数を記録してください。');
  }
}
export function correctCheckout(d,id,raw,reason) {
  const old=d.checkouts.find(x=>x.id===id);
  if(!old||old.status==='void')throw Error('訂正できる会計ではありません。');
  if(!reason?.trim())throw Error('訂正理由を入力してください。');
  const next=checkoutQuote(d,{
    ...raw,id
  },{
    previous:old
  });
  if(next.finalTotal===null)throw Error('追加料金を確認してください。');
  if(old.migrated)throw Error('移行した旧会計の数量・材料訂正は未対応です。メモ・原価の明示訂正、返品と棚卸しをご利用ください。');
  const desired={
    materials:next.items.flatMap(i=>i.customizationRequestedDeltas),products:next.items.filter(i=>i.productId&&!i.inventoryAlreadyApplied).map(i=>({
      productId:i.productId,delta:-i.qty
    }))
  };
  const diffs={
    materials:[],products:[]
  };
  next.moves={
    materials:[],products:[]
  };
  for(const [table,key] of [['materials','materialId'],['products','productId']]){
    const prior=mergedDeltas(old.moves?.[table]||[],key),wanted=mergedDeltas(desired[table],key),ids=new Set([...prior,...wanted].map(m=>m[key]));
    for(const entityId of ids){
      const before=prior.find(m=>m[key]===entityId),after=wanted.find(m=>m[key]===entityId),entity=d[table].find(m=>m.id===entityId),delta=qtyRound((after?.delta||0)-(before?.delta||0));
      if(delta===0){
        if(before)next.moves[table].push(clone(before));
        continue;
      }
      if(before&&(entity?.stockEpoch||0)!==(before.stockEpoch||0))throw Error('この記録後に棚卸しされています。数量・材料の変更を保留しました。現在の実数を確認して棚卸しで訂正してください。');
      diffs[table].push({
        [key]:entityId,delta
      });
      if(after)next.moves[table].push({
        ...after,stockApplied:stockKnown(entity),stockEpoch:entity?.stockEpoch||0
      });
    }
  }
  applyStock(d,diffs.materials,diffs.products,'checkout-correction',id,reason);
  next.soldApplied=next.items.filter(i=>i.productId).map(i=>({
    productId:i.productId,qty:i.qty
  }));
  for(const r of old.soldApplied||[]){
    const p=d.products.find(p=>p.id===r.productId);
    if(p)p.sold=Math.max(0,(p.sold??0)-r.qty);
  }
  for(const r of next.soldApplied){
    const p=d.products.find(p=>p.id===r.productId);
    p.sold=(p.sold??0)+r.qty;
  }
  next.items.forEach(i=>{
    i.inventoryApplied=!!i.productId&&(i.inventoryAlreadyApplied||next.moves.products.some(m=>m.productId===i.productId&&m.stockApplied));
    i.customizationInventoryApplied=!i.customizationPending&&i.customizationRequestedDeltas.every(r=>next.moves.materials.some(m=>m.materialId===r.materialId&&m.stockApplied));
  });
  next.createdAt=old.createdAt;
  next.updatedAt=now();
  audit(d,'checkout-correction',id,old,next,reason);
  d.checkouts[d.checkouts.indexOf(old)]=next;
  return next;
}
export function linkSale(d,{
  id,lineId,productId,alreadyApplied,confirmCost,reason
}) {
  const c=d.checkouts.find(x=>x.id===id),i=c?.items.find(x=>x.lineId===lineId),p=d.products.find(x=>x.id===productId);
  if(!i||!p||c.status==='void')throw Error('会計・商品を確認してください。');
  if(i.productId){
    if(i.productId===productId)return c;
    throw Error('既に別商品へ紐づいています。');
  }
  if(!reason?.trim())throw Error('紐づけ理由を入力してください。');
  const before=clone(c);
  const moves=alreadyApplied?{
    materials:[],products:[]
  }
  :applyStock(d,[],[{
    productId,delta:-i.qty
  }],'checkout-link',id,'後から商品紐づけ');
  c.moves??={
    materials:[],products:[]
  };
  c.moves.products.push(...moves.products);
  i.productId=productId;
  i.inventoryApplied=alreadyApplied||moves.products.some(x=>x.stockApplied);
  i.linkedAt=now();
  i.inventoryAlreadyApplied=alreadyApplied;
  c.soldApplied??=[];
  c.soldApplied.push({
    productId,qty:i.qty
  });
  p.sold=(p.sold??0)+i.qty;
  const inputLine=c.inputSnapshot?.items.find(x=>x.lineId===lineId);
  if(inputLine){
    inputLine.productId=productId;
    inputLine.inventoryAlreadyApplied=alreadyApplied;
  }
  if(confirmCost){
    i.baseUnitCost=productCost(d,p).total;
    i.cost=total([i.baseUnitCost===null?null:i.baseUnitCost*i.qty,(i.hardwareCostDelta??0)*i.qty,i.additionalMaterialUnitCost===null?null:(i.additionalMaterialUnitCost??0)*i.qty,i.packagingCost??0]);
    i.costConfirmed=i.cost!==null;
  }
  refreshSale(c);
  audit(d,'checkout-link',id,before,c,reason);
  return c;
}
function refreshSale(c){
  c.totalCost=total(c.items.map(x=>x.cost));
  c.costConfirmed=c.totalCost!==null;
  c.profit=total([c.finalTotal,c.totalCost===null?null:-c.totalCost,c.paymentFee===null?null:-c.paymentFee,c.platformFee===null?null:-c.platformFee,c.shippingCost===null?null:-(c.shippingCost??0)]);
  c.needsReview=c.eventLinkPending===true||c.items.some(i=>!i.productId||!i.costConfirmed||i.customizationPending)||c.profit===null;
}
export function correctCost(d,id,lineId,cost,reason){
  const c=d.checkouts.find(x=>x.id===id),i=c?.items.find(x=>x.lineId===lineId);
  if(!i||!reason?.trim())throw Error('明細と原価訂正理由を確認してください。');
  const before=clone(c);
  i.cost=number(cost,'訂正後の明細総原価',{
    required:true
  });
  i.costConfirmed=true;
  i.explicitCostCorrection={
    at:now(),reason,total:i.cost
  };
  refreshSale(c);
  audit(d,'cost-correction',id,before,c,reason);
}
export function voidCheckout(d,{
  id,kind,reason,returnProducts=false,returnMaterialIds=[]
}) {
  const c=d.checkouts.find(x=>x.id===id);
  if(!c)throw Error('会計が見つかりません。');
  if(c.status==='void')return c;
  if(!reason?.trim())throw Error('取消理由を入力してください。');
  const before=clone(c);
  let materials=[],products=[];
  if(kind==='error'){
    if(c.migrated)throw Error('旧会計の在庫自動巻戻しはできません。返品を記録し現在庫を棚卸ししてください。');
    checkEpoch(d,c.moves);
    materials=(c.moves?.materials||[]).filter(m=>m.stockApplied).map(m=>({
      materialId:m.materialId,delta:-m.delta
    }));
    products=(c.moves?.products||[]).filter(m=>m.stockApplied).map(m=>({
      productId:m.productId,delta:-m.delta
    }));
  }
  else {
    if(returnProducts)products=c.items.filter(i=>i.productId).map(i=>({
      productId:i.productId,delta:i.qty
    }));
    materials=(c.moves?.materials||[]).filter(m=>m.delta<0&&returnMaterialIds.includes(m.materialId)).map(m=>({
      materialId:m.materialId,delta:-m.delta
    }));
  }
  applyStock(d,materials,products,'checkout-void',id,reason);
  for(const r of c.soldApplied||[]){
    const p=d.products.find(p=>p.id===r.productId);
    if(p)p.sold=Math.max(0,(p.sold??0)-r.qty);
  }
  c.status='void';
  c.voidedAt=now();
  c.voidReason=reason;
  c.voidKind=kind;
  audit(d,'checkout-void',id,before,c,reason);
  return c;
}
export function voidProduction(d,{
  id,kind,reason,returnMaterialIds=[]
}){
  const r=d.productionRecords.find(x=>x.id===id);
  if(!r||r.status==='void')return r;
  if(!reason?.trim())throw Error('理由を入力してください。');
  if(!r.moves)throw Error('旧制作記録の在庫自動訂正は未対応です。現在の実数を棚卸ししてください。');
  if(kind==='error')checkEpoch(d,r.moves);
  const ms=(r.moves.materials||[]).filter(m=>kind==='error'?m.stockApplied:m.delta<0&&returnMaterialIds.includes(m.materialId)).map(m=>({
    materialId:m.materialId,delta:-m.delta
  }));
  applyStock(d,ms,[{
    productId:r.productId,delta:-r.qty
  }],'production-void',id,reason);
  r.status='void';
  r.voidedAt=now();
  r.voidReason=reason;
}
export function eventDates(e) {
  if(!e)return [];
  if(e.daysData?.length)return [...new Set(e.daysData.map(d=>d.date))].filter(validDate).sort();
  const start=e.start||e.startDate;
  if(!validDate(start))return [];
  let days=e.daysCount??e.days??1;
  const end=e.end||e.endDate;
  if(end&&validDate(end))days=Math.round((Date.parse(end)-Date.parse(start))/86400000)+1;
  if(!Number.isFinite(Number(days))||Number(days)<1)return [];
  return Array.from({
    length:Math.min(366,Math.max(1,Number(days)))
  },(_,i)=>new Date(Date.parse(start+'T00:00:00Z')+i*86400000).toISOString().slice(0,10));
}
export function validDate(v){
  return /^\d{4}-\d{2}-\d{2}$/.test(v||'')&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
}
export function saleEventCandidates(d,c) {
  const day=datePart(c.date);
  return day ? d.events.filter(e=>eventDates(e).includes(day)) : [];
}
export function resolveSaleEvent(d,id,choice,reason) {
  const c=d.checkouts.find(c=>c.id===id);
  if(!c||!choice||!reason?.trim())throw Error('イベントの選択と確認理由を入力してください。');
  const event=choice==='__none__'?null:saleEventCandidates(d,c).find(e=>e.id===choice);
  if(choice!=='__none__'&&!event)throw Error('販売日の開催候補から選択してください。');
  if(c.eventLink?.status==='confirmed'&&c.eventId===(event?.id||''))return c;
  const before=clone(c);
  c.eventId=event?.id||'';
  c.eventName=event?.name||'';
  c.eventLinkPending=false;
  c.eventLink={...c.eventLink,status:'confirmed',confirmedAt:now(),reason,selectedEventId:c.eventId};
  if(c.inputSnapshot)c.inputSnapshot.eventId=c.eventId;
  c.needsReview=!!c.eventLink.nonEventNeedsReview||c.items.some(i=>!i.productId||i.costConfirmed===false||i.cost==null||i.customizationPending)||c.totalCost==null||c.paymentFee==null||c.platformFee==null||c.shippingCost==null;
  audit(d,'checkout-event-link',id,before,c,reason);
  return c;
}
export function eventExpense(e){
  return total([e.fee??null,...eventDates(e).map(date=>{
    const d=e.daysData?.find(x=>x.date===date);return d?total([d.transport??null,d.parking??null,...(d.customExpenses||[]).map(x=>x.amount??null)]):null;
  })]);
}
export function analysis(d,{
  eventId='',date='',from='',to=''
}
={
}) {
  const rows=d.checkouts.filter(c=>c.status!=='void'&&(!eventId||c.eventId===eventId)&&(!date||datePart(c.date)===date)&&(!from||datePart(c.date)>=from)&&(!to||datePart(c.date)<=to));
  const byPayment={
  };
  for(const c of rows)byPayment[c.paymentName]=(byPayment[c.paymentName]||0)+(c.finalTotal??0);
  const cost=total(rows.map(c=>c.totalCost??null)),paymentFee=total(rows.map(c=>c.paymentFee??null)),platformFee=total(rows.map(c=>c.platformFee??null)),shippingCost=total(rows.map(c=>c.shippingCost??null)),revenue=sum(rows.map(c=>c.finalTotal)),productNet=sum(rows.map(c=>c.productNet));
  const e=d.events.find(x=>x.id===eventId);
  let expenses=e?eventExpense(e):0;
  if(e&&date){
    const day=e.daysData?.find(x=>x.date===date);
    expenses=day?total([day.transport??null,day.parking??null,...(day.customExpenses||[]).map(x=>x.amount??null)]):null;
  }
  const profit=total([revenue,cost===null?null:-cost,paymentFee===null?null:-paymentFee,platformFee===null?null:-platformFee,shippingCost===null?null:-shippingCost,expenses===null?null:-expenses]);
  return {
    rows,count:rows.length,items:sum(rows.map(c=>sum(c.items.map(i=>i.qty)))),revenue,productNet,cost,paymentFee,platformFee,shippingCost,expenses,profit,byPayment,review:rows.filter(c=>c.needsReview||c.totalCost===null).length
  };
}
export function closeCash(d,raw){
  if(!eventDates(d.events.find(e=>e.id===raw.eventId)).includes(raw.date))throw Error('イベントと対象日を確認してください。');
  const sales=d.checkouts.filter(c=>c.status!=='void'&&c.eventId===raw.eventId&&datePart(c.date)===raw.date&&c.paymentId===raw.cashPaymentId);
  const r={
    ...clone(raw),id:raw.id||uid(),openingCash:number(raw.openingCash,'開始時釣銭',{
      required:true
    }),cashExpenses:number(raw.cashExpenses,'現金経費',{
      required:true
    }),actualCash:number(raw.actualCash,'実残高',{
      required:true
    }),cashSales:sum(sales.map(c=>c.finalTotal)),updatedAt:now()
  };
  r.expectedCash=r.openingCash+r.cashSales-r.cashExpenses;
  r.difference=r.actualCash-r.expectedCash;
  const old=d.cashClosings.find(c=>c.eventId===r.eventId&&c.date===r.date&&c.cashPaymentId===r.cashPaymentId);
  if(old){
    r.id=old.id;
    d.cashClosings[d.cashClosings.indexOf(old)]=r;
  }else d.cashClosings.push(r);
  audit(d,'cash-closing',r.id,old||null,r);
  return r;
}
export function execute(data,operationId,work) {
  if(data.operations.includes(operationId))return {
    data,result:null,duplicate:true
  };
  const next=clone(data);
  const result=work(next);
  next.operations.push(operationId);
  return {
    data:JSON.parse(JSON.stringify(next)),result,duplicate:false
  };
}
