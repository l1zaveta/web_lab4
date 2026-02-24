
const CONFIG = {
  API_KEY: '59b2860fae8286fa9c5ee5f243a17aa4',
  BASE_URL: 'https://api.openweathermap.org/data/2.5',
  GEO_URL: 'https://api.openweathermap.org/geo/1.0/direct',
  REVERSE_URL: 'https://api.openweathermap.org/geo/1.0/reverse',
  UNITS: 'metric',
  LANG: 'ru',
  FORECAST_DAYS: 3,
  MAX_EXTRA_CITIES: 2,
  DEBOUNCE_DELAY: 300
};


const CITY_DATABASE = [
  "Москва", "Санкт-Петербург", "Новосибирск", "Екатеринбург", "Казань",
  "Нижний Новгород", "Челябинск", "Самара", "Омск", "Ростов-на-Дону",
  "Уфа", "Красноярск", "Воронеж", "Пермь", "Волгоград", "Краснодар",
  "Саратов", "Тюмень", "Тольятти", "Ижевск", "Барнаул", "Ульяновск",
  "Иркутск", "Хабаровск", "Ярославль", "Владивосток", "Махачкала",
  "Томск", "Оренбург", "Кемерово", "Новокузнецк", "Рязань", "Астрахань",
  "Набережные Челны", "Пенза", "Липецк", "Тула", "Киров", "Чебоксары",
  "Калининград", "Брянск", "Курск", "Иваново", "Магнитогорск", "Белгород",
  "Тверь", "Ставрополь", "Симферополь", "Сочи", "Владимир", "Смоленск"
].sort();


const AppState = {
  mainCity: null,
  mainCoords: null,
  extraCities: [],
  weatherCache: new Map(),
  loading: new Map(),
  errors: new Map(),
  geoDenied: false
};


const DOM = {
  mainName: document.getElementById('mainCityName'),
  mainBadge: document.getElementById('mainCityBadge'),
  mainSearch: document.getElementById('mainCitySearch'),
  mainSearchBtn: document.getElementById('mainCitySearchBtn'),
  mainSuggestions: document.getElementById('mainSuggestions'),
  mainError: document.getElementById('mainCityError'),
  mainWeather: document.getElementById('mainWeatherNow'),
  mainForecast: document.getElementById('mainForecast'),
  extraCounter: document.getElementById('extraCounter'),
  extra1Input: document.getElementById('extraCity1Input'),
  extra1Add: document.getElementById('extraCity1Add'),
  extra1Suggestions: document.getElementById('extra1Suggestions'),
  extra1Error: document.getElementById('extraCity1Error'),
  extra1Weather: document.getElementById('extraCity1Weather'),
  extra2Input: document.getElementById('extraCity2Input'),
  extra2Add: document.getElementById('extraCity2Add'),
  extra2Suggestions: document.getElementById('extra2Suggestions'),
  extra2Error: document.getElementById('extraCity2Error'),
  extra2Weather: document.getElementById('extraCity2Weather'),
  refreshBtn: document.getElementById('refreshAllBtn'),
  toastContainer: document.getElementById('toastContainer')
};

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function setLoading(element, isLoading) {
  if (!element) return;
  if (isLoading) {
    element.innerHTML = '<div class="loading">Загрузка данных</div>';
  }
}

function updateExtraCounter() {
  if (DOM.extraCounter) {
    DOM.extraCounter.textContent = `${AppState.extraCities.length}/${CONFIG.MAX_EXTRA_CITIES}`;
  }
}

function clearInputError(input, errorElement) {
  if (input) input.classList.remove('error');
  if (errorElement) {
    errorElement.textContent = '';
    errorElement.classList.remove('visible');
  }
}

function showInputError(input, errorElement, message) {
  if (input) input.classList.add('error');
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add('visible');
  }
}


function saveToStorage() {
  const data = {
    mainCity: AppState.mainCity,
    mainCoords: AppState.mainCoords,
    extraCities: AppState.extraCities,
    geoDenied: AppState.geoDenied
  };
  localStorage.setItem('meteoApp', JSON.stringify(data));
}

