// Курсы валют ЦБ РФ — внешний источник данных (https://www.cbr-xml-daily.ru).

const RATES_URL = "https://www.cbr-xml-daily.ru/daily_json.js";
let ratesPromise = null;

// Один запрос на страницу: повторные вызовы получают тот же Promise
function fetchRates() {
  if (!ratesPromise) {
    ratesPromise = fetch(RATES_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Ошибка ${response.status}`);
        }
        return response.json();
      })
      .then((data) => ({
        date: new Date(data.Date),
        usd: data.Valute.USD.Value,
        eur: data.Valute.EUR.Value,
      }))
      .catch((error) => {
        ratesPromise = null; // в следующий раз запросим снова
        throw error;
      });
  }
  return ratesPromise;
}

function formatForeign(rubles, rate, symbol) {
  const value = rubles / rate;
  return value.toLocaleString("ru-RU", { maximumFractionDigits: 0 }) + " " + symbol;
}

// Показывает цену в долларах и евро в элементе target.
function renderCurrency(target, rubles) {
  target.className = "status-loading";
  target.textContent = "Загружаем курс ЦБ…";

  fetchRates()
    .then((rates) => {
      target.className = "";
      const date = rates.date.toLocaleDateString("ru-RU");
      target.textContent =
        `≈ ${formatForeign(rubles, rates.usd, "$")} · ${formatForeign(rubles, rates.eur, "€")}` +
        ` (курс ЦБ на ${date})`;
    })
    .catch(() => {
      target.className = "status-error";
      target.textContent = "Курс валют сейчас недоступен — проверьте подключение к интернету.";
    });
}
