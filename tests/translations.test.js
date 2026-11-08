import test from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../js/translations.js';

test('English and Persian translation catalogs cover the same UI keys', () => {
  const compareKeys = (left, right, path = '') => {
    assert.deepEqual(Object.keys(left).sort(), Object.keys(right).sort(), `translation keys differ at ${path || 'root'}`);
    for (const key of Object.keys(left)) {
      if (left[key] && typeof left[key] === 'object') compareKeys(left[key], right[key], `${path}.${key}`);
      else assert.notEqual(right[key], '', `empty Persian translation at ${path}.${key}`);
    }
  };
  compareKeys(translations.en, translations.fa);
});
