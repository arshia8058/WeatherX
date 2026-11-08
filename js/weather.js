import { $, formatNumber, temperature, formatApiTime, formatApiDate, dayDiff, direction, uvDescription } from './utils.js';

function kind(code){
  if(code===0)return 'sun';if(code===1||code===2)return 'partly';if(code===3)return 'cloud';
  if([45,48].includes(code))return 'fog';if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code))return 'rain';
  if([71,73,75,77,85,86].includes(code))return 'snow';return 'partly';
}
export function weatherIcon(code,{large=false}={}){
  const type=kind(Number(code));
  const sun='<circle cx="47" cy="36" r="13" fill="#FFD36E"/><g stroke="#FFD36E" stroke-width="3" stroke-linecap="round"><path d="M47 12v5M47 55v5M23 36h5m38 0h5M30 19l4 4m26 26 4 4m0-34-4 4m-26 26-4 4"/></g>';
  const cloud='<path d="M30 61h34a14 14 0 0 0 0-28c-1 0-2 .1-3 .3a19 19 0 0 0-37 4A12 12 0 0 0 30 61Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/>';
  let art='';
  if(type==='sun')art=sun;
  if(type==='partly')art=sun+'<path d="M31 65h33a13 13 0 0 0 0-26c-1 0-2 .1-3 .3a18 18 0 0 0-27 4" fill="#fff" stroke="#dce9fb" stroke-width="2" stroke-linecap="round"/>';
  if(type==='cloud')art='<path d="M26 63h39a16 16 0 0 0 0-32c-1.1 0-2.2.1-3.3.3a21 21 0 0 0-40 5A13.5 13.5 0 0 0 26 63Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/>';
  if(type==='rain')art=cloud+'<g stroke="#68a7f8" stroke-width="3" stroke-linecap="round"><path d="m37 68-3 7m17-7-3 7m17-7-3 7"/></g>';
  if(type==='snow')art=cloud+'<g fill="#74aaf0"><circle cx="36" cy="72" r="2.7"/><circle cx="52" cy="76" r="2.7"/><circle cx="66" cy="70" r="2.7"/></g>';
  if(type==='fog')art='<path d="M29 57h35a13 13 0 0 0 0-26c-1 0-2 .1-3 .3a18 18 0 0 0-34 5A12 12 0 0 0 29 57Z" fill="#fff" stroke="#dce9fb" stroke-width="2"/><g stroke="#91b5df" stroke-width="3" stroke-linecap="round"><path d="M23 65h42M31 72h33"/></g>';
  const box=large?'0 0 92 90':'10 5 78 80';
  return `<svg class="weather-svg" viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${art}</svg>`;
}
function atIndex(hourly,time){
  if(!hourly?.time||!time)return -1;
  const exact=hourly.time.indexOf(time);
  if(exact>=0)return exact;
  const hourKey=time.slice(0,13);
  return hourly.time.findIndex(item=>item.slice(0,13)===hourKey);
}
export function renderWeather(data,place,{lang,unit,t}){
  const {current,hourly,daily}=data;
  const locale=lang;
  const index=atIndex(hourly,current.time);
  const near=(field)=>index>=0?hourly[field]?.[index]:null;
  const cityTitle=place.name||'';
  const country=place.country||'';
  $('#city-name').textContent=cityTitle;
  $('#city-region').textContent=[place.admin1,country].filter((item,index,list)=>item&&list.indexOf(item)===index&&item!==cityTitle).join(', ')||country||place.timezone||'';
  $('#current-temp').innerHTML=`${temperature(current.temperature_2m,unit,locale).replace('°','')}<span>°</span>`;
  $('#current-condition').textContent=t(`condition_${current.weather_code}`)||t.condition(current.weather_code);
  $('#feels-like').textContent=`${t('feelsLike')} ${temperature(current.apparent_temperature,unit,locale)}`;
  $('#hero-icon').innerHTML=weatherIcon(current.weather_code,{large:true});
  const localDate=current.time.split('T')[0];
  $('#local-date').textContent=formatApiDate(localDate,locale,{weekday:'long',month:'long',day:'numeric'});
  $('#local-time').textContent=formatApiTime(current.time,locale);
  $('#high-temp').textContent=temperature(daily.temperature_2m_max?.[0],unit,locale);
  $('#low-temp').textContent=temperature(daily.temperature_2m_min?.[0],unit,locale);
  $('#metric-humidity').textContent=`${formatNumber(current.relative_humidity_2m,{locale})}%`;
  $('#metric-wind').textContent=`${formatNumber(current.wind_speed_10m,{digits:0,locale})} ${lang==='fa'?'کیلومتر/ساعت':'km/h'}`;
  $('#metric-direction').textContent=direction(current.wind_direction_10m,t);
  $('#metric-pressure').textContent=`${formatNumber(current.surface_pressure,{locale})} ${lang==='fa'?'هکتوپاسکال':'hPa'}`;
  $('#metric-precipitation').textContent=`${formatNumber(current.precipitation,{digits:1,locale})} ${lang==='fa'?'میلی‌متر':'mm'}`;
  $('#metric-rain').textContent=`${formatNumber(near('precipitation_probability'),{locale})}%`;
  $('#metric-uv').textContent=uvDescription(near('uv_index'),t,locale);
  const visibility=near('visibility');
  $('#metric-visibility').textContent=visibility===null||visibility===undefined?'—':`${formatNumber(visibility/1000,{digits:1,locale})} ${lang==='fa'?'کیلومتر':'km'}`;

  const hourlyNow=index<0?0:index;
  const hourlyTimes=hourly.time.slice(hourlyNow,hourlyNow+24);
  $('#hourly-strip').innerHTML=hourlyTimes.map((time,offset)=>{
    const i=hourlyNow+offset;
    const hour=formatApiTime(time,locale);
    const label=offset===0?t('now'):hour;
    return `<article class="hour-item"><span class="hour-time">${label}</span><span class="hour-icon">${weatherIcon(hourly.weather_code[i])}</span><strong class="hour-temp">${temperature(hourly.temperature_2m[i],unit,locale)}</strong><span class="hour-rain">${formatNumber(hourly.precipitation_probability[i],{locale})}%</span></article>`;
  }).join('');
  const today=localDate;
  $('#daily-list').innerHTML=daily.time.slice(0,7).map((date,i)=>{
    const diff=dayDiff(today,date);
    const dayName=diff===0?t('today'):diff===1?t('tomorrow'):formatApiDate(date,locale,{weekday:'short'});
    const fullDate=formatApiDate(date,locale,{month:'short',day:'numeric'});
    return `<div class="day-row"><div class="day-name">${dayName}<small>${fullDate}</small></div><span class="day-icon">${weatherIcon(daily.weather_code[i])}</span><span class="day-rain">${formatNumber(daily.precipitation_probability_max[i],{locale})}% ${lang==='fa'?'بارش':'rain'}</span><div class="day-temperatures"><span class="max">${temperature(daily.temperature_2m_max[i],unit,locale)}</span><span class="min">${temperature(daily.temperature_2m_min[i],unit,locale)}</span></div></div>`;
  }).join('');
  $('#sunrise-time').textContent=formatApiTime(daily.sunrise[0],locale);
  $('#sunset-time').textContent=formatApiTime(daily.sunset[0],locale);
  const sunrise=new Date(`${daily.sunrise[0]}Z`),sunset=new Date(`${daily.sunset[0]}Z`);
  const minutes=Math.max(0,Math.round((sunset-sunrise)/60000));
  $('#daylight-duration').textContent=`${formatNumber(Math.floor(minutes/60),{locale})}${lang==='fa'?'س':'h'} ${formatNumber(minutes%60,{locale})}${lang==='fa'?'د':'m'}`;
}
