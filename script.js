/* Progressive enhancement: the full guide remains readable without JavaScript. */
function normalizeStoneSearch(value) {
  return value.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/\s+/g,' ').trim();
}
function setupStoneSearch() {
  const search = document.getElementById('stone-search');
  if (!search) return;
  const items = Array.from(document.querySelectorAll('.stone-item'));
  const groups = Array.from(document.querySelectorAll('.stone-group'));
  const normalized = items.map(item=>normalizeStoneSearch(item.dataset.search));
  const update = () => {
    const tokens = normalizeStoneSearch(search.value).split(' ').filter(Boolean);
    let count = 0;
    items.forEach((item,i) => {
      item.hidden = !tokens.every(token=>normalized[i].includes(token));
      if (!item.hidden) count++;
    });
    groups.forEach(group=>{
      const n = Array.from(group.querySelectorAll('.stone-item')).filter(item=>!item.hidden).length;
      group.hidden = n === 0;
      group.querySelector('.group-count').textContent = n+'種類';
    });
    document.querySelectorAll('.kana-scroll a').forEach(link=>{
      link.hidden = document.getElementById(link.hash.slice(1)).hidden;
    });
    document.getElementById('search-status').textContent = count+'種類を表示';
    document.getElementById('no-results').hidden = count !== 0;
  };
  search.addEventListener('input',update);
  document.getElementById('clear-search').addEventListener('click',()=>{search.value='';update();search.focus();});
  document.getElementById('search-controls').hidden = false;
}
if (typeof document !== 'undefined') setupStoneSearch();
if (typeof module !== 'undefined' && module.exports) module.exports = { normalizeStoneSearch };