function loadFromStorage() {
  const saved = localStorage.getItem('meteoApp');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      AppState.mainCity = data.mainCity || null;
      AppState.mainCoords = data.mainCoords || null;
      AppState.extraCities = data.extraCities || [];
      AppState.geoDenied = data.geoDenied || false;
    } catch (e) {
      console.warn('Failed to load storage');
    }
  }
}

async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function getWeatherByCity(city) {
  const url = `${CONFIG.BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
  const data = await fetchJSON(url);
  return {
    ...data,
    cityName: data.name,
    country: data.sys.country,
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    humidity: data.main.humidity,
    wind: data.wind.speed,
    pressure: data.main.pressure,
    visibility: data.visibility
  };
}

async function getWeatherByCoords(lat, lon) {
  const url = `${CONFIG.BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
  const data = await fetchJSON(url);
  return {
    ...data,
    cityName: 'Текущее местоположение',
    country: data.sys.country,
    temp: Math.round(data.main.temp),
    feelsLike: Math.round(data.main.feels_like),
    description: data.weather[0].description,
    humidity: data.main.humidity,
    wind: data.wind.speed,
    pressure: data.main.pressure,
    visibility: data.visibility
  };
}

async function getForecast(lat, lon) {
  const url = `${CONFIG.BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${CONFIG.API_KEY}&units=${CONFIG.UNITS}&lang=${CONFIG.LANG}`;
  const data = await fetchJSON(url);
  
  
  const dailyMap = new Map();
  data.list.forEach(item => {
    const date = new Date(item.dt * 1000).toDateString();
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date).push(item);
  });
  
  const forecast = [];
  let count = 0;
  for (const [_, items] of dailyMap) {
    if (count >= CONFIG.FORECAST_DAYS) break;
    const dayData = items[Math.floor(items.length / 2)];
    forecast.push({
      dt: dayData.dt,
      temp: Math.round(dayData.main.temp),
      description: dayData.weather[0].description
    });
    count++;
  }
  
  return forecast;
}



function renderMainWeather(data) {
  if (!DOM.mainWeather) return;
  
  const html = `
    <div class="weather-main">
      <div class="temp-large">${data.temp}°<span>C</span></div>
      <div class="weather-desc">${data.description}</div>
    </div>
    <div class="weather-details">
      <div class="detail-item">
        <span class="detail-label">Ощущается</span>
        <span class="detail-value">${data.feelsLike}°C</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Влажность</span>
        <span class="detail-value">${data.humidity}%</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Ветер</span>
        <span class="detail-value">${data.wind} м/с</span>
      </div>
      <div class="detail-item">
        <span class="detail-label">Давление</span>
        <span class="detail-value">${data.pressure} гПа</span>
      </div>
    </div>
  `;
  
  DOM.mainWeather.innerHTML = html;
}

function renderMainForecast(forecast) {
  if (!DOM.mainForecast || !forecast) return;
  
  const html = forecast.map(day => `
    <div class="forecast-day">
      <div class="day-name">${formatDay(day.dt)}</div>
      <div class="day-temp">${day.temp}°</div>
      <div class="day-desc">${day.description}</div>
    </div>
  `).join('');
  
  DOM.mainForecast.innerHTML = html;
}

function formatDay(timestamp) {
  const date = new Date(timestamp * 1000);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const afterTomorrow = new Date(today);
  afterTomorrow.setDate(afterTomorrow.getDate() + 2);
  
  if (date.toDateString() === today.toDateString()) return 'Сегодня';
  if (date.toDateString() === tomorrow.toDateString()) return 'Завтра';
  if (date.toDateString() === afterTomorrow.toDateString()) return 'Послезавтра';
  
  return date.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
}


