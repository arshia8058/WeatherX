import { searchCities } from './api.js';
import { $, countryName } from './utils.js';
export function initSearch({onSelect,getLanguage,t}){
  const input=$('#city-search'),results=$('#search-results'),form=$('#search-form');
  let timer=null,controller=null,requestId=0;
  function close(){results.hidden=true;results.replaceChildren();}
  function showMessage(message){results.replaceChildren();const row=document.createElement('div');row.className='search-result';row.textContent=message;results.append(row);results.hidden=false;}
  function showCities(cities){
    results.replaceChildren();
    if(!cities.length){showMessage(t('noResults'));return;}
    cities.forEach(city=>{
      const button=document.createElement('button');button.type='button';button.className='search-result';button.setAttribute('role','option');
      const name=document.createElement('strong');name.textContent=city.name;
      const place=document.createElement('span');place.textContent=[city.admin1,city.country||countryName(city.country_code,getLanguage())].filter((item,index,list)=>item&&list.indexOf(item)===index).join(', ');
      button.append(name,place);button.addEventListener('click',()=>{close();input.value='';onSelect(city);});results.append(button);
    });results.hidden=false;
  }
  input.addEventListener('input',()=>{
    clearTimeout(timer);if(controller)controller.abort();const query=input.value.trim();
    if(query.length<2){close();return;}
    timer=setTimeout(async()=>{
      const id=++requestId;controller=new AbortController();
      try{const cities=await searchCities(query,getLanguage());if(id===requestId)showCities(cities);}
      catch(error){if(error.name!=='AbortError'&&id===requestId)showMessage(t('searchError'));}
    },260);
  });
  form.addEventListener('submit',event=>{event.preventDefault();results.querySelector('.search-result')?.click();});
  document.addEventListener('click',event=>{if(!form.contains(event.target))close();});
  input.addEventListener('keydown',event=>{if(event.key==='Escape')close();if(event.key==='ArrowDown'){event.preventDefault();results.querySelector('button')?.focus();}});
  return {close};
}
