import { searchCities } from './api.js';
import { $, countryName } from './utils.js';

export function initSearch({ onSelect, getLanguage, t }) {
  const input = $('#city-search');
  const results = $('#search-results');
  const form = $('#search-form');
  let timer = 0;
  let controller = null;
  let sequence = 0;

  function close({ clear = true } = {}) {
    sequence += 1;
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    results.hidden = true;
    if (clear) results.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function showStatus(message, className = 'search-status') {
    results.replaceChildren();
    const row = document.createElement('div');
    row.className = className;
    row.dir = 'auto';
    row.setAttribute('role', 'status');
    row.textContent = message;
    results.append(row);
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function showCities(cities) {
    results.replaceChildren();
    if (!cities.length) {
      showStatus(t('noResults'));
      return;
    }
    cities.forEach((city, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.id = `city-result-${index}`;
      option.className = 'search-result';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');
      option.dir = 'auto';
      const name = document.createElement('strong');
      name.dir = 'auto';
      name.textContent = city.name;
      const details = document.createElement('span');
      details.dir = 'auto';
      const region = [city.admin1, city.admin2, city.country || countryName(city.country_code, getLanguage())]
        .filter((item, itemIndex, all) => item && all.indexOf(item) === itemIndex);
      details.textContent = region.join(', ') || t('locationDetailsUnavailable');
      option.append(name, details);
      option.addEventListener('click', () => {
        close();
        input.value = '';
        onSelect(city);
      });
      results.append(option);
    });
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  async function runSearch(query, requestSequence) {
    controller = new AbortController();
    try {
      const cities = await searchCities(query, getLanguage(), controller.signal);
      if (requestSequence === sequence && !controller.signal.aborted) showCities(cities);
    } catch (error) {
      if (error?.name === 'AbortError' || requestSequence !== sequence) return;
      showStatus(t(error?.kind === 'network' && navigator.onLine === false ? 'offlineSearch' : 'searchError'));
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    controller?.abort();
    const requestSequence = ++sequence;
    const query = input.value.trim();
    results.hidden = true;
    results.replaceChildren();
    input.removeAttribute('aria-activedescendant');
    if (query.length < 2) {
      input.setAttribute('aria-expanded', 'false');
      return;
    }
    showStatus(t('searching'));
    timer = window.setTimeout(() => runSearch(query, requestSequence), 240);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    results.querySelector('[role="option"]')?.click();
  });

  input.addEventListener('keydown', (event) => {
    const options = [...results.querySelectorAll('[role="option"]')];
    if (event.key === 'Escape') {
      close();
      return;
    }
    if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
      event.preventDefault();
      options[event.key === 'ArrowDown' ? 0 : options.length - 1].focus();
    }
  });

  results.addEventListener('keydown', (event) => {
    const options = [...results.querySelectorAll('[role="option"]')];
    const current = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      options[(current + step + options.length) % options.length]?.focus();
    } else if (event.key === 'Escape') {
      close();
      input.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) close();
  });

  return {
    close,
    refresh() {
      const query = input.value.trim();
      if (query.length >= 2) input.dispatchEvent(new Event('input', { bubbles: true }));
    },
  };
}