function renderExtraWeather(container, data, cityName, cityOriginalName) {
  if (!container) return;
  

  
  const displayName = cityName; 
  const cityForDelete = cityOriginalName || displayName.split(',')[0].trim();
  
  const html = `
    <div class="extra-weather-content">
      <div class="extra-city-title">${displayName}</div>
      <div class="extra-temp-row">
        <span class="extra-temp">${data.temp}°C</span>
        <span class="extra-desc">${data.description}</span>
      </div>
      <button class="remove-city-btn" data-city="${cityForDelete}">Удалить</button>
    </div>
  `;
  
  container.innerHTML = html;
  
  
  const removeBtn = container.querySelector('.remove-city-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const cityToRemove = removeBtn.dataset.city;
      console.log('Удаляем город:', cityToRemove);
      removeExtraCity(cityToRemove);
    });
  }
}


async function loadMainCity(city) {
  if (!city) return;
  
  clearInputError(DOM.mainSearch, DOM.mainError);
  setLoading(DOM.mainWeather, true);
  setLoading(DOM.mainForecast, true);
  
  try {
    const weather = await getWeatherByCity(city);
    AppState.mainCity = city;
    AppState.mainCoords = { lat: weather.coord.lat, lon: weather.coord.lon };
    
    DOM.mainName.textContent = `${weather.cityName}, ${weather.country}`;
    DOM.mainBadge.textContent = 'основной';
    renderMainWeather(weather);
    
    const forecast = await getForecast(weather.coord.lat, weather.coord.lon);
    renderMainForecast(forecast);
    
    AppState.weatherCache.set('main', weather);
    saveToStorage();
    showToast('Данные загружены');
  } catch (error) {
    console.error(error);
    DOM.mainWeather.innerHTML = '<div class="error-message">Ошибка загрузки города</div>';
    showInputError(DOM.mainSearch, DOM.mainError, 'Город не найден или ошибка сети');
  } finally {
    setLoading(DOM.mainWeather, false);
    setLoading(DOM.mainForecast, false);
  }
}

async function loadMainByCoords(lat, lon) {
  setLoading(DOM.mainWeather, true);
  setLoading(DOM.mainForecast, true);
  
  try {
    const weather = await getWeatherByCoords(lat, lon);
    AppState.mainCity = 'current';
    AppState.mainCoords = { lat, lon };
    
    DOM.mainName.textContent = 'Текущее местоположение';
    DOM.mainBadge.textContent = 'гео';
    renderMainWeather(weather);
    
    const forecast = await getForecast(lat, lon);
    renderMainForecast(forecast);
    
    AppState.weatherCache.set('main', weather);
    saveToStorage();
  } catch (error) {
    console.error(error);
    DOM.mainWeather.innerHTML = '<div class="error-message">Ошибка геолокации</div>';
  } finally {
    setLoading(DOM.mainWeather, false);
    setLoading(DOM.mainForecast, false);
  }
}


async function addExtraCity(city, slot) {
  const input = slot === 1 ? DOM.extra1Input : DOM.extra2Input;
  const errorEl = slot === 1 ? DOM.extra1Error : DOM.extra2Error;
  clearInputError(input, errorEl);
  
  if (AppState.extraCities.length >= CONFIG.MAX_EXTRA_CITIES) {
    showInputError(input, errorEl, 'Достигнут лимит дополнительных городов');
    return false;
  }
  
  const cityLower = city.toLowerCase().trim();
  
  
  if (AppState.mainCity && AppState.mainCity.toLowerCase() === cityLower) {
    showInputError(input, errorEl, 'Этот город уже добавлен как основной');
    return false;
  }
  
  
  const isDuplicate = AppState.extraCities.some(c => c.toLowerCase() === cityLower);
  if (isDuplicate) {
    showInputError(input, errorEl, 'Этот город уже добавлен');
    return false;
  }
  
  
  const cityExists = CITY_DATABASE.some(c => c.toLowerCase() === cityLower);
  if (!cityExists) {
    showInputError(input, errorEl, 'Выберите город из списка');
    return false;
  }
  
  setLoading(slot === 1 ? DOM.extra1Weather : DOM.extra2Weather, true);
  
  try {
    const weather = await getWeatherByCity(city);
    
    
    const correctCity = CITY_DATABASE.find(c => c.toLowerCase() === cityLower);
    
    
    AppState.extraCities.push(correctCity);
    
    
    const container = slot === 1 ? DOM.extra1Weather : DOM.extra2Weather;
    
    
    renderExtraWeather(
      container, 
      weather, 
      `${weather.cityName}, ${weather.country}`,
      correctCity 
    );
    
    AppState.weatherCache.set(`extra${slot}`, weather);
    updateExtraCounter();
    saveToStorage();
    
    input.value = '';
    showToast('Город добавлен');
    return true;
  } catch (error) {
    console.error(error);
    showInputError(input, errorEl, 'Ошибка загрузки города');
    return false;
  } finally {
    setLoading(slot === 1 ? DOM.extra1Weather : DOM.extra2Weather, false);
  }
}


