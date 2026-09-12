import { readFile, writeFile } from 'node:fs/promises';
const root = new URL('./', import.meta.url);
const stones = JSON.parse(await readFile(new URL('stones.json', root), 'utf8'));
const groups = [['あ','a'],['か','ka'],['さ','sa'],['た','ta'],['な','na'],['は','ha'],['ま','ma'],['や','ya'],['ら','ra'],['わ','wa']];
const esc = v => String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraph = (label,value) => value ? `<div class="detail-block"><h4>${label}</h4><p>${esc(value)}</p></div>` : '';
function card(s) {
  const refs=(s.sources||[]).map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${url.includes('handbookofmineralogy')?'鉱物データ':'GIAの解説'}${s.sources.length>1?' '+(i+1):''}</a>`).join(' / ');
  const detail = s.care || s.treatment || s.note;
  return `<li class="stone-item" data-search="${esc([s.name,s.reading,...(s.aliases||[])].join(' '))}"><article class="stone-card" id="stone-${esc(s.name)}">
    <h3>${esc(s.name)}</h3><p>${esc(s.description)}</p>
    ${detail?`<details class="stone-details"><summary>${s.care?'取り扱い・素材のこと':'素材のこと'}</summary>${paragraph('取り扱い',s.care)}${paragraph('加工について',s.treatment)}${paragraph('知っておきたいこと',s.note)}${refs?`<p class="reference">参考：${refs}</p>`:''}</details>`:''}
    ${s.product?`<a class="product-link" href="${esc(s.product)}">この石を使った作品例を見る <span aria-hidden="true">→</span></a>`:''}
  </article></li>`;
}
const availableGroups=groups.filter(([label])=>stones.some(s=>s.kana===label));
const nav=availableGroups.map(([label,id])=>`<a href="#group-${id}">${label}</a>`).join('');
const list=availableGroups.map(([label,id])=>{
 const entries=stones.filter(s=>s.kana===label).sort((a,b)=>a.reading.localeCompare(b.reading,'ja'));
 return `<section class="stone-group" id="group-${id}" aria-labelledby="group-${id}-title"><h2 class="group-title" id="group-${id}-title">${label}<span class="group-count">${entries.length}種類</span></h2><ul class="stone-grid">${entries.map(card).join('\n')}</ul></section>`;
}).join('\n');
let html=await readFile(new URL('index.template.html',root),'utf8');
html=html.replaceAll('{{COUNT}}',String(stones.length)).replace('{{NAV}}',nav).replace('{{STONES}}',list);
await writeFile(new URL('index.html',root),html);
console.log(`Built ${stones.length} stones; ${stones.filter(s=>s.care).length} care guides.`);
