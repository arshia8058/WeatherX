import test from 'node:test';
import assert from 'node:assert/strict';
import { getForecast, validateForecast } from '../js/api.js';
import { forecastFixture } from './fixtures.js';

const originalFetch = globalThis.fetch;

test('persistent weather cache stays bounded to five valid locations', async () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
  });
  globalThis.fetch = async () => new Response(JSON.stringify(forecastFixture()), { status: 200 });
  values.set('weatherx-cache-v2', JSON.stringify({ broken: { data: {}, savedAt: Date.now() } }));
  try {
    for (let index = 0; index < 8; index += 1) {
      await getForecast({ latitude: 10 + index, longitude: -30 - index, force: true });
    }
    const entries = JSON.parse(values.get('weatherx-cache-v2'));
    assert.equal(Object.keys(entries).length, 5);
    assert.ok(!('broken' in entries));
    assert.ok(Object.values(entries).every((entry) => Number.isFinite(entry.savedAt) && validateForecast(entry.data) === entry.data));
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
    globalThis.fetch = originalFetch;
  }
});
