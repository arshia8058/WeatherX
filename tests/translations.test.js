import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
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

test('every static HTML translation marker exists in both languages', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const keys = new Set([...html.matchAll(/data-i18n(?:-placeholder)?="([^"]+)"/g)].map((match) => match[1]));
  for (const key of keys) {
    assert.ok(key in translations.en, `missing English translation: ${key}`);
    assert.ok(key in translations.fa, `missing Persian translation: ${key}`);
  }
});
