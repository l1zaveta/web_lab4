
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