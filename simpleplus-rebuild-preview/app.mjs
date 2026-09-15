import * as D from './domain.mjs';
import {pwa,startPwa,installApp,requestPersistentStorage,activateUpdate} from './pwa.mjs';
import {
  Repository,readDrafts,writeDrafts
}
from './storage.mjs';
import {
  intakePreview,stageIntake,commitIntake
}
from './intake.mjs';
import {
  backup,migrationPreview
}
from './migration.mjs';
import {
  csv,csvData
}
from './csv.mjs';
const repo=new Repository();
const ui={
  route:'home',forms:new Map(),drafts:readDrafts(),filter:{
  },saveStatus:'起動中',conflict:false
};
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}
[c]));
const pathGet=(o,path)=>path.split('.').reduce((v,k)=>v?.[k],o);
function pathSet(o,path,v){
  const parts=path.split('.');
  let at=o;
  for(const p of parts.slice(0,-1)){
    at[p]??={
    };
    at=at[p];
  }
  at[parts.at(-1)]=v;
}
const data=()=>repo.data;
const badge=(s,warn=false)=>`<span class="badge ${warn?'warn':''}">${esc(s)}</span>`;
const button=(action,text,extra='',cls='')=>`<button type="button" data-action="${action}" ${extra} class="${cls}">${text}</button>`;
const option=(v,label,selected)=>`<option value="${esc(v)}" ${String(selected??'')===String(v)?'selected':''}>${esc(label)}</option>`;
const options=(rows,selected,empty='選択してください')=>option('',empty,selected)+rows.map(x=>option(x.id,x.name,selected)).join('');
const money=D.money;
const categories=['','石','金具','ワイヤー','チェーン','その他'];
const hardwareTypes=['','ピアス','イヤリング','キャッチ','丸カン・接続パーツ','留め具','その他'];
const units=['','粒','個','ペア','cm','g','本','セット','その他'];
const purchasedUnits=[...units,'mm','m','連','袋','巻'];
function field(f,path,label,type='text',extra='') {
  const v=pathGet(f.obj,path);
  return `<label>${esc(label)}<input aria-label="${esc(label)}" data-bind="${path}" type="${type}" value="${esc(v)}" ${type==='number'?'step="any" inputmode="decimal"':''} ${extra}></label>`;
}
function select(f,path,label,choices,extra=''){
  const v=pathGet(f.obj,path);
  return `<label>${esc(label)}<select aria-label="${esc(label)}" data-bind="${path}" ${extra}>${choices.map(c=>Array.isArray(c)?option(c[0],c[1],v):option(c,c||'未確認',v)).join('')}</select></label>`;
}
function masterSelect(f,path,label,rows,empty='選択なし'){
  return `<label>${label}<select aria-label="${esc(label)}" data-bind="${path}">${options(rows,pathGet(f.obj,path),empty)}</select></label>`;
}
function area(f,path,label){
  return `<label>${esc(label)}<textarea aria-label="${esc(label)}" data-bind="${path}">${esc(pathGet(f.obj,path))}</textarea></label>`;
}
function check(f,path,label){
  return `<label class="check"><input aria-label="${esc(label)}" type="checkbox" data-bind="${path}" ${pathGet(f.obj,path)?'checked':''}>${esc(label)}</label>`;
}
function details(title,content,open=false){
  return `<details ${open?'open':''}><summary>${title}</summary><div class="detailsbody">${content}</div></details>`;
}
function thumb(x){
  return x.image&&/^data:image\/(png|jpeg|webp);base64,/.test(x.image)?`<img class="thumb" src="${esc(x.image)}" alt="${esc(x.name)}">`:'<div class="thumb" aria-hidden="true">◇</div>';
}
function notice(s,warn=false){
  return `<div class="notice ${warn?'warn':''}">${s}</div>`;
}
function empty(s,action=''){
  return `<div class="empty">${s}${action?`<div class="actions" style="justify-content:center;margin-top:16px">${action}</div>`:''}</div>`;
}
function toast(msg){
  $('#toast').textContent=msg;
  $('#toast').classList.add('show');
  clearTimeout(ui.toast);
  ui.toast=setTimeout(()=>$('#toast').classList.remove('show'),4500);
}
function fail(error,f){
  const msg=error?.message||String(error);
  if(f){
    const el=document.querySelector(`#${f.id} .error`);
    if(el){
      el.textContent=msg;
      el.scrollIntoView({
        block:'nearest'
      });
    }
  }else toast(msg);
}
const nav=[['home','⌂','ホーム'],['materials','◇','素材'],['products','◈','商品・制作'],['sales','▣','売上'],['events','□','イベント・予定'],['customers','♧','顧客'],['inventory','≋','在庫・履歴'],['analysis','▥','基本分析'],['settings','⚙','データ・設定']];
function render(){
  $('#root').innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand">Simple<b>+</b><small>MAKE • SELL • KEEP</small></div><nav>${nav.map(([id,icon,name])=>button('route',`<span class="icon">${icon}</span>${name}`,`data-route="${id}"`,ui.route===id?'active':'')).join('')}</nav><div class="foot">Rebuild v0.1.1 Mobile Preview<br>必要な素材から、少しずつ。<br>このブラウザ内に保存</div></aside><main class="workspace"><header class="topbar"><div class="actions">${button('menu','☰','','mobile-menu')}<span class="small muted">Simple+ ／ ${nav.find(n=>n[0]===ui.route)?.[2]}</span></div><div class="actions"><span class="status" id="storageStatus">${esc(ui.saveStatus)}</span><span class="badge version">v0.1.1 Mobile Preview</span></div></header>${ui.conflict?notice('別のタブの更新があります。入力を保留して最新の内容を確認してください。 '+button('reload','最新データを読み直す'),true):''}<div id="page">${page()}</div><p class="footnote">${D.APP} · 端末ごとの保存 / バックアップは「データ・設定」へ</p></main><nav class="bottomnav">${nav.slice(0,4).map(([id,icon,name])=>button('route',`<span class="icon">${icon}</span>${name}`,`data-route="${id}"`,ui.route===id?'active':'')).join('')}${button('menu','<span class="icon">☰</span>その他')}</nav></div>`;
}
function heading(title,sub,actions=''){
  return `<div class="pagehead"><div><div class="eyebrow">${sub}</div><h1>${title}</h1></div><div class="actions">${actions}</div></div>`;
}
function draftbar(kind,label){
  return ui.drafts[kind]?`<div class="draftbar"><span>${label}の入力途中データがあります</span>${button('resume','続きから入力',`data-kind="${kind}"`)}</div>`:'';
}
function page(){
  switch(ui.route){
    case'home':return home();
    case'materials':return materialsPage();
    case'products':return productsPage();
    case'sales':return salesPage();
    case'events':return eventsPage();
    case'customers':return customersPage();
    case'inventory':return inventoryPage();
    case'analysis':return analysisPage();
    case'settings':return settingsPage();
  }
}
function home(){
  const d=data(),ready=d.materials.filter(D.costKnown).length,a=D.analysis(d,{
    date:D.dateToday()
  }),mode=d.settings.eventMode;
  return heading('今日のしごと','YOUR LITTLE WORKSHOP',button('sale-new','＋ 売上を記録','','primary'))+`<div class="mobile-start"><span data-pwa-status>${pwaStatus()}</span>${button('route','スマホへの追加・保存','data-route="settings"')}</div>`+draftbar('sale','会計')+draftbar('product','商品')+draftbar('material','素材')+(mode?.active?notice(`出店モード：${esc(d.events.find(e=>e.id===mode.eventId)?.name)} ／ ${esc(mode.date)} ${button('event-close','営業終了・レジ締め',`data-id="${esc(mode.eventId)}"`)}`):'')+`<section class="hero"><div><div class="eyebrow">START WITH ONE MATERIAL</div><h2>必要な素材から、<br>小さくはじめる。</h2><p>すべての材料を揃えなくても大丈夫。<br>購入情報を入れたら、その場で単価を計算。<br>使う分だけ登録して、作品づくりへ進めます。</p><div class="actions">${button('intake-open','素材をまとめて追加','','primary')}${button('material-new','1件だけ追加')}</div></div><div class="hero-art" aria-hidden="true"><span class="bead"></span><span class="bead"></span><span class="bead"></span></div></section><div class="grid three">${[['01','素材を準備する',`${ready}件が原価計算に使えます`,'materials','素材をひらく'],['02','作品の原価をみる',`${d.products.filter(p=>!p.archived).length}件の商品・材料表`,'products','商品をひらく'],['03','販売を記録する',`今日 ${a.count}会計・${money(a.revenue)}`,'sales','売上をひらく']].map(x=>`<section class="card"><p class="step">STEP ${x[0]}</p><h3>${x[1]}</h3><p class="muted">${x[2]}</p>${button('route',x[4]+' →',`data-route="${x[3]}"`,'text')}</section>`).join('')}</div><section class="section"><h2>あとで整える</h2><div class="grid two"><div class="card"><h3>素材の保留候補 ${d.materialIntake.length}件</h3><p class="muted">分からない行は残して、確認できた素材から登録。</p>${button('intake-list','候補を確認')}</div><div class="card"><h3>記録済み・要整理 ${d.checkouts.filter(c=>c.status!=='void'&&c.needsReview).length}件</h3><p class="muted">未登録商品の紐づけや、原価の確認はこちら。</p>${button('route','売上履歴を確認','data-route="sales"')}</div></div></section>`;
}
function searchToolbar(kind,withMaterial=false){
  const f=ui.filter[kind]||{
  };
  return `<div class="toolbar"><label class="search">検索<input aria-label="検索" data-filter="${kind}" data-key="q" type="search" value="${esc(f.q)}" placeholder="${withMaterial?'名前・サイズ・材質・仕入先':'名前・メモで探す'}"></label>${withMaterial?`<label>分類<select aria-label="分類" data-filter="${kind}" data-key="category">${['すべて','未分類',...categories.filter(Boolean)].map(x=>option(x,x,f.category||'すべて')).join('')}</select></label><label>金具の用途<select aria-label="金具の用途" data-filter="${kind}" data-key="hardware">${['すべて','未分類',...hardwareTypes.filter(Boolean)].map(x=>option(x,x,f.hardware||'すべて')).join('')}</select></label><label>表示順<select aria-label="表示順" data-filter="${kind}" data-key="sort">${['最近登録','名前順','最近使った'].map(x=>option(x,x,f.sort||'最近登録')).join('')}</select></label>`:''}<label class="check"><input type="checkbox" data-filter="${kind}" data-key="archived" ${f.archived?'checked':''}>保管済みを含む</label></div>`;
}
function filtered(rows,kind){
  const f=ui.filter[kind]||{
  },q=(f.q||'').normalize('NFKC').toLowerCase();
  return rows.filter(x=>(!x.archived||f.archived)&&(!q||[x.name,x.note,x.size,x.shape,x.material,x.color,x.supplier,x.reading].join(' ').normalize('NFKC').toLowerCase().includes(q))&&(!f.category||f.category==='すべて'||(f.category==='未分類'?!x.category||x.category==='その他':x.category===f.category))&&(!f.hardware||f.hardware==='すべて'||(x.category==='金具'&&(f.hardware==='未分類'?!x.hardwareType:x.hardwareType===f.hardware)))).sort((a,b)=>f.sort==='名前順'?String(a.name).localeCompare(String(b.name),'ja'):f.sort==='最近使った'?(data().settings.recentMaterialIds.indexOf(a.id)<0?999:data().settings.recentMaterialIds.indexOf(a.id))-(data().settings.recentMaterialIds.indexOf(b.id)<0?999:data().settings.recentMaterialIds.indexOf(b.id)):String(b.createdAt||'').localeCompare(String(a.createdAt||'')));
}
function materialList(kind='materials',pick=false){
  const ms=filtered(data().materials,kind);
  return ms.length?`<div class="list">${ms.map(m=>`<div class="row ${m.archived?'archive':''}">${thumb(m)}<div class="grow"><div class="title">${esc(m.name)}</div><div class="meta">${esc([m.category,m.hardwareType,m.size,m.material,m.supplier].filter(Boolean).join(' / '))}</div><div>${badge(D.costKnown(m)?'原価計算に使えます':'単価・単位をあとで確認',!D.costKnown(m))} ${badge(D.stockKnown(m)?`残 ${m.stock}${m.unit}`:'残数未確認',!D.stockKnown(m))}</div></div><div class="right"><div class="price">${D.costKnown(m)?money(m.unitCost):'単価未確認'}</div><div class="small muted">${m.unit?' / '+esc(m.unit):'単位未確認'}</div></div>${button(pick?'picker-select':'material-edit',pick?'選ぶ':'確認・編集',`data-id="${esc(m.id)}"`)}</div>`).join('')}</div>`:empty('見つかる素材がありません。使う素材だけ先に追加できます。');
}
function materialsPage(){
  return heading('素材','MATERIALS',button('intake-open','まとめて追加')+button('material-new','＋ 素材を追加','','primary'))+draftbar('material','素材')+notice('チャットで整理した素材追加用JSONを取り込めます。写真のAI解析はアプリ内では行いません。')+(data().materialIntake.length?notice(`保留候補 ${data().materialIntake.length}件 ${button('intake-list','不足情報を補う')}`):'')+searchToolbar('materials',true)+`<div id="materialResults">${materialList()}</div>`;
}
function productsPage(){
  const ps=filtered(data().products,'products');
  return heading('商品と制作','PRODUCTS & MAKING',button('product-new','＋ 商品を作る','','primary'))+draftbar('product','商品')+searchToolbar('products')+`<div class="list">${ps.map(p=>{const c=D.productCost(data(),p);return `<div class="row">${thumb(p)}<div class="grow"><div class="title">${esc(p.name)} ${p.one?badge('一点物'):''}</div><div class="meta">${esc(p.category)} ／ 材料 ${(p.recipe||[]).length}種類</div>${badge(p.stock==null?'在庫未確認':p.stock===0?'売切':`完成品 ${p.stock}点`,p.stock===0||p.stock==null)} ${p.stock>0&&p.min!=null&&p.stock<=p.min?badge('補充必要',true):''}</div><div class="right"><div class="price">${money(p.price)}</div><div class="small muted">原価 ${money(c.total)}</div></div><div class="actions">${button('product-edit','材料表・編集',`data-id="${esc(p.id)}"`)}${button('produce-open','制作',`data-id="${esc(p.id)}"`)}</div></div>`;}).join('')||empty('使う素材を選んで、最初の商品を作りましょう。',button('product-new','商品を作る','','primary'))}</div>`;
}
function salesPage(){
  const filter=ui.filter.sales||{
  };
  const cs=data().checkouts.filter(c=>(!filter.q||JSON.stringify([c.note,c.items.map(i=>i.name),c.customerName]).includes(filter.q))&&(!filter.review||c.needsReview)).sort((a,b)=>(D.timestamp(b.date)||0)-(D.timestamp(a.date)||0));
  return heading('売上の記録','SALES',button('sale-new','＋ 売上を記録','','primary'))+draftbar('sale','会計')+searchToolbar('sales')+`<label class="check"><input type="checkbox" data-filter="sales" data-key="review" ${filter.review?'checked':''}>記録済み・要整理だけ表示</label><div class="list sales-list">${cs.map(c=>`<div class="row"><div class="grow"><div class="title">${esc(c.items.map(i=>i.name).join(' / '))}</div><div class="meta">${esc(D.formatDateTime(c.date))} ／ ${esc(c.paymentName)} ／ ${esc(c.eventName||'イベント指定なし')}</div>${badge(c.status==='void'?'取消済み':c.needsReview?'記録済み・要整理':'記録済み',c.needsReview)} ${c.eventLinkPending?badge('イベント要確認',true):''} ${c.items.some(i=>!i.productId)?badge('商品紐づけ待ち',true):''}</div><div class="right"><div class="price">${money(c.finalTotal)}</div><div class="small muted">原価 ${money(c.totalCost)}</div></div>${button('sale-detail','詳細・整理',`data-id="${esc(c.id)}"`)}</div>`).join('')||empty('通常販売も、未登録商品の販売もここから記録できます。')}</div>`;
}
function eventsPage(){
  return heading('イベントと予定','EVENTS & PLANS',button('plan-new','＋ 予定')+button('event-new','＋ イベント','','primary'))+`<div class="list">${data().events.map(e=>{const a=D.analysis(data(),{eventId:e.id});return `<div class="row"><div class="grow"><div class="title">${esc(e.name)}</div><div class="meta">${esc(D.eventDates(e).join(' ／ '))} · ${esc(e.venue)}</div>${badge(`${a.count}会計 / ${money(a.revenue)}`)}</div><div class="actions">${button('event-mode','出店モード',`data-id="${esc(e.id)}"`)}${button('event-close','日別・営業終了',`data-id="${esc(e.id)}"`)}${button('event-edit','編集',`data-id="${esc(e.id)}"`)}</div></div>`;}).join('')||empty('2日以上の開催も、同じイベントの日別記録として管理します。')}</div><section class="section"><h2>制作・出店の予定</h2><div class="list">${data().plans.map(p=>`<div class="row"><div class="grow"><div class="title">${esc(p.name)}</div><div class="meta">${esc(p.date)} ／ ${esc(p.note)}</div>${badge(p.done?'完了':'予定')}</div>${button('plan-edit','編集',`data-id="${esc(p.id)}"`)}</div>`).join('')||empty('必要な予定だけ追加できます。')}</div></section>`;
}
function customersPage(){
  return heading('お客さま','CUSTOMERS',button('customer-new','＋ 顧客を追加','','primary'))+searchToolbar('customers')+`<div class="list">${filtered(data().customers,'customers').map(c=>{const sales=data().checkouts.filter(x=>x.customerId===c.id&&x.status!=='void');return `<div class="row"><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta">${esc(c.preference||c.note)}</div>${badge(`${sales.length}回 / ${money(D.sum(sales.map(s=>s.finalTotal)))}`)}</div>${button('customer-edit','詳細・編集',`data-id="${esc(c.id)}"`)}</div>`;}).join('')||empty('顧客登録は任意です。登録しなくても売上を記録できます。')}</div>`;
}
function inventoryPage(){
  return heading('在庫と履歴','STOCK & HISTORY',button('stock-open','＋ 素材の入荷・使用を記録','','primary')+button('route','素材の残数を確認','data-route="materials"'))+notice('残数未確認の素材は使用量だけを記録します。棚卸しで入力した現在数から、過去の使用量を引き直すことはありません。')+`<h2>制作履歴</h2><div class="list">${[...data().productionRecords].reverse().slice(0,100).map(r=>`<div class="row"><div class="grow"><b>${esc(r.productName)} × ${r.qty}</b><div class="meta">${esc(D.formatDateTime(r.date))} ／ 原価 ${money(r.totalCost)} ／ ${r.status==='void'?'取消済み':'制作済み'}</div></div>${r.status!=='void'?button('production-cancel','訂正・解体',`data-id="${esc(r.id)}"`):''}</div>`).join('')||empty('制作すると、完成品と使用材料の履歴が残ります。')}</div><section class="section"><h2>素材の在庫移動</h2><div class="tablewrap"><table><thead><tr><th>日時・材料</th><th>増減</th><th>残数反映</th><th>理由</th></tr></thead><tbody>${[...data().stockMovements].reverse().slice(0,200).map(m=>`<tr><td>${esc(D.formatDateTime(m.date))}<br>${esc(m.materialName)}</td><td>${esc(m.delta)}${esc(m.unit)}</td><td>${m.stockApplied===false?'残数未確認・使用量のみ':`反映後 ${esc(m.balanceAfter??'旧記録')}`}</td><td>${esc(m.reason)}</td></tr>`).join('')}</tbody></table></div></section><section class="section"><h2>訂正・保存の記録</h2><div class="tablewrap"><table><thead><tr><th>日時</th><th>操作</th><th>理由</th></tr></thead><tbody>${[...data().audit].reverse().slice(0,100).map(a=>`<tr><td>${esc(D.formatDateTime(a.at))}</td><td>${esc(a.kind)}</td><td>${esc(a.reason)}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function stats(a){
  return `<div class="grid three stats">${[['商品売上',money(a.productNet)],['送料込み請求額',money(a.revenue)],['商品・包装原価',money(a.cost)],['決済・販売先手数料',money(D.total([a.paymentFee,a.platformFee]))],['確定利益',money(a.profit)],['会計 / 要整理',`${a.count} / ${a.review}`]].map(([label,v])=>`<div class="card"><div class="small muted">${label}</div><div class="metric">${v}</div></div>`).join('')}</div>`;
}
function analysisPage(){
  const f=ui.filter.analysis||{
  },a=D.analysis(data(),{
    eventId:f.eventId,from:f.from,to:f.to
  });
  return heading('基本分析','LOOK BACK')+`<div class="toolbar"><label>イベント<select data-filter="analysis" data-key="eventId">${options(data().events.map(e=>({...e,name:e.name+' '+D.eventDates(e)[0]})),f.eventId,'すべて')}</select></label><label>開始日<input type="date" data-filter="analysis" data-key="from" value="${esc(f.from)}"></label><label>終了日<input type="date" data-filter="analysis" data-key="to" value="${esc(f.to)}"></label></div>`+stats(a)+notice('取消済みを除外。原価・手数料・実送料・選択イベントの経費のいずれかが不明なら利益は未確定です。送料込み請求額から実送料を引きます。イベント未選択の利益はイベント経費を引く前の値です。')+`<section class="section"><h2>支払方法別</h2><div class="card">${Object.entries(a.byPayment).map(([n,v])=>`<div class="statline"><span>${esc(n)}</span><b>${money(v)}</b></div>`).join('')||'記録がありません'}</div></section>`;
}
function settingsPage(){
  return heading('データと設定','DATA & SETTINGS')+`<section id="pwa-panel" class="section card">${pwaPanel()}</section>`+`<div class="grid two"><section class="card"><h2>バックアップ</h2><p class="muted">画像・売上・履歴・保留候補を含めて保存します。</p><div class="actions">${button('backup','JSONを書き出す','','primary')}${button('restore-open','バックアップ復元・旧JSON移行')}</div><p class="small muted">素材を追加するJSONは、素材画面から読み込みます。</p></section><section class="card"><h2>料金・業務設定</h2><p class="muted">共通料金ルールは、設定するまで未設定です。</p>${button('settings-edit','料金・支払方法・販売先の設定')}</section></div><section class="section card"><h2>CSV出力</h2><p class="muted">旧列名・列順を維持。未確認の数値は空欄です。</p><div class="actions">${[['sales','売上'],['materials','素材'],['products','商品'],['events','イベント'],['customers','顧客'],['productions','制作履歴'],['movements','素材在庫移動'],['cashClosings','レジ締め']].map(([id,label])=>button('csv',label+'CSV',`data-type="${id}"`)).join('')}</div></section><section class="section card"><h2>使い方</h2><ol><li>チャットで整理したJSONを「素材 → まとめて追加」で確認します。</li><li>分かる項目を補い、登録する行を選んで保存します。</li><li>「商品・制作」で素材と使用量を選ぶと原価が表示されます。</li><li>「売上」で商品、数量、販売額を確認して保存します。</li><li>一日の終わりにJSONバックアップを書き出します。</li></ol>${notice('本アプリのAI画像解析・音声入力・複数端末の自動同期はありません。写真は端末内に保存し、外部へ送信しません。')}<p class="small">実データ移行・実スマホ・外部Event Analyzerは開発時未検証。詳しくは同梱のTEST_REPORTとデータ移行手順をご確認ください。</p></section>`;
}
function openForm(kind,obj={
},meta={
}){
  const f={
    id:'dialog-'+D.uid(),kind,obj:D.clone(obj),operationId:D.uid(),...meta
  };
  ui.forms.set(f.id,f);
  const dlg=document.createElement('dialog');
  dlg.id=f.id;
  dlg.dataset.modal=f.id;
  if(['sale','intakeList','restore','closing','settings'].includes(kind))dlg.className='wide';
  $('#dialogs').append(dlg);
  dlg.addEventListener('cancel',e=>{
    e.preventDefault();closeForm(f,true);
  });
  renderForm(f);
  dlg.showModal();
  return f;
}
function closeForm(f,keep=false){
  if(!f.metaCandidate&&['material','product','sale'].includes(f.kind)){
    if(keep)ui.drafts[f.kind]=D.clone(f.obj);
    else delete ui.drafts[f.kind];
    try{
      writeDrafts(ui.drafts);
    }catch(e){
      toast('下書きの保存容量が不足しています。画面を閉じる前にJSONを書き出してください。');
    }
  }
  document.getElementById(f.id)?.remove();
  ui.forms.delete(f.id);
  render();
}
function remember(f){
  if(!f.metaCandidate&&['material','product','sale'].includes(f.kind)){
    ui.drafts[f.kind]=D.clone(f.obj);
    try{
      writeDrafts(ui.drafts);
    }catch{
      fail(Error('下書きを保存できません。入力はこの画面に残っています。容量を確認してください。'),f);
    }
  }
}
function formTitle(f){
  return {
    material:f.metaCandidate?'候補の不足情報を補う':f.obj.id&&data().materials.some(m=>m.id===f.obj.id)?'素材を確認・編集':'素材を簡易登録',product:'商品と材料表',sale:f.editId?'会計の入力訂正':'売上を記録',picker:'素材を選ぶ',intakeOpen:'素材をまとめて追加',intakePreview:'読み込んだ候補を確認',intakeList:'素材の保留候補',restoreOpen:'バックアップ復元・旧JSON移行',restore:'移行・復元プレビュー',stock:'素材の入荷・使用',production:'制作を記録',saleDetail:'会計の詳細',link:'後から商品に紐づけ',cancel:'会計の取消・返品',cost:'原価を明示訂正',customer:'顧客の情報',event:'イベントの情報',mode:'出店モード',closing:'営業終了・日別集計',cash:'日別レジ締め',plan:'予定',settings:'料金と業務設定',productionCancel:'制作の訂正・解体',stale:'出店日の確認',eventLink:'イベント紐づけの確認'
  }
  [f.kind]||f.kind;
}
function renderForm(f){
  const dlg=document.getElementById(f.id);
  if(!dlg)return;
  dlg.innerHTML=`<div class="dialoghead"><h2>${formTitle(f)}</h2>${button('close','×','aria-label="閉じる"','text')}</div><div class="dialogbody"><div class="error" role="alert"></div>${formBody(f)}</div><div class="dialogfoot">${f.kind === 'material' ? '<div data-sticky-cost class="stickycost" aria-live="polite"></div>' : ''}${formFooter(f)}</div>`;
  refresh(f);
}
function formBody(f){
  switch(f.kind){
    case'material':return materialForm(f);
    case'product':return productForm(f);
    case'sale':return saleForm(f);
    case'picker':return pickerForm(f);
    case'intakeOpen':case'restoreOpen':return importForm(f);
    case'intakePreview':return intakePreviewForm(f);
    case'intakeList':return intakeListForm(f);
    case'restore':return restoreForm(f);
    case'stock':return stockForm(f);
    case'production':return productionForm(f);
    case'saleDetail':return saleDetailForm(f);
    case'link':return linkForm(f);
    case'eventLink':return eventLinkForm(f);
    case'cancel':case'productionCancel':return cancelForm(f);
    case'cost':return costForm(f);
    case'customer':return customerForm(f);
    case'event':return eventForm(f);
    case'mode':return modeForm(f);
    case'closing':return closingForm(f);
    case'cash':return cashForm(f);
    case'plan':return planForm(f);
    case'settings':return settingsForm(f);
    case'stale':return notice(`前回の出店日 ${esc(f.obj.previous)} が残っています。今日の会計を記録するか、前日分を追加入力するか選んでください。`,true);
  }
}
function formFooter(f){
  if(f.kind==='stale')return button('stale-today','今日の会計')+button('stale-previous','前日分の追加入力');
  if(['picker','saleDetail','closing'].includes(f.kind))return button('close','閉じる');
  if(f.kind==='intakeOpen'||f.kind==='restoreOpen')return button('close','戻る')+button('parse-import','内容を確認','','primary');
  if(f.kind==='intakePreview')return button('close','戻る')+button('stage-intake','確認して候補を保存','','primary');
  if(f.kind==='intakeList')return button('close','保留して閉じる')+button('commit-intake','選んだ候補を登録','','primary');
  if(f.kind==='restore')return button('close','戻る')+button('restore-commit','確認して復元する','','primary');
  if(f.kind==='material'&&f.metaCandidate)return button('close','戻る')+button('save-form','候補の補足を保存','','primary');
  return button('close',['material','product','sale'].includes(f.kind)?'下書きに保留':'戻る')+button('save-form',f.kind==='sale'?'売上を保存':f.kind==='cancel'?'取消・返品を記録':'保存する','','primary');
}
function materialForm(f){
  const m=f.obj;
  return `<p class="muted">名前か写真だけでも保存できます。単価が分かれば、残数未確認でも作品の原価計算へ。</p>${field(f,'name','素材名')}<div class="grid two">${select(f,'category','分類',categories)}${select(f,'hardwareType','金具の用途',hardwareTypes)}</div><div class="grid two">${select(f,'unit','原価計算の単位',units)}${select(f,'unitCostMode','単価の決め方',[['auto','自動計算'],['manual','手入力で確定']])}</div><div class="linebox"><h3>購入したときの情報</h3><div class="grid two">${field(f,'purchaseTotal','購入金額（円）','number')}${field(f,'purchaseQty','購入数量','number')}${select(f,'purchaseUnit','購入書類の単位',purchasedUnits)}${field(f,'allocatedShipping','配分送料（円・空欄は未確認）','number')}</div>${check(f,'shippingIncluded','購入金額に送料が含まれている')}<div data-calc="material" class="summary"></div></div>${field(f,'unitCost','単価（円）','number',m.unitCostMode==='auto'?'readonly':'')}${check(f,'unitCostConfirmed','表示した単価を確認済みにする')}<div class="grid two">${field(f,'stock','現在の実残数（空欄は未確認）','number')}${field(f,'size','サイズ')}</div>${notice('購入数量を現在残数へコピーしません。残数は、今ある数を確認できたときだけ入力してください。')}${details('写真・出典・換算などを追加',`<label class="filelabel">写真（PNG・JPEG・WebP / 3MB以下）<input type="file" data-photo accept="image/png,image/jpeg,image/webp"></label><div data-photo-preview>${m.image?`<img class="previewimage" src="${esc(m.image)}" alt="素材写真">`:''}</div><div class="grid two">${field(f,'supplier','仕入先')}${field(f,'purchaseDate','購入日','date')}${field(f,'shape','形状')}${field(f,'material','材質')}${field(f,'color','色')}${field(f,'reading','読み')}</div>${field(f,'source','出典・購入履歴の識別情報')}${area(f,'note','メモ・税や値引きの根拠')}${check(f,'pairConvertible','個・ペア換算を明示的に許可')}${field(f,'unitsPerPair','1ペアに含まれる個数','number')}${field(f,'purchaseConversion','購入1単位あたりの管理数量（根拠がある場合のみ）','number')}${field(f,'reorder','補充確認の基準数量','number')}${check(f,'favorite','お気に入り')}${check(f,'archived','保管済みにする（履歴は残す）')}`)}${f.metaCandidate?notice('ここでは候補を補足します。素材台帳への登録は、候補一覧で選んでから行います。'):''}`;
}
function rowEditor(f,path,row){
  const m=data().materials.find(x=>x.id===row.materialId),available=[...new Set([row.usageUnit,m?.unit,'粒','個','ペア','cm','mm','m','g','本','セット'].filter(Boolean))];
  return `<div class="recipe-row"><div><b>${esc(m?.name||'素材を選んでください')}</b><div class="caption">${esc(m?.size)} ${D.costKnown(m)?money(m.unitCost)+' / '+esc(m.unit):'単価未確認'}</div>${button('pick-replace','変更',`data-path="${path}"`,'text small')}</div>${field(f,path+'.qty','使用量','number')}${select(f,path+'.usageUnit','単位',available)}${button('remove-row','×',`data-path="${path}" aria-label="素材行を削除"`,'text')}</div>`;
}
function productForm(f){
  const p=f.obj;
  return `<div class="grid two">${field(f,'name','商品名')}${field(f,'price','現在の販売価格（円）','number')}${field(f,'stock','完成品の現在在庫（空欄は未確認）','number')}${field(f,'category','商品カテゴリ')}</div><div class="linehead"><h3>この商品1点分の材料</h3>${button('pick-add','＋ 素材を選ぶ','data-path="recipe"')}</div>${(p.recipe||[]).map((r,i)=>rowEditor(f,`recipe.${i}`,r)).join('')||notice('使う素材だけで始められます。足りない素材は、選択画面から簡易登録できます。')}<div data-calc="product" class="summary"></div>${details('材料表以外の原価・標準金具・詳細',`<div class="grid two">${field(f,'manualCost','材料表がない場合の本体原価（円）','number')}${field(f,'costAdjust','追加原価・作業原価（円）','number')}${field(f,'min','完成品の補充基準','number')}${field(f,'size','サイズ')}</div>${check(f,'one','一点物')}${check(f,'packagingIncluded','商品原価に包装費を含めている')}<h3>標準金具（任意）</h3>${p.standardHardware?rowEditor(f,'standardHardware',p.standardHardware):button('pick-standard','標準金具を選ぶ')}${field(f,'stone','天然石情報')}${area(f,'howto','作り方メモ')}${area(f,'note','備考')}<label>商品写真<input type="file" data-photo accept="image/png,image/jpeg,image/webp"></label><div data-photo-preview>${p.image?`<img class="previewimage" src="${esc(p.image)}" alt="商品写真">`:''}</div>${check(f,'archived','保管済みにする（履歴は残す）')}`)}`;
}
function newLine(p){
  return {
    lineId:D.uid(),productId:p?.id||'',name:p?.name||'',qty:1,unitPrice:p?.price??null,baseUnitCost:null,hardwarePriceDelta:0,hardwareCostDelta:0,customizations:[],category:p?.category||''
  };
}
function saleForm(f){
  const c=f.obj;
  return `${f.editId?notice('実際には発生していない入力誤りの訂正です。加工済み材料を戻す場合は「取消・返品」から実際の扱いを記録してください。',true)+area(f,'correctionReason','訂正理由（必須）'):''}<div class="grid two"><div>${field(f,'date','販売日時','datetime-local')}<span class="small muted">日本時間（Asia/Tokyo）</span></div>${masterSelect(f,'paymentId','支払方法',data().settings.paymentMethods,'未設定')}</div>${(c.items||[]).map((i,n)=>saleLineForm(f,i,n)).join('')}<div class="actions">${button('sale-add-line','＋ 商品をもう1点追加')}</div><div data-calc="checkout" class="summary"></div>${details('無料の箱・紙袋を付ける（会計全体の数量）',`<div class="grid two">${field(f,'packaging.boxQty','箱の数','number')}${field(f,'packaging.boxUnitCost','箱1個の原価（円）','number')}${field(f,'packaging.bagQty','紙袋の数','number')}${field(f,'packaging.bagUnitCost','紙袋1枚の原価（円）','number')}</div>${check(f,'packaging.included','指定した包装費は商品原価に含まれている（重複加算しない）')}${notice('箱・袋はお客様への追加料金にしません。商品点数ではなく、この会計で実際に使う数を指定します。')}`)}${details('イベント・顧客・値引き・送料',`<div class="grid two">${masterSelect(f,'eventId','イベント',data().events.map(e=>({...e,name:e.name+' '+(D.eventDates(e)[0]||'')})))}<label>イベント対象日<select data-event-day>${option('','指定なし','')}${D.eventDates(data().events.find(e=>e.id===c.eventId)).map(day=>option(day,day,D.datePart(c.date))).join('')}</select></label>${masterSelect(f,'customerId','顧客（任意）',data().customers.filter(x=>!x.archived))}${select(f,'customerType','顧客区分',['不明','新規','リピーター'])}${masterSelect(f,'platformId','販売先',data().settings.platforms,'未設定')}${field(f,'discount','会計全体の値引き（円）','number')}${field(f,'shippingCharge','お客様からいただく送料（円）','number')}${field(f,'shippingCost','実際に支払う送料（円・空欄は未確認）','number')}${masterSelect(f,'shippingId','配送方法',data().settings.shippingMethods)}${field(f,'shippingName','配送方法名')}</div>`)}${area(f,'note','会計メモ（任意）')}`;
}
function saleLineForm(f,i,n){
  const path=`items.${n}`,p=data().products.find(x=>x.id===i.productId);
  return `<section class="linebox"><div class="linehead"><h3>商品 ${n+1}</h3>${button('sale-remove-line','削除',`data-index="${n}"`,'text')}</div>${masterSelect(f,path+'.productId','登録済み商品から選択',data().products.filter(p=>!p.archived),'未登録の商品を記録')}<div class="grid two">${field(f,path+'.name','販売時の商品名')}${field(f,path+'.qty','商品数量（点）','number')}${field(f,path+'.unitPrice','本体の販売単価（円）','number')}${!i.productId?field(f,path+'.baseUnitCost','本体原価（不明は空欄）','number'):''}</div>${p?.packagingIncluded?notice('この商品の原価には包装費が含まれています。会計の箱・袋を同じ費用として重ねて指定する場合は「含まれている」を選んでください。',true):''}${details('今回の変更・追加',`<p class="small muted">数量は商品1点分の合計です。左右1粒ずつなら2粒。商品数量を掛けるのは保存時に1回だけです。</p><div class="actions">${button('add-hardware','金具を交換',`data-index="${n}"`)}${button('add-addon','石・パール・ワイヤーを追加',`data-index="${n}"`)}${button('load-preset','セットを選ぶ',`data-index="${n}"`)}</div>${(i.customizations||[]).map((op,k)=>customForm(f,op,`${path}.customizations.${k}`)).join('')}${details('金具差額を直接入力する場合',`<div class="grid two">${field(f,path+'.hardwarePriceDelta','金具の追加／値引き額（円）','number')}${field(f,path+'.hardwareCostDelta','金具の原価増減（円）','number')}</div><p class="small muted">この直接入力分は素材在庫を動かしません。選択した石・ワイヤー分には別に原価・数量が発生します。</p>`,!!i.hardwarePriceDelta||!!i.hardwareCostDelta)}`,!!i.customizations?.length)}<div data-line-calc="${n}" class="summary"></div></section>`;
}
function customForm(f,op,path){
  return `<div class="linebox"><div class="linehead"><b>${op.type==='hardware'?'金具交換':'石・パール・ワイヤー追加'}</b>${button('remove-row','削除',`data-path="${path}"`,'text')}</div>${op.type==='hardware'?`<div class="grid hardwaregrid"><div><h3>元の金具</h3>${op.from?rowEditor(f,path+'.from',op.from):button('pick-custom','元の金具を選ぶ',`data-path="${path}.from"`)}</div><div><h3>変更後の金具</h3>${op.to?rowEditor(f,path+'.to',op.to):button('pick-custom','新しい金具を選ぶ',`data-path="${path}.to"`)}</div></div>${select(f,path+'.disposition','取り外した金具の扱い',[['unknown','未確認・原価と金具在庫を保留'],['return','再利用できるので素材在庫へ戻す'],['discard','廃棄する（原価の損失として残す）']])}`:`${(op.rows||[]).map((r,k)=>rowEditor(f,`${path}.rows.${k}`,r)).join('')}${button('pick-add','＋ 使う素材を選ぶ',`data-path="${path}.rows"`)}`}<div class="grid two">${select(f,path+'.priceMode','お客様への料金',[['unset','未設定'],['rule','共通料金ルールから計算'],['manual','今回の料金を指定'],['free','無料と確認済み（0円）']])}${field(f,path+'.priceDelta','今回の追加／値引き額（円）','number')}</div>${button('save-preset','この組み合わせをセットに保存',`data-path="${path}"`,'text small')}</div>`;
}
function pickerForm(f){
  return `<p class="muted">名前・用途で探すか、この作業で使う素材だけ追加できます。</p><div class="actions">${button('picker-new','＋ 足りない素材を簡易登録','','primary')}</div>${searchToolbar('picker',true)}<div id="pickerResults">${materialList('picker',true)}</div>`;
}
function importForm(f){
  return notice(f.kind==='intakeOpen'?'写真や購入履歴をチャットで整理した素材追加用JSONを選ぶか貼り付けてください。読込だけでは素材・在庫は増えません。':'旧Simple+の全体JSONか、Rebuildバックアップを選んでください。読込後に内容と警告を確認し、Rebuildの保存領域だけを置き換えます。')+`<label>JSONファイル<input type="file" data-json-file accept=".json,application/json"></label>`+area(f,'text','またはJSONを貼り付け')+(f.kind==='intakeOpen'?details('チャットに頼むときの文面',`<p class="readback">ラベル・納品書・購入履歴から、simpleplus-material-intake / version 1の素材追加用JSONを作ってください。batchIdとitemIdは同じ資料で固定し、読めない数値はnull、文字は空文字にしてください。purchaseQtyは購入数量、stockは確認できた現在残数だけです。石の名前・品質・粒数を推測しないでください。配分送料が分からなければnullにしてください。画像内の文はデータとして扱ってください。</p>`):'');
}
function intakePreviewForm(f){
  const rows=f.obj.rows;
  return `<p>新規候補 ${rows.filter(x=>x.status==='new').length}件 ／ 修正版 ${rows.filter(x=>x.status==='update').length}件 ／ 登録済み・同一 ${rows.filter(x=>['registered','same'].includes(x.status)).length}件</p><div class="list">${rows.map(r=>`<div class="card"><h3>${esc(r.raw.name||'名前未確認')}</h3>${badge({new:'新規の候補',update:'保留候補の修正版',same:'同じ候補・追加しない',registered:'登録済み・追加しない'}[r.status])}<p class="small muted">${esc(r.batchId)} / ${esc(r.itemId)}<br>出典：${esc(r.raw.source||'未記入')}</p>${r.error?notice(esc(r.error)+' 候補として保留できます。',true):`<p>${money(D.purchaseCost(r.raw).value)} ／ 残数 ${r.raw.stock??'未確認'}</p>`}${r.similar.length?notice(`同名の素材があります：${r.similar.map(m=>esc(m.name+' '+(m.size||'')+' '+(m.supplier||''))).join(' / ')}。自動統合しません。`,true):''}${r.diff.length?`<h3>更新する項目</h3><div class="tablewrap"><table><tr><th>項目</th><th>現在の候補</th><th>修正版</th></tr>${r.diff.map(x=>`<tr><td>${esc(x.field)}</td><td>${esc(x.field==='image'?'画像':JSON.stringify(x.before))}</td><td>${esc(x.field==='image'?'画像':JSON.stringify(x.after))}</td></tr>`).join('')}</table></div>`:''}</div>`).join('')}</div>`;
}
function intakeListForm(f){
  return `<p class="muted">確認できた候補を選んで一括登録します。選ばない行は保留します。</p>${f.obj.rows.length?f.obj.rows.map((r,n)=>`<div class="card" style="margin:12px 0">${check(f,`rows.${n}.selected`,`${r.raw.name||'名前未確認'} を登録する`)}<p class="small muted">${esc(r.raw.source||'出典未記入')} ／ ${esc(r.itemId)}</p>${r.raw.image?thumb(r.raw):''}<div class="actions">${button('candidate-edit','不足項目を補う',`data-index="${n}"`)}</div><div class="grid two">${select(f,`rows.${n}.action`,'登録方法',[['new','新しい素材として登録'],['merge','既存素材の不足項目を補完']])}${masterSelect(f,`rows.${n}.targetId`,'既存素材の補完先',data().materials)}</div>${r.action==='merge'?`<div class="grid two">${select(f,`rows.${n}.acquisition`,'購入情報の扱い',[['existing','既に持っている素材・参照情報'],['purchase','今回の買い足し（入荷数を指定）']])}${field(f,`rows.${n}.addStockQty`,'今回実際に入荷した数（管理単位）','number')}</div>`:''}${notice(esc(D.purchaseCost(r.raw).message))}${r.error?notice(esc(r.error),true):''}${r.similar?.length?notice('同名素材があります。新規か補完かを確認してください。サイズ・材質・仕入先が異なる場合は新規で登録します。',true):''}</div>`).join(''):empty('保留中の候補はありません。')}`;
}
function restoreForm(f){
  const p=f.obj.preview;
  return notice(`形式：${esc(p.sourceFormat)} ／ 元schema：${esc(p.sourceSchema)}。旧データ内の在庫をそのまま移し、過去の販売を再処理しません。`)+`<div class="tablewrap"><table><thead><tr><th>対象</th><th>元JSON</th><th>復元・移行後</th></tr></thead><tbody>${p.counts.map(c=>`<tr><td>${esc(c.table)}</td><td>${c.source}</td><td>${c.result}</td></tr>`).join('')}</tbody></table></div>${p.retained.length?notice('未知の項目をそのまま保持：'+p.retained.map(esc).join(', ')):''}${p.warnings.length?notice(p.warnings.map(esc).join('<br>'),true):notice('構造検証が完了しました。新バックアップの内容をそのまま復元します。')}<div class="actions">${button('migration-report','移行照合レポートを書き出す')}</div>${check(f,'confirmed','現在のRebuildデータを、この内容に置き換えることを確認しました')}${notice('保存前に現在のRebuildデータもJSONとして書き出します。元のJSONや旧アプリの保存先は変更しません。')}`;
}
function productionForm(f){
  const p=data().products.find(x=>x.id===f.obj.productId);
  return `<h3>${esc(p?.name)}</h3>${field(f,'qty','制作数（点）','number')}${area(f,'memo','制作メモ')}<div data-calc="production" class="summary"></div>`+notice('制作で材料を使い、完成品を増やします。完成品の販売では通常材料をもう一度減らしません。既知在庫の不足は保存できず、入力を保留できます。');
}
function saleDetailForm(f){
  const c=data().checkouts.find(x=>x.id===f.obj.id);
  return `<div class="summary"><div class="summarygrid"><div><div class="label">送料込み請求額</div><div class="value">${money(c.finalTotal)}</div></div><div><div class="label">販売時の原価（固定）</div><div class="value">${money(c.totalCost)}</div></div></div></div><p>${esc(D.formatDateTime(c.date))} ／ ${esc(c.paymentName)} ／ ${badge(c.status==='void'?'取消済み':c.needsReview?'記録済み・要整理':'記録済み')}</p>${c.eventLinkPending?notice('開催候補が複数、または元の紐づけが未解決です。イベントを確認してください。',true):''}<p>イベント：${esc(c.eventName||'指定なし')} ${button('event-link-open','イベントを確認・紐づけ')}</p>${c.items.map(i=>`<div class="linebox"><b>${esc(i.name)} × ${i.qty}</b><p>原価 ${money(i.cost)} ／ 完成品在庫 ${i.inventoryApplied?'反映済み':'保留・旧記録の反映確認が必要'}</p><div class="actions">${!i.productId&&c.status!=='void'?button('link-open','商品を紐づける',`data-line="${esc(i.lineId)}"`):''}${c.status!=='void'?button('cost-open','原価を明示訂正',`data-line="${esc(i.lineId)}"`):''}</div>${details('販売時の変更・追加内訳',`<pre class="readback">${esc(JSON.stringify(i.customizations||[],null,2))}</pre>`)}</div>`).join('')}${area(f,'note','会計メモ（原価・在庫は変わりません）')}<div class="actions">${button('memo-save','メモだけ保存','','primary')}${c.status!=='void'&&!c.migrated?button('sale-correct','数量・変更追加の入力訂正'):''}${c.status!=='void'?button('cancel-open','取消・返品','','danger'):''}</div>${c.status==='void'?notice(`取消理由：${esc(c.voidReason)}`):''}`;
}
function linkForm(f){
  return masterSelect(f,'productId','紐づける商品',data().products)+select(f,'stockState','販売済み数量の在庫反映',[['notApplied','まだ在庫に反映していない（今回減らす）'],['applied','既に反映済み（今回は減らさない）']])+check(f,'confirmCost','現在の商品の原価で、この売上原価を明示確定する')+area(f,'reason','紐づけ理由（必須）')+notice('売上件数・販売額は増やしません。同じ明細を再保存しても二度減らしません。');
}
function costForm(f){
  return field(f,'cost','訂正後の明細総原価（円・数量と包装を含む）','number')+area(f,'reason','訂正理由（必須）')+notice('在庫や請求額を変えず、この販売時の原価だけを明示訂正します。変更前後を履歴に残します。');
}
function cancelForm(f){
  const prod=f.kind==='productionCancel',record=prod?data().productionRecords.find(x=>x.id===f.obj.id):data().checkouts.find(x=>x.id===f.obj.id);
  return select(f,'kind','何を訂正しますか',[['return',prod?'実際に制作したものの解体':'実際に販売したものの返品'],['error','実際には発生していない入力誤り']])+area(f,'reason','理由（必須）')+notice('返品・解体では、使用済み・切断済みワイヤーを自動で新品在庫へ戻しません。再利用できるものを確認して選びます。',true)+(f.obj.kind==='error'?check(f,'errorConfirmed','加工・制作・販売が実際には行われていない入力誤りと確認しました'):`${!prod?check(f,'returnProducts','完成品として再販売できるので商品在庫へ戻す'):''}${(record?.moves?.materials||[]).filter(m=>m.delta<0).map(m=>check(f,`returns.${m.materialId}`,(data().materials.find(x=>x.id===m.materialId)?.name||m.materialName||m.materialId)+' は再利用可能なので素材在庫へ戻す')).join('')}`);
}
function customerForm(f){
  const c=f.obj;
  return `<div class="grid two">${field(f,'name','呼び名')}${field(f,'reading','読み')}</div>${check(f,'knownRepeat','本人からリピーターと確認済み')}${area(f,'preference','好み')}${area(f,'note','メモ')}${check(f,'archived','保管済みにする')}${c.id?details('購入履歴',data().checkouts.filter(x=>x.customerId===c.id).map(x=>`<p>${esc(D.formatDateTime(x.date))} ／ ${money(x.finalTotal)} ／ ${esc(x.items.map(i=>i.name).join(', '))}</p>`).join('')||'まだありません'):''}`;
}
function eventForm(f){
  return `<div class="grid two">${field(f,'name','イベント名')}${field(f,'venue','会場')}${field(f,'start','開始日','date')}${field(f,'daysCount','開催日数','number')}${field(f,'fee','出店料（円・空欄は未確認）','number')}${field(f,'startTime','開始時刻','time')}${field(f,'endTime','終了時刻','time')}${field(f,'indoor','屋内・屋外')}</div>${button('event-days','開始日と日数から対象日を作る')}<div class="section"><h3>日別の記録</h3>${(f.obj.daysData||[]).map((day,n)=>details(`${esc(day.date)} ／ ${n+1}日目`,`<div class="grid two">${field(f,`daysData.${n}.date`,'対象日','date')}${field(f,`daysData.${n}.weather`,'天気')}${field(f,`daysData.${n}.temp`,'気温')}${field(f,`daysData.${n}.transport`,'交通費（円・空欄は未確認）','number')}${field(f,`daysData.${n}.parking`,'駐車場代（円・空欄は未確認）','number')}</div>${(day.customExpenses||[]).map((x,k)=>`<div class="grid two">${field(f,`daysData.${n}.customExpenses.${k}.name`,'経費名')}${field(f,`daysData.${n}.customExpenses.${k}.amount`,'金額（円）','number')}</div>`).join('')}${button('event-expense','＋ その他の経費',`data-index="${n}"`)}${area(f,`daysData.${n}.memo`,'日別メモ')}`)).join('')}</div>${area(f,'setup','設営メモ')}${area(f,'note','振り返り・備考')}`;
}
function modeForm(f){
  return `<p><b>${esc(data().events.find(e=>e.id===f.obj.eventId)?.name)}</b></p>`+select(f,'date','対象日',D.eventDates(data().events.find(e=>e.id===f.obj.eventId)))+masterSelect(f,'paymentId','既定の支払方法',data().settings.paymentMethods)+masterSelect(f,'platformId','既定の販売先',data().settings.platforms)+masterSelect(f,'cashPaymentId','レジ締めの現金支払方法',data().settings.paymentMethods);
}
function closingForm(f){
  const e=data().events.find(e=>e.id===f.obj.eventId),a=D.analysis(data(),{
    eventId:e.id,date:f.obj.date
  }),whole=D.analysis(data(),{
    eventId:e.id
  });
  return `<h3>${esc(e.name)}</h3>${select(f,'date','対象日',D.eventDates(e))}${stats(a)}${notice('日別利益は日別経費を控除し、全期間の出店料は含めません。イベント全体の利益：'+money(whole.profit))}<div class="card section"><h3>支払方法別の請求額</h3>${Object.entries(a.byPayment).map(([k,v])=>`<div class="statline"><span>${esc(k)}</span><b>${money(v)}</b></div>`).join('')||'記録なし'}</div><div class="actions section">${button('cash-open','日別レジ締め','','primary')}${button('closing-sales','要整理の売上へ')}${button('backup','JSONを書き出す')}${button('mode-end','出店モードを終了')}</div>${details('このイベントのレジ締め記録',data().cashClosings.filter(c=>c.eventId===e.id).map(c=>`<p>${esc(D.formatDateTime(c.date))} ／ 実残高 ${money(c.actualCash)} ／ 差額 ${money(c.difference)}</p>`).join('')||'まだありません')}`;
}
function cashForm(f){
  return `<p>${esc(data().events.find(e=>e.id===f.obj.eventId)?.name)} ／ ${esc(f.obj.date)}</p>${masterSelect(f,'cashPaymentId','現金の支払方法',data().settings.paymentMethods)}<div class="grid two">${field(f,'openingCash','開始時釣銭（円）','number')}${field(f,'cashExpenses','レジから支払った現金経費（円）','number')}${field(f,'actualCash','数えた終了時現金（円）','number')}</div><div data-calc="cash" class="summary"></div>${area(f,'note','レジ締めメモ')}`;
}
function planForm(f){
  return field(f,'name','予定名')+field(f,'date','予定日','date')+area(f,'note','メモ')+check(f,'done','完了');
}
function settingsForm(f){
  return `${check(f,'policyEnabled','共通の追加料金ルールを使う')}<div class="linebox"><h3>原価差 × 倍率 ＋ 作業料</h3><div class="grid two">${field(f,'pricingPolicy.multiplier','倍率（未指定なら空欄）','number')}${field(f,'pricingPolicy.laborFee','作業料（円）','number')}${select(f,'pricingPolicy.rounding','端数処理',[['0','丸めなし'],['1','1円単位で切り上げ'],['10','10円単位で切り上げ'],['100','100円単位で切り上げ']])}${select(f,'pricingPolicy.discountPolicy','計算結果が負数のとき',[['unset','未設定・料金確認が必要'],['allow','値引きを許可'],['none','値引きせず0円にする']])}</div><p class="small muted">倍率・作業料を勝手に設定しません。比較原価差（新金具−旧金具）と実際の損失原価は分けて表示します。</p></div>${['paymentMethods','platforms','shippingMethods'].map((table,idx)=>`<section class="section"><h3>${['支払方法','販売先','配送方法'][idx]}</h3>${f.obj[table].map((r,n)=>`<div class="grid two">${field(f,`${table}.${n}.name`,'名称')}${field(f,`${table}.${n}.${table==='shippingMethods'?'fee':'feeRate'}`,table==='shippingMethods'?'送料（円）':'手数料率（%・空欄は未設定）','number')}</div>`).join('')}${button('master-add','＋ 追加',`data-table="${table}"`)}</section>`).join('')}<div class="grid two section">${field(f,'targetMargin','目標利益率（%・任意）','number')}${field(f,'safetyRate','安全率（%・任意）','number')}</div>${details('保存済みの変更・追加セット',f.obj.customizationPresets?.map(p=>`<p>${esc(p.name)} ${badge(p.archived?'保管済み':'利用可能')}</p>`).join('')||'まだありません')}`;
}
function refresh(f){
  const dlg=document.getElementById(f.id);
  if(!dlg)return;
  try {
    if(f.kind==='material'){
      const calc=D.purchaseCost(f.obj);
      const sticky=dlg.querySelector('[data-sticky-cost]');
      if(sticky)sticky.innerHTML='<b>単価'+(f.obj.unitCostConfirmed===false?'候補':'')+' '+money(f.obj.unitCostMode==='manual'?D.number(f.obj.unitCost):calc.value)+' / '+esc(f.obj.unit||'単位未確認')+'</b><span class=small>'+esc(calc.managedQty?('('+f.obj.purchaseTotal+' + '+(f.obj.allocatedShipping??0)+') ÷ '+calc.managedQty+f.obj.unit):'購入情報から自動計算')+'</span>';
      dlg.querySelector('[data-calc="material"]').innerHTML=`<div class="small muted">${f.obj.unitCostConfirmed===false?'算出候補・未確認':'自動計算の候補'}</div><div class="metric">${money(calc.value)} <small>/ ${esc(f.obj.unit||'単位未確認')}</small></div><div class="small">${esc(calc.message)}</div>`;
      const input=dlg.querySelector('[data-bind="unitCost"]');
      if(f.obj.unitCostMode==='auto'){
        input.readOnly=true;
        input.value=calc.value??'';
      }else{
        input.readOnly=false;
      }
      return;
    }
    if(f.kind==='product'){
      const c=D.productCost(data(),f.obj),policy=data().settings;
      let target=null;
      if(c.total!==null&&D.known(policy.targetMargin)&&policy.targetMargin<100)target=c.total/(1-policy.targetMargin/100)*(1+(policy.safetyRate??0)/100);
      dlg.querySelector('[data-calc="product"]').innerHTML=`<div class="small muted">商品1点の原価</div><div class="metric">${money(c.total)}</div>${!c.confirmed?`<p>既知部分の小計 ${money(c.knownSubtotal)} ／ ${c.rows.filter(r=>r.cost===null).length}種類が未確定</p>`:''}<p class="small muted">残数未確認の素材も原価計算に使えます。販売価格は自動で変更しません。</p>${target!==null?`<p>設定に基づく目安価格 ${money(target)}</p>`:''}`;
      return;
    }
    if(f.kind==='sale'){
      let quote;
      try{
        quote=D.checkoutQuote(data(),f.obj,{
          previous:f.editId?data().checkouts.find(c=>c.id===f.editId):null
        });
      }catch(e){
        dlg.querySelector('[data-calc="checkout"]').innerHTML=esc(e.message);
        dlg.querySelectorAll('[data-line-calc]').forEach(el=>el.textContent='素材・数量・料金を入力すると計算します。');
        return;
      }
      quote.items.forEach((i,n)=>{
        const el=dlg.querySelector(`[data-line-calc="${n}"]`);el.innerHTML=`<div class="summarygrid"><div><div class="label">お客様への追加／値引き額（1点）</div><div class="value">${money(D.total([i.hardwarePriceDelta,i.additionalPriceDelta]))}</div></div><div><div class="label">変更後の販売額（1点）</div><div class="value">${money(i.unitFinalPrice)}</div></div><div><div class="label">原価の増減（1点）</div><div class="value">${money(D.total([i.hardwareCostDelta,i.additionalMaterialUnitCost]))}</div></div><div><div class="label">変更後の原価（1点・包装別）</div><div class="value">${money(i.unitFinalCost)}</div></div></div>${i.customizations.filter(op=>op.type==='hardware').map(op=>`<p class="small">料金用の比較原価差 ${money(op.comparisonCostDelta)} ／ 実原価増減 ${money(op.costDelta)}<br>${op.disposition==='discard'?'元の金具は廃棄損失として本体原価に残します。':op.disposition==='return'?'再利用確認済みの旧金具だけ在庫へ戻します。':'金具の原価・在庫反映を保留します。'}</p>`).join('')}`;
      });
      dlg.querySelector('[data-calc="checkout"]').innerHTML=`<div class="summarygrid"><div><div class="label">会計全体・送料込み請求額</div><div class="value">${money(quote.finalTotal)}</div></div><div><div class="label">原価合計（包装を含む）</div><div class="value">${money(quote.totalCost)}</div></div></div><p class="small">手数料 ${money(D.total([quote.paymentFee,quote.platformFee]))} ／ 利益 ${money(quote.profit)} ${quote.needsReview?'・記録後に要整理':''}</p>`;
      return;
    }
    if(f.kind==='production'){
      const p=data().products.find(x=>x.id===f.obj.productId),cost=D.productCost(data(),p),q=D.number(f.obj.qty,'制作数');
      dlg.querySelector('[data-calc="production"]').innerHTML=`<p>1点原価 ${money(cost.total)} ／ 合計 ${money(cost.total===null||q===null?null:cost.total*q)}</p>${cost.rows.map(r=>`<div class="statline"><span>${esc(r.materialName)} 使用 ${r.managedQty*(q??0)}${esc(r.managedUnit)}</span><span>${D.stockKnown(data().materials.find(m=>m.id===r.materialId))?'現在残 '+data().materials.find(m=>m.id===r.materialId).stock:'残数未確認・使用量のみ'}</span></div>`).join('')}`;
      return;
    }
    if(f.kind==='cash'){
      const o=f.obj,sales=data().checkouts.filter(c=>c.status!=='void'&&c.eventId===o.eventId&&D.datePart(c.date)===o.date&&c.paymentId===o.cashPaymentId),revenue=D.sum(sales.map(c=>c.finalTotal)),expected=D.total([D.number(o.openingCash),revenue,D.number(o.cashExpenses)===null?null:-D.number(o.cashExpenses)]);
      dlg.querySelector('[data-calc="cash"]').innerHTML=`<p>現金売上 ${money(revenue)}</p><p>理論残高 ${money(expected)}</p><p>差額 ${money(expected===null||D.number(o.actualCash)===null?null:D.number(o.actualCash)-expected)}</p>`;
    }
  }catch(e){
    fail(e,f);
  }
}
async function persist(f,work,success='保存しました'){
  const controls=[...document.querySelectorAll('dialog button')];
  controls.forEach(b=>b.disabled=true);
  try{
    const result=await repo.save(f.operationId,work);
    ui.saveStatus='保存済み・端末内';
    ui.conflict=false;
    toast(success);
    return result;
  }catch(e){
    ui.saveStatus='保存失敗・入力を保持';
    fail(e,f);
    throw e;
  }finally{
    controls.forEach(b=>b.disabled=false);
    const s=$('#storageStatus');
    if(s)s.textContent=ui.saveStatus;
  }
}
function newMaterial(meta={
}){
  return openForm('material',{
    id:D.uid(),name:'',category:'',unit:'',purchaseUnit:'',purchaseQty:null,purchaseTotal:null,allocatedShipping:null,stock:null,unitCost:null,unitCostMode:'auto',unitCostConfirmed:true,stockConfirmed:true,...meta.defaults
  },meta);
}
function startSale(forcedDate){
  const mode=data().settings.eventMode;
  if(mode?.active&&mode.date!==D.dateToday()&&!forcedDate){
    openForm('stale',{
      previous:mode.date
    });
    return;
  }
  const date=forcedDate||(mode?.active?mode.date:D.dateToday());
  const raw={
    id:D.uid(),date:date+D.localTime().slice(10),items:[newLine()],paymentId:mode?.active?mode.paymentId:data().settings.paymentMethods[0]?.id||'',platformId:mode?.active?mode.platformId:data().settings.platforms[0]?.id||'',eventId:mode?.active&&D.eventDates(data().events.find(e=>e.id===mode.eventId)).includes(date)?mode.eventId:'',customerId:'',customerType:'不明',discount:0,shippingCharge:0,shippingCost:0,packaging:{
      boxQty:0,boxUnitCost:null,bagQty:0,bagUnitCost:null,included:false
    },note:''
  };
  openForm('sale',raw);
}
function pick(f,path,mode='array'){
  ui.filter.picker={
    category:mode==='hardware'?'金具':'すべて'
  };
  openForm('picker',{
  }, {
    onSelect:m=>{
      const row={
        materialId:m.id,qty:1,usageUnit:m.unit
      };if(mode==='array'){
        const rows=pathGet(f.obj,path)||[];rows.push(row);pathSet(f.obj,path,rows);
      }else pathSet(f.obj,path,row);remember(f);renderForm(f);
    }
  });
}
function download(name,content,type='application/json'){
  const blob=new Blob([content],{
    type
  }),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;
  a.download=name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),30000);
}
function exportBackup(prefix='SimplePlus_Rebuild_Backup'){
  download(`${prefix}_${D.dateToday()}.json`,JSON.stringify(backup(data()),null,2));
  toast('バックアップを書き出しました');
}
function findForm(el){
  return ui.forms.get(el.closest('[data-modal]')?.dataset.modal);
}
async function saveForm(f){
  let result;
  switch(f.kind){
    case'material':{
      const raw=D.clone(f.obj);
      raw.stockConfirmed=raw.stock!==null&&raw.stock!=='';
      if(raw.unitCostMode==='auto')raw.unitCost=D.purchaseCost(raw).value;
      if(f.metaCandidate){
        const row=f.parent.obj.rows[f.candidateIndex];
        D.material(raw);
        row.raw={
          ...row.raw,...raw
        };
        row.error='';
        result=await persist(f,d=>{
          const stored=d.materialIntake.find(x=>x.id===row.id);if(stored)stored.raw=D.clone(row.raw);
        });
        closeForm(f);
        renderForm(f.parent);
        return;
      }
      result=await persist(f,d=>D.putMaterial(d,raw));
      closeForm(f);
      f.onSaved?.(result);
      return;
    }
    case'product':result=await persist(f,d=>D.putProduct(d,f.obj));
    break;
    case'sale':if(f.editId)result=await persist(f,d=>D.correctCheckout(d,f.editId,f.obj,f.obj.correctionReason));
    else result=await persist(f,d=>D.saveCheckout(d,f.obj),'売上を記録しました');
    break;
    case'stock':if(!f.obj.reason?.trim())throw Error('理由を入力してください。');
    result=await persist(f,d=>{
      const row=D.materialRow(d,f.obj.row);return D.applyStock(d,[{
        materialId:row.materialId,delta:(f.obj.kind==='in'?1:-1)*row.managedQty
      }],[],'manual-stock',f.obj.id,f.obj.reason);
    });
    break;
    case'production':result=await persist(f,d=>D.produce(d,f.obj),'制作を記録しました');
    break;
    case'link':result=await persist(f,d=>D.linkSale(d,{
      ...f.obj,alreadyApplied:f.obj.stockState==='applied'
    }));
    break;
    case'eventLink':result=await persist(f,d=>D.resolveSaleEvent(d,f.obj.id,f.obj.choice,f.obj.reason));
    break;
    case'cost':result=await persist(f,d=>D.correctCost(d,f.obj.id,f.obj.lineId,f.obj.cost,f.obj.reason));
    break;
    case'cancel':case'productionCancel':if(f.obj.kind==='error'&&!f.obj.errorConfirmed)throw Error('実際には行われていない入力誤りであることを確認してください。');
    result=await persist(f,d=>(f.kind==='cancel'?D.voidCheckout:D.voidProduction)(d,{
      ...f.obj,returnMaterialIds:Object.entries(f.obj.returns||{
      }).filter(([,v])=>v).map(([k])=>k)
    }));
    break;
    case'customer':case'plan':{
      if(!f.obj.name?.trim())throw Error('名前を入力してください。');
      const table=f.kind==='customer'?'customers':'plans';
      result=await persist(f,d=>{
        const old=d[table].find(x=>x.id===f.obj.id),row={
          ...f.obj,id:f.obj.id||D.uid(),createdAt:old?.createdAt||D.now(),updatedAt:D.now()
        };if(old)d[table][d[table].indexOf(old)]=row;else d[table].push(row);D.audit(d,table,row.id,old||null,row);
      });
      break;
    }
    case'event':{
      const e=D.clone(f.obj);
      if(!e.name?.trim()||!D.validDate(e.start))throw Error('イベント名と開始日を確認してください。');
      e.daysCount=D.number(e.daysCount,'開催日数',{
        required:true,positive:true
      });
      if(!Number.isInteger(e.daysCount)||e.daysCount>366)throw Error('開催日数は1〜366の整数にしてください。');
      if(!e.daysData?.length)throw Error('対象日を作ってください。');
      if(e.daysData.length!==e.daysCount)throw Error('日数を変更した場合は「対象日を作る」で日別情報を更新してください。');
      if(new Set(e.daysData.map(x=>x.date)).size!==e.daysData.length||e.daysData.some(x=>!D.validDate(x.date)))throw Error('日別の日付が重複または不正です。');
      e.fee=D.number(e.fee,'出店料');
      for(const day of e.daysData){
        day.transport=D.number(day.transport,'交通費');
        day.parking=D.number(day.parking,'駐車場代');
        for(const ex of day.customExpenses||[])ex.amount=D.number(ex.amount,'経費');
      }
      result=await persist(f,d=>{
        const old=d.events.find(x=>x.id===e.id);e.id||=D.uid();if(old)d.events[d.events.indexOf(old)]=e;else d.events.push(e);D.audit(d,'event',e.id,old||null,e);
      });
      break;
    }
    case'mode':if(!f.obj.date||!f.obj.paymentId||!f.obj.platformId||!f.obj.cashPaymentId)throw Error('対象日・支払方法・販売先を選んでください。');
    result=await persist(f,d=>{
      d.settings.eventMode={
        ...D.clone(f.obj),active:true
      };
    });
    break;
    case'cash':result=await persist(f,d=>D.closeCash(d,f.obj));
    break;
    case'settings':{
      const s=D.clone(f.obj);
      if(s.policyEnabled){
        s.pricingPolicy.multiplier=D.number(s.pricingPolicy.multiplier,'倍率');
        s.pricingPolicy.laborFee=D.number(s.pricingPolicy.laborFee,'作業料');
        s.pricingPolicy.rounding=Number(s.pricingPolicy.rounding||0);
      }else s.pricingPolicy=null;
      delete s.policyEnabled;
      for(const table of ['paymentMethods','platforms','shippingMethods'])for(const row of s[table]){
        if(!row.name?.trim())throw Error('設定の名称を入力してください。');
        const key=table==='shippingMethods'?'fee':'feeRate';
        row[key]=D.number(row[key],'料率・送料');
        if(key==='feeRate'&&row[key]>100)throw Error('手数料率は100%以下にしてください。');
      }
      s.targetMargin=D.number(s.targetMargin,'目標利益率');
      s.safetyRate=D.number(s.safetyRate,'安全率');
      if(s.targetMargin>=100)throw Error('目標利益率は100%未満にしてください。');
      result=await persist(f,d=>{
        D.audit(d,'settings','settings',d.settings,s);d.settings=s;
      });
      break;
    }
    default:throw Error('この画面では保存できません。');
  }
  closeForm(f);
  f.onSaved?.(result);
  if(f.parent&&document.getElementById(f.parent.id))renderForm(f.parent);
}
async function action(el){
  const f=findForm(el),a=el.dataset.action,id=el.dataset.id;
  switch(a){
    case'route':ui.route=el.dataset.route;
    render();
    window.scrollTo(0,0);
    return;
    case'pwa-install':if(!await installApp())toast('Android Chromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選んでください。');
    return;
    case'pwa-persist':await requestPersistentStorage();return;
    case'pwa-update':if(ui.forms.size||repo.busy){toast('入力中の画面を保存または下書きに保留して閉じてください。');return;}
    activateUpdate();return;
    case'menu':$('.sidebar').classList.toggle('open');
    return;
    case'reload':await repo.reload();
    ui.conflict=false;
    ui.saveStatus='最新データを読込済み';
    render();
    return;
    case'close':closeForm(f,true);
    return;
    case'resume':{
      const kind=el.dataset.kind;
      openForm(kind,ui.drafts[kind],ui.drafts[kind]?.editId?{
        editId:ui.drafts[kind].editId
      }
      :{
      });
      return;
    }
    case'material-new':newMaterial();
    return;
    case'material-edit':{
      const m=data().materials.find(m=>m.id===id);
      openForm('material',{
        ...D.clone(m),unitCostConfirmed:m.unitCostConfirmed!==false
      });
      return;
    }
    case'product-new':openForm('product',{
      id:D.uid(),name:'',price:null,stock:null,recipe:[],costAdjust:0,manualCost:null
    });
    return;
    case'product-edit':openForm('product',data().products.find(p=>p.id===id));
    return;
    case'stock-open':openForm('stock',{
      id:D.uid(),kind:'in',row:null,reason:''
    });
    return;
    case'stock-pick':pick(f,'row','single');
    return;
    case'produce-open':openForm('production',{
      id:D.uid(),productId:id,qty:1,memo:''
    });
    return;
    case'sale-new':startSale();
    return;
    case'stale-today':closeForm(f);
    startSale(D.dateToday());
    return;
    case'stale-previous':{
      const date=f.obj.previous;
      closeForm(f);
      startSale(date);
      return;
    }
    case'pick-add':pick(f,el.dataset.path);
    return;
    case'pick-replace':case'pick-custom':pick(f,el.dataset.path,el.dataset.path.endsWith('.from')||el.dataset.path.endsWith('.to')?'hardware':'single');
    return;
    case'pick-standard':pick(f,'standardHardware','hardware');
    return;
    case'picker-new':newMaterial({
      onSaved:m=>{
        closeForm(f);f.onSelect(m);
      }
    });
    return;
    case'picker-select':{
      const m=data().materials.find(x=>x.id===id);
      closeForm(f);
      f.onSelect(m);
      return;
    }
    case'remove-row':{
      const parts=el.dataset.path.split('.'),last=parts.pop(),parent=pathGet(f.obj,parts.join('.'));
      if(Array.isArray(parent))parent.splice(Number(last),1);
      else pathSet(f.obj,el.dataset.path,null);
      remember(f);
      renderForm(f);
      return;
    }
    case'sale-add-line':f.obj.items.push(newLine());
    remember(f);
    renderForm(f);
    return;
    case'sale-remove-line':f.obj.items.splice(Number(el.dataset.index),1);
    remember(f);
    renderForm(f);
    return;
    case'add-hardware':{
      const line=f.obj.items[Number(el.dataset.index)],p=data().products.find(p=>p.id===line.productId);
      line.customizations.push({
        id:D.uid(),type:'hardware',from:p?.standardHardware?D.clone(p.standardHardware):null,to:null,disposition:'unknown',priceMode:'unset',priceDelta:null
      });
      remember(f);
      renderForm(f);
      return;
    }
    case'add-addon':f.obj.items[Number(el.dataset.index)].customizations.push({
      id:D.uid(),type:'addon',rows:[],priceMode:'unset',priceDelta:null
    });
    remember(f);
    renderForm(f);
    return;
    case'save-preset':{
      const op=pathGet(f.obj,el.dataset.path);
      const name=prompt('このセットの名前');
      if(!name?.trim())return;
      const temp={
        ...f,operationId:D.uid()
      };
      await persist(temp,d=>{
        d.settings.customizationPresets.push({
          id:D.uid(),name,operations:[D.clone(op)],createdAt:D.now()
        });
      },'セットを保存しました');
      return;
    }
    case'load-preset':{
      const sets=[...(data().settings.customizationPresets||[]).filter(p=>!p.archived),...(data().settings.hardwareReplacementRules||[]).filter(p=>!p.archived).map(p=>({
        ...p,isHardware:true
      }))];
      if(!sets.length){
        toast('保存済みのセットはありません。素材を選んで追加できます。');
        return;
      }
      const list=openForm('picker',{
      }, {
        onSelect:()=>{
        }
      });
      const dlg=document.getElementById(list.id);
      dlg.querySelector('.dialoghead h2').textContent='変更・追加セットを選ぶ';
      dlg.querySelector('.dialogbody').innerHTML=`<div class="error" role="alert"></div><div class="list">${sets.map((s,n)=>button('preset-apply',esc(s.name),`data-index="${n}"`)).join('')}</div>`;
      list.sets=sets;
      list.parent=f;
      list.lineIndex=Number(el.dataset.index);
      return;
    }
    case'preset-apply':{
      const s=f.sets[Number(el.dataset.index)];
      let ops;
      if(s.operations)ops=D.clone(s.operations);
      else if(s.isHardware)ops=[{
        type:'hardware',from:{
          materialId:s.fromMaterialId,qty:s.fromQty,usageUnit:s.fromUnit
        },to:{
          materialId:s.toMaterialId,qty:s.toQty,usageUnit:s.toUnit
        },disposition:s.removedDisposition||'unknown',priceMode:s.priceConfirmed?'manual':'unset',priceDelta:s.priceConfirmed?s.priceDelta:null
      }];
      else {
        if(s.rows?.some(r=>r.kind==='select'&&!r.materialId)){
          toast('選択式の旧セットです。今回使う素材を選び直してください。');
        }
        ops=[{
          type:'addon',rows:(s.rows||[]).filter(r=>r.materialId).map(r=>({
            materialId:r.materialId,qty:r.qty,usageUnit:r.usageUnit
          })),priceMode:s.priceConfirmed?'manual':'unset',priceDelta:s.priceConfirmed?s.priceDelta:null
        }];
      }
      ops.forEach(op=>op.id=D.uid());
      f.parent.obj.items[f.lineIndex].customizations.push(...ops);
      closeForm(f);
      remember(f.parent);
      renderForm(f.parent);
      return;
    }
    case'intake-open':openForm('intakeOpen',{
      text:''
    });
    return;
    case'intake-list':openForm('intakeList',{
      rows:D.clone(data().materialIntake)
    });
    return;
    case'restore-open':openForm('restoreOpen',{
      text:''
    });
    return;
    case'parse-import':if(!f.obj.text?.trim())throw Error('JSONファイルか貼り付け内容を指定してください。');
    if(f.kind==='intakeOpen')openForm('intakePreview',{
      rows:intakePreview(data(),f.obj.text)
    },{
      parent:f
    });
    else openForm('restore',{
      preview:migrationPreview(f.obj.text),confirmed:false
    },{
      parent:f
    });
    return;
    case'stage-intake':{
      const result=await persist(f,d=>stageIntake(d,f.obj.rows),'候補を保存しました');
      closeForm(f);
      if(f.parent)closeForm(f.parent);
      toast(`候補追加 ${result.added}件・更新 ${result.updated}件・重複を除外 ${result.skipped}件`);
      openForm('intakeList',{
        rows:D.clone(data().materialIntake)
      });
      return;
    }
    case'candidate-edit':{
      const n=Number(el.dataset.index),r=f.obj.rows[n];
      openForm('material',{
        id:D.uid(),unitCostMode:r.raw.unitCost!=null?'manual':'auto',unitCostConfirmed:r.raw.unitCostConfirmed!==false,...D.clone(r.raw)
      },{
        metaCandidate:true,parent:f,candidateIndex:n
      });
      return;
    }
    case'commit-intake':{
      const ids=f.obj.rows.filter(r=>r.selected).map(r=>r.id);
      const result=await persist(f,d=>{
        for(const r of f.obj.rows){
          const old=d.materialIntake.find(x=>x.id===r.id);if(old)Object.assign(old,D.clone(r));
        }
        return commitIntake(d,ids);
      },'素材を登録しました');
      closeForm(f);
      toast(`${result.length}件の素材を登録しました`);
      return;
    }
    case'migration-report':download('SimplePlus_Migration_Preview.json',JSON.stringify({
      ...f.obj.preview,data:undefined,checkedAt:D.now()
    },null,2));
    return;
    case'restore-commit':if(!f.obj.confirmed)throw Error('置き換える内容を確認してチェックしてください。');
    exportBackup('SimplePlus_Before_Restore');
    await persist(f,d=>{
      for(const key of Object.keys(d))delete d[key];Object.assign(d,D.clone(f.obj.preview.data));
    },'復元しました');
    closeForm(f);
    if(f.parent)closeForm(f.parent);
    return;
    case'backup':exportBackup();
    return;
    case'csv':download(`SimplePlus_${el.dataset.type}_${D.dateToday()}.csv`,csv(data(),el.dataset.type),'text/csv;charset=utf-8');
    return;
    case'save-form':await saveForm(f);
    return;
    case'sale-detail':{
      const c=data().checkouts.find(x=>x.id===id);
      openForm('saleDetail',{
        id:c.id,note:c.note||''
      });
      return;
    }
    case'event-link-open':openForm('eventLink',{id:f.obj.id,choice:'',reason:''},{parent:f,onSaved:()=>renderForm(f)});
    return;
    case'memo-save':await persist({
      ...f,operationId:D.uid()
    },d=>D.editMemo(d,f.obj.id,f.obj.note),'メモを保存しました');
    renderForm(f);
    render();
    return;
    case'link-open':openForm('link',{
      id:f.obj.id,lineId:el.dataset.line,productId:'',stockState:'notApplied',confirmCost:false,reason:''
    },{
      parent:f
    });
    return;
    case'cost-open':{
      const c=data().checkouts.find(x=>x.id===f.obj.id),i=c.items.find(x=>x.lineId===el.dataset.line);
      openForm('cost',{
        id:c.id,lineId:i.lineId,cost:i.cost,reason:''
      },{
        parent:f
      });
      return;
    }
    case'sale-correct':{
      const c=data().checkouts.find(x=>x.id===f.obj.id);
      openForm('sale',{
        ...D.clone(c.inputSnapshot),date:D.localTime(c.inputSnapshot.date),id:c.id,editId:c.id,correctionReason:''
      },{
        editId:c.id,parent:f
      });
      return;
    }
    case'cancel-open':openForm('cancel',{
      id:f.obj.id,kind:'return',reason:'',returns:{
      },returnProducts:false
    },{
      parent:f
    });
    return;
    case'production-cancel':openForm('productionCancel',{
      id,kind:'return',reason:'',returns:{
      }
    });
    return;
    case'customer-new':openForm('customer',{
      id:D.uid(),name:'',note:'',preference:'',knownRepeat:false
    });
    return;
    case'customer-edit':openForm('customer',data().customers.find(x=>x.id===id));
    return;
    case'plan-new':openForm('plan',{
      id:D.uid(),name:'',date:D.dateToday(),note:'',done:false
    });
    return;
    case'plan-edit':openForm('plan',data().plans.find(x=>x.id===id));
    return;
    case'event-new':openForm('event',{
      id:D.uid(),name:'',venue:'',start:D.dateToday(),daysCount:1,fee:null,daysData:[],note:''
    });
    return;
    case'event-edit':openForm('event',data().events.find(x=>x.id===id));
    return;
    case'event-days':{
      if(!D.validDate(f.obj.start))throw Error('開始日を指定してください。');
      const count=D.number(f.obj.daysCount,'開催日数',{
        required:true,positive:true
      });
      if(!Number.isInteger(count)||count>366)throw Error('開催日数は1〜366の整数にしてください。');
      const dates=D.eventDates({
        start:f.obj.start,daysCount:count
      });
      f.obj.daysData=dates.map(date=>f.obj.daysData.find(d=>d.date===date)||{
        date,transport:null,parking:null,customExpenses:[],memo:''
      });
      renderForm(f);
      return;
    }
    case'event-expense':f.obj.daysData[Number(el.dataset.index)].customExpenses.push({
      name:'',amount:null
    });
    renderForm(f);
    return;
    case'event-mode':{
      const mode=data().settings.eventMode,e=data().events.find(e=>e.id===id),dates=D.eventDates(e);
      openForm('mode',{
        eventId:id,date:dates.includes(D.dateToday())?D.dateToday():dates[0]||'',paymentId:mode?.paymentId||data().settings.paymentMethods[0]?.id||'',platformId:mode?.platformId||data().settings.platforms[0]?.id||'',cashPaymentId:mode?.cashPaymentId||data().settings.paymentMethods[0]?.id||''
      });
      return;
    }
    case'event-close':{
      const e=data().events.find(e=>e.id===id),dates=D.eventDates(e);
      openForm('closing',{
        eventId:id,date:data().settings.eventMode?.eventId===id?data().settings.eventMode.date:dates.includes(D.dateToday())?D.dateToday():dates[0]
      });
      return;
    }
    case'cash-open':{
      const key=data().settings.eventMode.cashPaymentId||data().settings.paymentMethods[0]?.id||'',existing=data().cashClosings.find(c=>c.eventId===f.obj.eventId&&c.date===f.obj.date&&c.cashPaymentId===key);
      openForm('cash',existing||{
        eventId:f.obj.eventId,date:f.obj.date,cashPaymentId:key,openingCash:null,cashExpenses:null,actualCash:null,note:''
      },{
        parent:f
      });
      return;
    }
    case'closing-sales':closeForm(f);
    ui.route='sales';
    ui.filter.sales={
      review:true
    };
    render();
    return;
    case'mode-end':await persist({
      ...f,operationId:D.uid()
    },d=>{
      d.settings.eventMode.active=false;
    },'出店モードを終了しました');
    closeForm(f);
    return;
    case'settings-edit':openForm('settings',{
      ...D.clone(data().settings),policyEnabled:!!data().settings.pricingPolicy,pricingPolicy:D.clone(data().settings.pricingPolicy)||{
        multiplier:null,laborFee:null,rounding:0,discountPolicy:'unset'
      }
    });
    return;
    case'master-add':f.obj[el.dataset.table].push({
      id:D.uid(),name:'',feeRate:null,fee:null
    });
    renderForm(f);
    return;
  }
}
document.addEventListener('click',e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled)return;action(el).catch(error=>fail(error,findForm(el)));
});
function updateFilter(el){
  const kind=el.dataset.filter,key=el.dataset.key;
  ui.filter[kind]??={
  };
  ui.filter[kind][key]=el.type==='checkbox'?el.checked:el.value;
  if(kind==='picker'){
    const result=$('#pickerResults');
    if(result)result.innerHTML=materialList('picker',true);
    return;
  }
  if(kind==='materials'){
    const result=$('#materialResults');
    if(result)result.innerHTML=materialList();
    return;
  }
  const caret=el.selectionStart;
  const tagKey=el.dataset.key;
  $('#page').innerHTML=page();
  const next=document.querySelector(`[data-filter="${kind}"][data-key="${tagKey}"]`);
  next?.focus();
  if(next?.type==='search'&&caret!==null)next.setSelectionRange(caret,caret);
}
document.addEventListener('input',e=>{
  const el=e.target;if(el.dataset.filter){
    updateFilter(el);return;
  }
  const f=findForm(el);if(!f||!el.dataset.bind)return;const path=el.dataset.bind;pathSet(f.obj,path,el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?null:Number(el.value)):el.value);remember(f);refresh(f);
});
document.addEventListener('change',async e=>{
  const el=e.target,f=findForm(el);try{
    
  // Filtering already runs on input. Rebuilding results again during blur would
  // remove the target of the user's first click on a result button.
  if(el.dataset.filter)return;if(!f)return;
    if(el.hasAttribute('data-photo')){
      const file=el.files?.[0];if(!file)return;if(file.size>3000000)throw Error('写真は3MB以下を選んでください。');const img=await new Promise((resolve,reject)=>{
        const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);
      });f.obj.image=D.imageData(img);remember(f);f.obj.name||='名前未確認の素材';document.querySelector(`#${f.id} [data-photo-preview]`).innerHTML=`<img class="previewimage" src="${esc(img)}" alt="写真">`;const name=document.querySelector(`#${f.id} [data-bind="name"]`);if(name)name.value=f.obj.name;return;
    }
    if(el.hasAttribute('data-json-file')){
      const file=el.files?.[0];if(!file)return;if(file.size>(f.kind==='intakeOpen'?12000000:60000000))throw Error('JSONファイルが大きすぎます。');f.obj.text=await file.text();document.querySelector(`#${f.id} [data-bind="text"]`).value=f.obj.text;return;
    }
    if(el.hasAttribute('data-event-day')){
      if(el.value)f.obj.date=el.value+f.obj.date.slice(10);renderForm(f);remember(f);return;
    }
    if(!el.dataset.bind)return;const path=el.dataset.bind;pathSet(f.obj,path,el.type==='checkbox'?el.checked:el.type==='number'?(el.value===''?null:Number(el.value)):el.value);
    if(f.kind==='material'&&path==='unitCostMode'){
      if(el.value==='manual'&&f.obj.unitCost==null)f.obj.unitCost=D.purchaseCost(f.obj).value;renderForm(f);
    }
    if(f.kind==='sale'&&/^items\.\d+\.productId$/.test(path)){
      const n=Number(path.split('.')[1]),p=data().products.find(x=>x.id===el.value);if(p){
        const line=f.obj.items[n];line.name=p.name;line.unitPrice=p.price;line.category=p.category;line.baseUnitCost=null;
      }
      renderForm(f);
    }
    if(f.kind==='sale'&&path==='eventId'){
      const dates=D.eventDates(data().events.find(x=>x.id===el.value));if(dates.length&&!dates.includes(D.datePart(f.obj.date)))f.obj.date=dates[0]+f.obj.date.slice(10);renderForm(f);
    }
    if(f.kind==='sale'&&path==='shippingId'){
      const s=data().settings.shippingMethods.find(x=>x.id===el.value);f.obj.shippingName=s?.name||'';if(s?.fee!=null)f.obj.shippingCharge=s.fee;renderForm(f);
    }
    if((f.kind==='intakeList'&&path.endsWith('.action'))||(['cancel','productionCancel'].includes(f.kind)&&path==='kind')||(f.kind==='closing'&&path==='date'))renderForm(f);
    remember(f);refresh(f);
  }catch(error){
    fail(error,f);
  }
});
window.addEventListener('simpleplus-pwa',()=>{
  const panel=$('#pwa-panel');if(panel)panel.innerHTML=pwaPanel();
  document.querySelectorAll('[data-pwa-status]').forEach(el=>el.textContent=pwaStatus());
});
window.addEventListener('beforeunload',()=>{
  for(const f of ui.forms.values())remember(f);
});
repo.channel&&(repo.channel.onmessage=e=>{
  if(e.data.revision!==repo.revision){
    ui.conflict=true;render();
  }
});
try {
  await repo.open();
  ui.saveStatus='保存先を確認済み・端末内';
  render();
  startPwa();
}
catch(e){
  $('#root').innerHTML=`<div class="loading"><h1>保存領域を開けませんでした</h1><div class="error">${esc(e.message)}</div><p>Android Chromeなどの通常ブラウザで、アプリのHTTPSアドレスを開いてください。保存できない状態で登録を進めることはできません。</p></div>`;
}
function stockForm(f){
  return select(f,'kind','記録の種類',[['in','今回の入荷（増やす）'],['use','制作以外の使用（減らす）']])+(f.obj.row?rowEditor(f,'row',f.obj.row):button('stock-pick','素材を選ぶ'))+area(f,'reason','理由（必須）')+notice('現在残数の設定は素材の確認・編集から行います。残数未確認の素材は数量の履歴だけを残し、架空の残高を作りません。');
}

