export function forecastFixture() {
  const base = new Date('2026-05-01T00:00:00Z');
  const hours = Array.from({ length: 24 }, (_, index) => new Date(base.getTime() + index * 3600000).toISOString().slice(0, 16));
  const days = Array.from({ length: 7 }, (_, index) => new Date(base.getTime() + index * 86400000).toISOString().slice(0, 10));
  const series = (value) => Array(24).fill(value);
  const dailySeries = (value) => Array(7).fill(value);
  return {
    latitude: 0, longitude: 0, timezone: 'UTC', timezone_abbreviation: 'UTC', utc_offset_seconds: 0,
    current: {
      time: hours[0], temperature_2m: 12.5, relative_humidity_2m: 55, apparent_temperature: 11.2,
      precipitation: 0, weather_code: 1, is_day: 1, wind_speed_10m: 14.4, wind_direction_10m: 0, surface_pressure: 1012.3,
    },
    hourly: {
      time: hours, temperature_2m: series(12), precipitation_probability: series(15), weather_code: series(1),
      wind_speed_10m: series(14.4), wind_direction_10m: series(0), visibility: series(12000), uv_index: series(0),
    },
    daily: {
      time: days, weather_code: dailySeries(1), temperature_2m_max: dailySeries(18), temperature_2m_min: dailySeries(7),
      precipitation_probability_max: dailySeries(20), sunrise: days.map((day) => `${day}T05:00`), sunset: days.map((day) => `${day}T20:30`),
    },
  };
}
