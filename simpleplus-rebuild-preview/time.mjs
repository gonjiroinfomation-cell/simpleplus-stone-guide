// Business dates are always Japan time, independent of the device timezone.
export const TIME_ZONE = 'Asia/Tokyo';
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit',
  hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
});
export function timestamp(value) {
  if (value instanceof Date) return value.getTime();
  const text = String(value ?? '').trim();
  const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(text);
  if (!match) return NaN;
  const [ , day, hour='00', minute='00', second='00', fraction='', zone='+09:00'] = match;
  const dayCheck = new Date(day+'T00:00:00Z');
  if (!Number.isFinite(dayCheck.getTime()) || dayCheck.toISOString().slice(0,10)!==day || +hour>23 || +minute>59 || +second>59) return NaN;
  return Date.parse(`${day}T${hour}:${minute}:${second}${fraction}${zone}`);
}
function parts(value) {
  const ms = timestamp(value);
  if (!Number.isFinite(ms)) return null;
  return Object.fromEntries(formatter.formatToParts(ms).map(p=>[p.type,p.value]));
}
export function localTime(value=new Date(), includeSeconds=false) {
  const p=parts(value);
  return p ? `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${includeSeconds?':'+p.second:''}` : '';
}
export const datePart = value => localTime(value).slice(0,10);
export const dateToday = () => datePart(new Date());
export function formatDateTime(value) {
  if (value==null || value==='') return '日時未設定';
  const text=localTime(value);
  if (!text) return '日時要確認';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return text.slice(0,10).replaceAll('-','/')+'（日付のみ・日本時間）';
  return text.replaceAll('-','/').replace('T',' ')+'（日本時間）';
}
export function csvDateTime(value) {
  if(value==null || value==='') return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);
  const text=localTime(value,true);
  return text ? text+'+09:00' : String(value);
}
