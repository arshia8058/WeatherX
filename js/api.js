const FORECAST_URL='https://api.open-meteo.com/v1/forecast';
const GEOCODING_URL='https://geocoding-api.open-meteo.com/v1/search';
async function getJSON(url){
  const response=await fetch(url,{headers:{Accept:'application/json'}});
  if(!response.ok) throw new Error(`Weather service returned ${response.status}`);
  return response.json();
}
export async function getForecast({latitude,longitude}){
  const params=new URLSearchParams({latitude,longitude,current:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure',hourly:'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,visibility,uv_index',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset',timezone:'auto',forecast_days:'7',forecast_hours:'24'});
  return getJSON(`${FORECAST_URL}?${params}`);
}
export async function searchCities(query,language='en'){
  const params=new URLSearchParams({name:query,count:'8',language,format:'json'});
  const data=await getJSON(`${GEOCODING_URL}?${params}`);
  return data.results||[];
}