function removeExtraCity(city) {
  console.log('removeExtraCity вызван с city:', city);
  console.log('Текущие extraCities:', AppState.extraCities);
  
  
  AppState.extraCities = AppState.extraCities.filter(c => 
    c.toLowerCase() !== city.toLowerCase()
  );
  
  console.log('После фильтрации:', AppState.extraCities);
  
  
  DOM.extra1Weather.innerHTML = '';
  DOM.extra2Weather.innerHTML = '';
  
  
  clearInputError(DOM.extra1Input, DOM.extra1Error);
  clearInputError(DOM.extra2Input, DOM.extra2Error);
  
  
  AppState.weatherCache.delete('extra1');
  AppState.weatherCache.delete('extra2');
  
  
  if (AppState.extraCities.length > 0) {
    
    const loadRemainingCities = async () => {
      for (let i = 0; i < AppState.extraCities.length; i++) {
        try {
          const cityName = AppState.extraCities[i];
          const weather = await getWeatherByCity(cityName);
          const container = i === 0 ? DOM.extra1Weather : DOM.extra2Weather;
          
          renderExtraWeather(
            container, 
            weather, 
            `${weather.cityName}, ${weather.country}`,
            cityName 
          );
        } catch (e) {
          console.warn('Failed to reload extra city:', e);
        }
      }
    };
    
    loadRemainingCities();
  }
  
  updateExtraCounter();
  saveToStorage();
  showToast('Город удален');
}


function setupAutocomplete(input, suggestionsEl, onSelect) {
  if (!input || !suggestionsEl) return;
  
  let timeout;
  
  input.addEventListener('input', (e) => {
    clearTimeout(timeout);
    const query = e.target.value.toLowerCase().trim();
    
    if (query.length < 2) {
      suggestionsEl.classList.remove('active');
      return;
    }
    
    timeout = setTimeout(() => {
      const matches = CITY_DATABASE.filter(city => 
        city.toLowerCase().includes(query)
      ).slice(0, 5);
      
      if (matches.length > 0) {
        suggestionsEl.innerHTML = matches.map(city => 
          `<div class="suggestion-item" data-city="${city}">${city}</div>`
        ).join('');
        suggestionsEl.classList.add('active');
        
        suggestionsEl.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = item.dataset.city;
            suggestionsEl.classList.remove('active');
            if (onSelect) onSelect(item.dataset.city);
          });
        });
      } else {
        suggestionsEl.classList.remove('active');
      }
    }, CONFIG.DEBOUNCE_DELAY);
  });
  
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsEl.contains(e.target)) {
      suggestionsEl.classList.remove('active');
    }
  });
  
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      suggestionsEl.classList.remove('active');
    }
  });
}


