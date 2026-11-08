export const $=(selector,root=document)=>root.querySelector(selector);
export const $$=(selector,root=document)=>[...root.querySelectorAll(selector)];
export function formatNumber(value,{digits=0,locale='en',...options}={}){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return '—';
  return new Intl.NumberFormat(locale==='fa'?'fa-IR':'en-US',{maximumFractionDigits:digits,...options}).format(value);
}
export function convertTemperature(value,unit){return unit==='f'?value*9/5+32:value;}
export function temperature(value,unit,locale='en'){
  if(value===null||value===undefined||!Number.isFinite(Number(value)))return '—';
  return `${formatNumber(convertTemperature(value,unit),{digits:0,locale})}°`;
}
export function displayDateTime(iso,locale='en',timeZone){
  const date=new Date(iso);
  const lang=locale==='fa'?'fa-IR':'en-US';
  return {date:new Intl.DateTimeFormat(lang,{weekday:'long',month:'long',day:'numeric',timeZone}).format(date),time:new Intl.DateTimeFormat(lang,{hour:'numeric',minute:'2-digit',hour12:locale==='en',timeZone}).format(date)};
}
export function formatApiTime(value,locale='en',timeZone){
  if(!value)return '—';
  // Open-Meteo returns local wall-clock timestamps for the requested timezone.
  const [datePart,timePart]=value.split('T');
  const [year,month,day]=datePart.split('-').map(Number);
  const [hour,minute]=timePart.split(':').map(Number);
  const date=new Date(Date.UTC(year,month-1,day,hour,minute));
  const lang=locale==='fa'?'fa-IR':'en-US';
  return new Intl.DateTimeFormat(lang,{hour:'numeric',minute:'2-digit',hour12:locale==='en',timeZone:'UTC'}).format(date);
}
export function formatApiDate(value,locale='en',options={}){
  const [year,month,day]=value.split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return new Intl.DateTimeFormat(locale==='fa'?'fa-IR':'en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC',...options}).format(date);
}
export function dayDiff(dateA,dateB){
  return Math.round((Date.parse(`${dateB}T00:00:00Z`)-Date.parse(`${dateA}T00:00:00Z`))/86400000);
}
export function countryName(code,locale='en'){
  if(!code)return '';
  try{return new Intl.DisplayNames([locale==='fa'?'fa-IR':'en'],{type:'region'}).of(code)||'';}catch{return '';}
}
export function direction(degrees,t){
  if(!Number.isFinite(Number(degrees)))return '—';
  const key=['dirN','dirNE','dirE','dirSE','dirS','dirSW','dirW','dirNW'][Math.round(Number(degrees)/45)%8];
  return `${t(key)} ${formatNumber(Math.round(degrees),{locale:document.documentElement.lang})}°`;
}
export function uvDescription(value,t,locale){
  const amount=Number(value);let label='uvLow';
  if(amount>=11)label='uvExtreme';else if(amount>=8)label='uvVeryHigh';else if(amount>=6)label='uvHigh';else if(amount>=3)label='uvModerate';
  return `${formatNumber(amount,{digits:0,locale})} · ${t(label)}`;
}
