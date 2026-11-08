import { searchCities } from './api.js';
import { $, countryName } from './utils.js';

export function initSearch({ onSelect, getLanguage, t }) {
  const input = $('#city-search');
  const results = $('#search-results');
  const liveRegion = $('#search-live');
  const form = $('#search-form');
  let timer = 0;
  let controller = null;
  let sequence = 0;
  let activeIndex = -1;

  function options() {
    return [...results.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
  }

  function setActive(index) {
    const choices = options();
    activeIndex = choices.length ? ((index % choices.length) + choices.length) % choices.length : -1;
    choices.forEach((option, choiceIndex) => option.setAttribute('aria-selected', String(choiceIndex === activeIndex)));
    if (activeIndex < 0) input.removeAttribute('aria-activedescendant');
    else {
      const active = choices[activeIndex];
      input.setAttribute('aria-activedescendant', active.id);
      active.scrollIntoView?.({ block: 'nearest' });
    }
  }

  function close({ clear = true } = {}) {
    sequence += 1;
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    activeIndex = -1;
    results.hidden = true;
    if (clear) results.replaceChildren();
    liveRegion.textContent = '';
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }

  function showStatus(message) {
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');
    results.replaceChildren();
    const row = document.createElement('div');
    row.className = 'search-status';
    row.dir = 'auto';
    row.setAttribute('aria-hidden', 'true');
    row.textContent = message;
    results.append(row);
    liveRegion.textContent = message;
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function selectCity(city) {
    close();
    input.value = '';
    onSelect(city);
  }

  function showCities(cities) {
    results.replaceChildren();
    activeIndex = -1;
    if (!cities.length) {
      showStatus(t('noResults'));
      return;
    }
    cities.forEach((city, index) => {
      const option = document.createElement('div');
      option.id = `city-result-${sequence}-${index}`;
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
      option.addEventListener('mousedown', (event) => event.preventDefault());
      option.addEventListener('click', () => selectCity(city));
      results.append(option);
    });
    liveRegion.textContent = t('searchResultsCount', cities.length);
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  async function runSearch(query, requestSequence) {
    const requestController = new AbortController();
    controller = requestController;
    try {
      const cities = await searchCities(query, getLanguage(), requestController.signal);
      if (requestSequence === sequence && !requestController.signal.aborted) showCities(cities);
    } catch (error) {
      if (error?.name === 'AbortError' || requestSequence !== sequence) return;
      showStatus(t(error?.kind === 'network' && navigator.onLine === false ? 'offlineSearch' : 'searchError'));
    } finally {
      if (controller === requestController) controller = null;
    }
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    controller?.abort();
    controller = null;
    const requestSequence = ++sequence;
    const query = input.value.trim();
    results.hidden = true;
    results.replaceChildren();
    liveRegion.textContent = '';
    activeIndex = -1;
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
    const choices = options();
    if (choices.length) {
      const selected = choices[activeIndex] || choices[0];
      selected?.click();
    }
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (input.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        close();
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const choices = options();
      if (!choices.length) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActive(activeIndex < 0 ? (direction === 1 ? 0 : choices.length - 1) : activeIndex + direction);
    }
  });

  form.addEventListener('focusout', (event) => {
    if (!form.contains(event.relatedTarget)) close();
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