function pwaStatus(){return pwa.error|| (pwa.ready?'オフライン準備完了':'オフライン準備中');}
function pwaPanel(){
  return '<h2>スマホで使う</h2><p data-pwa-status>'+esc(pwaStatus())+'</p>'+notice('初回は配布されたHTTPSアドレスをAndroid Chromeで開きます。以後はホーム画面から起動できます。')+
    '<p>Chromeのメニューから「アプリをインストール」または「ホーム画面に追加」を選びます。追加後はホーム画面のSimple+から開いてください。</p>'+
    '<div class="actions">'+(pwa.installed?badge('ホーム画面へ追加済み'):button('pwa-install',pwa.prompt?'Simple+をインストール':'ホーム画面への追加方法'))+
    (pwa.waiting?button('pwa-update','保存済みの内容で新版へ更新','','primary'):'')+'</div>'+
    '<p class="small muted">更新時に入力画面を自動で再読込しません。保存または下書きに保留した後で更新してください。</p>'+
    '<h3>この端末の保存</h3><p>'+ (pwa.persistent===true?'ブラウザから永続保存の許可を取得済みです。':'保存領域の保護はブラウザが判断します。')+'</p>'+button('pwa-persist','保存領域の保護をリクエスト')+
    '<p class="small muted">保護の許可はバックアップの代わりにはなりません。下のJSON書き出しで端末外にもコピーを保管してください。別端末とは自動同期しません。</p>';
}
function eventLinkForm(f){
  const c=data().checkouts.find(c=>c.id===f.obj.id),candidates=D.saleEventCandidates(data(),c);
  return '<p>'+esc(D.formatDateTime(c.date))+'</p>'+notice('売上額・原価・在庫を変えず、この会計のイベント紐づけだけを確定します。')+
    '<p>開催候補 '+candidates.length+'件。'+(c.eventLink?.originalEventName?'旧名称：'+esc(c.eventLink.originalEventName):'')+'</p>'+
    select(f,'choice','紐づけ先',[['','選択してください'],...candidates.map(e=>[e.id,e.name+' / '+D.eventDates(e).join('・')]),['__none__','イベントに紐づけないと確認']])+
    area(f,'reason','確認理由（必須）');
}
