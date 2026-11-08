import { getForecast } from './api.js';
import { initSearch } from './search.js';
import { renderWeather } from './weather.js';
import { translations } from './translations.js';
import { $, $$, countryName } from './utils.js';

const KEYS={language:'weatherx-language',unit:'weatherx-unit',place:'weatherx-place'};
const stored=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
let language=stored(KEYS.language,'en');if(!['en','fa'].includes(language))language='en';
let unit=stored(KEYS.unit,'c');if(!['c','f'].includes(unit))unit='c';
let activePlace=null,weatherData=null,loading=false,requestCount=0;
const t=(key,...args)=>{
  const value=translations[language][key];
  if(key.startsWith('condition_'))return translations[language].conditions[key.slice(10)]||translations[language].conditions[3];
  return typeof value==='function'?value(...args):value??key;
};
const persist=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
function applyTranslations(){
  document.documentElement.lang=language;document.documentElement.dir=language==='fa'?'rtl':'ltr';
  document.title=language==='fa'?'WeatherX — آب‌وهوا، با نگاهی تازه':'WeatherX — Weather, in focus';
  $$('[data-i18n]').forEach(el=>{const value=t(el.dataset.i18n);if(value!==undefined)el.innerHTML=value;});
  $$('[data-i18n-placeholder]').forEach(el=>el.placeholder=t(el.dataset.i18nPlaceholder));
  $('#language-button').textContent=language==='en'?'فارسی':'English';
  $('#language-button').setAttribute('aria-label',language==='en'?'Switch to Persian':'تغییر زبان به انگلیسی');
  $('#location-button').title=t('locationTitle');$('#location-button').setAttribute('aria-label',t('locationTitle'));
  $('#refresh-button').title=t('refreshTitle');$('#refresh-button').setAttribute('aria-label',t('refreshTitle'));
  $('#unit-button').setAttribute('aria-label',t('changeUnit'));
  $$('.unit-option').forEach(option=>option.classList.toggle('active',option.dataset.unit===unit));
  if(weatherData&&activePlace)renderWeather(weatherData,activePlace,{lang:language,unit,t});
  if(loading)$('#loading').querySelector('[data-i18n]').textContent=t('loading');
}
function setNotice(message,kind='error'){
  const notice=$('#notice');notice.textContent=message;notice.classList.toggle('success',kind==='success');notice.hidden=false;
}
function hideNotice(){$('#notice').hidden=true;}
function setLoading(value,message=t('loading')){
  loading=value;$('#loading').hidden=!value;
  if(value)$('#loading').querySelector('[data-i18n]').textContent=message;
  $('#refresh-button').disabled=value;
}
function cityLabel(place){return place.name;}
async function loadPlace(place,{save=true,announce=false}={}){
  if(place?.latitude===undefined||place?.longitude===undefined||place?.latitude===null||place?.longitude===null){setNotice(t('weatherError'));return;}
  activePlace={...place};
  if(save&&place.name!=='__geolocation__')persist(KEYS.place,JSON.stringify(place));
  const id=++requestCount;hideNotice();setLoading(true);
  try{
    const data=await getForecast(activePlace);
    if(id!==requestCount)return;
    weatherData=data;
    let displayPlace={...activePlace};
    if(activePlace.name==='__geolocation__'){
      displayPlace={...activePlace,name:t('myLocation'),admin1:'',country:countryName(activePlace.country_code,language)||activePlace.timezone?.split('/').pop()?.replaceAll('_',' ')||''};
    }
    renderWeather(data,displayPlace,{lang:language,unit,t});
    if(announce)setNotice(t('forecastUpdated'),'success');
  }catch(error){
    if(id!==requestCount)return;
    console.error('WeatherX forecast request failed:',error);
    setNotice(t('weatherError'));
  }finally{if(id===requestCount)setLoading(false);}
}
const search=initSearch({onSelect:place=>loadPlace(place),getLanguage:()=>language,t});
$('#language-button').addEventListener('click',()=>{language=language==='en'?'fa':'en';persist(KEYS.language,language);applyTranslations();search.close();});
$('#unit-button').addEventListener('click',event=>{const clicked=event.target.closest('[data-unit]');unit=clicked?clicked.dataset.unit:unit==='c'?'f':'c';persist(KEYS.unit,unit);applyTranslations();});
$('#refresh-button').addEventListener('click',()=>{if(activePlace)loadPlace(activePlace,{save:false,announce:true});});
$('#location-button').addEventListener('click',()=>{
  hideNotice();
  if(!('geolocation'in navigator)){setNotice(t('geoUnsupported'));return;}
  setLoading(true,t('geoLoading'));
  navigator.geolocation.getCurrentPosition(position=>{
    setLoading(false);
    const place={name:'__geolocation__',latitude:position.coords.latitude,longitude:position.coords.longitude,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone};
    loadPlace(place,{save:false});
  },error=>{
    setLoading(false);
    const key=error.code===1?'geoDenied':error.code===2?'geoUnavailable':'geoTimeout';setNotice(t(key));
  },{enableHighAccuracy:false,timeout:12000,maximumAge:300000});
});
applyTranslations();
let initialPlace;
try{initialPlace=JSON.parse(stored(KEYS.place,'null'));}catch{initialPlace=null;}
if(!initialPlace?.latitude||!initialPlace?.longitude)initialPlace={name:'Stockholm',admin1:'Stockholm County',country:'Sweden',country_code:'SE',latitude:59.3293,longitude:18.0686,timezone:'Europe/Stockholm'};
loadPlace(initialPlace);