async function refreshAll() {
  showToast('Обновление данных...');
  
  if (AppState.mainCity === 'current' && AppState.mainCoords) {
    await loadMainByCoords(AppState.mainCoords.lat, AppState.mainCoords.lon);
  } else if (AppState.mainCity) {
    await loadMainCity(AppState.mainCity);
  }
  
  
  if (AppState.extraCities.length > 0) {
    DOM.extra1Weather.innerHTML = '';
    DOM.extra2Weather.innerHTML = '';
    
    for (let i = 0; i < AppState.extraCities.length; i++) {
      try {
        const cityName = AppState.extraCities[i];
        const weather = await getWeatherByCity(cityName);
        const container = i === 0 ? DOM.extra1Weather : DOM.extra2Weather;
        renderExtraWeather(
          container, 
          weather, 
          `${weather.cityName}, ${weather.country}`,
          cityName
        );
      } catch (e) {
        console.warn('Failed to refresh extra city');
      }
    }
  }
  
  showToast('Данные обновлены');
}


function requestGeolocation() {
  if (!navigator.geolocation) {
    AppState.geoDenied = true;
    DOM.mainName.textContent = 'Введите город';
    showToast('Геолокация не поддерживается браузером', 'error');
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      await loadMainByCoords(position.coords.latitude, position.coords.longitude);
      AppState.geoDenied = false;
      saveToStorage();
    },
    (error) => {
      console.warn('Geolocation error:', error);
      AppState.geoDenied = true;
      saveToStorage();
      DOM.mainName.textContent = 'Введите город';
      showToast('Доступ к геолокации отклонён. Введите город вручную.', 'info');
    },
    {
      timeout: 10000,
      maximumAge: 0
    }
  );
}


async function init() {
  loadFromStorage();
  
  setupAutocomplete(DOM.mainSearch, DOM.mainSuggestions, (city) => {
    clearInputError(DOM.mainSearch, DOM.mainError);
    loadMainCity(city);
  });
  
  setupAutocomplete(DOM.extra1Input, DOM.extra1Suggestions, (city) => {
    clearInputError(DOM.extra1Input, DOM.extra1Error);
    addExtraCity(city, 1);
  });
  
  setupAutocomplete(DOM.extra2Input, DOM.extra2Suggestions, (city) => {
    clearInputError(DOM.extra2Input, DOM.extra2Error);
    addExtraCity(city, 2);
  });
  
  DOM.mainSearchBtn.addEventListener('click', () => {
    if (DOM.mainSearch.value.trim()) {
      clearInputError(DOM.mainSearch, DOM.mainError);
      loadMainCity(DOM.mainSearch.value.trim());
    }
  });
  
  DOM.extra1Add.addEventListener('click', () => {
    if (DOM.extra1Input.value.trim()) {
      addExtraCity(DOM.extra1Input.value.trim(), 1);
    }
  });
  
  DOM.extra2Add.addEventListener('click', () => {
    if (DOM.extra2Input.value.trim()) {
      addExtraCity(DOM.extra2Input.value.trim(), 2);
    }
  });
  
  DOM.refreshBtn.addEventListener('click', refreshAll);
  
  DOM.mainSearch.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && DOM.mainSearch.value.trim()) {
      clearInputError(DOM.mainSearch, DOM.mainError);
      loadMainCity(DOM.mainSearch.value.trim());
    }
  });
  
  updateExtraCounter();
  
  if (!AppState.mainCity && !AppState.geoDenied) {
    requestGeolocation();
  } else if (AppState.mainCity === 'current' && AppState.mainCoords) {
    await loadMainByCoords(AppState.mainCoords.lat, AppState.mainCoords.lon);
  } else if (AppState.mainCity) {
    await loadMainCity(AppState.mainCity);
  }
  
  
  if (AppState.extraCities.length > 0) {
    for (let i = 0; i < AppState.extraCities.length; i++) {
      try {
        const cityName = AppState.extraCities[i];
        const weather = await getWeatherByCity(cityName);
        const container = i === 0 ? DOM.extra1Weather : DOM.extra2Weather;
        renderExtraWeather(
          container, 
          weather, 
          `${weather.cityName}, ${weather.country}`,
          cityName
        );
      } catch (e) {
        console.warn('Failed to restore extra city');
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', init);