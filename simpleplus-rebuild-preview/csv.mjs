import {csvDateTime,timestamp} from './time.mjs';
import {
  allocate,productCost,costKnown,stockKnown,analysis,eventExpense,eventDates,sum
}
from './domain.mjs';
export const headers={
  sales:['会計ID','状態','販売日時','顧客','顧客区分','商品名','数量','単価','定価合計','値引き','実売上','原価','決済手数料','プラットフォーム手数料','イベント','支払方法','販売先','配送方法','送料','備考','取消日時','取消理由','商品ID','イベントID','明細ID','原価確定状態','本体単位原価','金具価格差単価','金具原価差単価','包材原価配分','在庫処理','会計包材情報','追加加工価格差単価','追加材料原価単価','変更・追加明細JSON','追加材料在庫処理','変更・追加方式'],
  products:['商品ID','商品名','カテゴリ','天然石','販売価格','現在在庫','累計販売','補充基準','一点物','状態','アーカイブ','材料原価','追加原価','総原価','材料表','サイズ','作り方メモ','備考','登録日時'],
  materials:['素材ID','素材名','読み','カテゴリ','管理単位','単価','現在在庫','発注点','お気に入り','アーカイブ','ペア換算','1ペア個数','仕入数量','仕入単位','仕入金額','形状','材質','色','サイズ','仕入先','備考','登録日時','単価確認状態','残数確認状態','金具種類'],
  events:['イベントID','イベント名','会場','開始日','日数','開始時間','終了時間','屋内外','出店料','その他経費','総経費','active売上','販売手数料','会計数','振り返り','設営メモ','日別情報','商品原価','決済手数料','プラットフォーム手数料','最終利益','最終利益率','販売点数','客単価','損益分岐売上','原価確定状態'],
  customers:['顧客ID','呼び名','読み','既知リピーター','好み','備考','アーカイブ','購入回数','購入点数','累計購入額','最終購入日','よく買うカテゴリ','よく買う金具','登録日時'],
  productions:['制作ID','状態','制作日時','商品ID','商品名','制作数','1点原価','総原価','不足了承','材料スナップショット','メモ','取消日時','取消理由'],
  movements:['移動ID','日時','素材ID','素材名','増減','単位','理由','メモ','参照種別','参照ID','登録日時','残数反映'],
  cashClosings:['レジ締めID','イベントID','イベント名','日付','現金支払方法','開始時釣銭','現金売上','現金経費','理論残高','実残高','差額','メモ','登録日時','更新日時']
};
const yes=v=>v?'はい':'いいえ';
export function csvData(d,type){
  let rows=[];
  if(type==='sales')for(const c of d.checkouts){
    const items=c.items.length?c.items:[{
      qty:0,unitPrice:0
    }],gross=items.map(i=>i.listTotal??i.qty*(i.unitPrice+(i.hardwarePriceDelta??0)+(i.additionalPriceDelta??0))),disc=allocate(c.discount??0,gross),weights=gross.map((v,n)=>v-disc[n]),pf=allocate(c.paymentFee??null,weights),platform=allocate(c.platformFee??null,weights);
    items.forEach((i,n)=>rows.push([c.id,c.status,csvDateTime(c.date),c.customerName,c.customerType,i.name,i.qty,i.unitPrice,gross[n],disc[n],weights[n],i.costConfirmed===false?null:i.cost,pf[n],platform[n],c.eventName,c.paymentName,c.platformName,c.shippingName,n===0?c.shippingCharge:0,c.note,csvDateTime(c.voidedAt),c.voidReason,i.productId,c.eventId,i.lineId,i.cost==null||i.costConfirmed===false?'未確定':'確定',i.baseUnitCost,i.hardwarePriceDelta??0,i.hardwareCostDelta,i.packagingCost,i.inventoryApplied===true?'済':'保留',JSON.stringify(c.packaging||{
    }),i.additionalPriceDelta??0,i.additionalMaterialUnitCost,JSON.stringify(i.customizations||[]),(i.customizations||[]).length?(i.customizationInventoryApplied?'済':'保留'):'対象外',(i.customizations||[]).map(x=>x.type==='hardware'?'金具交換':'追加セット').join('+')||((i.hardwarePriceDelta||i.hardwareCostDelta)?'旧手入力':'なし')]));
  }
  else if(type==='materials')rows=d.materials.map(m=>[m.id,m.name,m.reading,m.category,m.unit,costKnown(m)?m.unitCost:null,stockKnown(m)?m.stock:null,m.reorder,yes(m.favorite),yes(m.archived),yes(m.pairConvertible),m.unitsPerPair,m.purchaseQty,m.purchaseUnit,m.purchaseTotal,m.shape,m.material,m.color,m.size,m.supplier,m.note,csvDateTime(m.createdAt),costKnown(m)?'確定':'未確認',stockKnown(m)?'確定':'未確認',m.hardwareType]);
  else if(type==='products')rows=d.products.map(p=>{
    const cost=productCost(d,p);return [p.id,p.name,p.category,p.stone,p.price,p.stock,p.sold,p.min,yes(p.one),p.stock===0?'売切':p.stock==null?'在庫未確認':p.status||'販売可能',yes(p.archived),cost.recipeCost,p.costAdjust,cost.total,(p.recipe||[]).map(r=>`${d.materials.find(m=>m.id===r.materialId)?.name||r.materialId}:${r.qty}${r.usageUnit}`).join(' / '),p.size,p.howto,p.note,csvDateTime(p.createdAt)];
  });
  else if(type==='events')rows=d.events.map(e=>{
    const a=analysis(d,{
      eventId:e.id
    }),expense=eventExpense(e);return [e.id,e.name,e.venue,e.start,eventDates(e).length,e.startTime,e.endTime,e.indoor,e.fee,expense===null||e.fee==null?null:expense-e.fee,expense,a.revenue,a.paymentFee==null||a.platformFee==null?null:a.paymentFee+a.platformFee,a.count,e.note,e.setup,JSON.stringify(e.daysData),a.cost,a.paymentFee,a.platformFee,a.profit,a.profit===null||!a.revenue?null:a.profit/a.revenue*100,a.items,a.count?a.revenue/a.count:0,null,a.cost===null||expense===null?'未確定':'確定'];
  });
  else if(type==='customers')rows=d.customers.map(c=>{
    const sales=d.checkouts.filter(s=>s.status!=='void'&&s.customerId===c.id);const cats={
    },hardware={
    };for(const s of sales)for(const i of s.items){
      if(i.category)cats[i.category]=(cats[i.category]||0)+i.qty;for(const op of i.customizations||[])if(op.type==='hardware'){
        const name=op.rows?.[1]?.materialName||op.to?.materialName||'';if(name)hardware[name]=(hardware[name]||0)+i.qty;
      }
    }
    const top=o=>Object.keys(o).sort((a,b)=>o[b]-o[a])[0]||'';return [c.id,c.name,c.reading,yes(c.knownRepeat),c.preference,c.note,yes(c.archived),sales.length,sum(sales.map(s=>sum(s.items.map(i=>i.qty)))),sum(sales.map(s=>s.finalTotal)),csvDateTime(sales.map(s=>s.date).sort((a,b)=>timestamp(a)-timestamp(b)).at(-1)),top(cats),top(hardware),csvDateTime(c.createdAt)];
  });
  else if(type==='productions')rows=d.productionRecords.map(r=>[r.id,r.status,csvDateTime(r.date),r.productId,r.productName,r.qty,r.costConfirmed===false?null:r.costPerItem,r.costConfirmed===false?null:r.totalCost,yes(r.shortageApproved),JSON.stringify(r.ingredients||[]),r.memo,csvDateTime(r.voidedAt),r.voidReason]);
  else if(type==='movements')rows=d.stockMovements.map(m=>[m.id,csvDateTime(m.date),m.materialId,m.materialName,m.delta,m.unit,m.reason,m.note,m.refType,m.refId,csvDateTime(m.createdAt),m.stockApplied===false?'残数未確認・使用量のみ':'反映済み']);
  else if(type==='cashClosings')rows=d.cashClosings.map(c=>[c.id,c.eventId,d.events.find(e=>e.id===c.eventId)?.name,c.date,d.settings.paymentMethods.find(p=>p.id===c.cashPaymentId)?.name,c.openingCash,c.cashSales,c.cashExpenses,c.expectedCash,c.actualCash,c.difference,c.note,csvDateTime(c.createdAt),csvDateTime(c.updatedAt)]);
  else throw Error('CSV種類が不明です。');
  return {
    headers:headers[type],rows
  };
}
export function escapeCsv(v){
  const s=v==null?'':typeof v==='object'?JSON.stringify(v):String(v);
  return /[,"\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;
}
export function csv(d,type){
  const {
    headers,rows
  }
  =csvData(d,type);
  return '\uFEFF'+[headers,...rows].map(r=>r.map(escapeCsv).join(',')).join('\r\n');
}
