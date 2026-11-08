import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherIcon } from '../js/weather.js';

test('low-probability rain and snow use a neutral cloud visual without changing the condition source', () => {
  const lowChanceRain = weatherIcon(61, { precipitationProbability: 5 });
  const likelyRain = weatherIcon(61, { precipitationProbability: 35 });
  const lowChanceSnow = weatherIcon(71, { precipitationProbability: 5 });
  assert.doesNotMatch(lowChanceRain, /m37 68/);
  assert.match(likelyRain, /m37 68/);
  assert.doesNotMatch(lowChanceSnow, /cx="36" cy="72"/);
  assert.match(weatherIcon(71, { precipitationProbability: 35 }), /cx="36" cy="72"/);
  assert.match(weatherIcon(61), /m37 68/); // Missing probability keeps the API condition icon.
});

test('thunderstorm codes use a lightning icon even when rain probability is low', () => {
  const storm = weatherIcon(95, { precipitationProbability: 5 });
  assert.match(storm, /ffd36e/);
  assert.doesNotMatch(storm, /m37 68/);
});
