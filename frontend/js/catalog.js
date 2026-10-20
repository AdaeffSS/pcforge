// Каталог: фильтрация и сортировка карточек без перезагрузки страницы.

const filterForm = document.getElementById("filter-form");
const sortSelect = document.getElementById("sort");
const list = document.getElementById("catalog-list");
const foundCount = document.getElementById("found-count");
const priceError = document.getElementById("price-error");

const cards = Array.from(list.querySelectorAll(".card"));
cards.forEach((card, index) => {
  card.dataset.order = index; // исходный порядок — «по категории»
});

const emptyMessage = document.createElement("p");
emptyMessage.className = "catalog-empty";
emptyMessage.textContent = "Ничего не найдено. Измените условия фильтра.";

function readFilters() {
  const data = new FormData(filterForm);
  return {
    search: data.get("search").trim().toLowerCase(),
    categories: data.getAll("category"),
    brand: data.get("brand"),
    priceMin: data.get("priceMin") === "" ? null : Number(data.get("priceMin")),
    priceMax: data.get("priceMax") === "" ? null : Number(data.get("priceMax")),
  };
}

function validatePrice(filters) {
  let message = "";
  if ((filters.priceMin !== null && filters.priceMin < 0) || (filters.priceMax !== null && filters.priceMax < 0)) {
    message = "Цена не может быть отрицательной";
  } else if (filters.priceMin !== null && filters.priceMax !== null && filters.priceMin > filters.priceMax) {
    message = "Минимальная цена больше максимальной";
  }
  priceError.textContent = message;
  filterForm.querySelectorAll(".price-range .form-field").forEach((field) => {
    field.classList.toggle("has-error", message !== "");
  });
  return message === "";
}

function matchesFilters(card, filters) {
  const price = Number(card.dataset.price);
  return (
    (filters.search === "" || card.dataset.name.toLowerCase().includes(filters.search)) &&
    (filters.categories.length === 0 || filters.categories.includes(card.dataset.category)) &&
    (filters.brand === "" || card.dataset.brand === filters.brand) &&
    (filters.priceMin === null || price >= filters.priceMin) &&
    (filters.priceMax === null || price <= filters.priceMax)
  );
}

const sorters = {
  default: (a, b) => a.dataset.order - b.dataset.order,
  "price-asc": (a, b) => a.dataset.price - b.dataset.price,
  "price-desc": (a, b) => b.dataset.price - a.dataset.price,
  name: (a, b) => a.dataset.name.localeCompare(b.dataset.name, "ru"),
};

function applyFilters() {
  const filters = readFilters();
  if (!validatePrice(filters)) {
    return;
  }
  const visible = cards.filter((card) => matchesFilters(card, filters)).sort(sorters[sortSelect.value]);
  list.replaceChildren(...(visible.length > 0 ? visible : [emptyMessage]));
  foundCount.textContent = visible.length;
}

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  applyFilters();
});
// Флажки и список брендов применяются сразу, поле поиска — по мере ввода
filterForm.addEventListener("change", applyFilters);
filterForm.addEventListener("input", (event) => {
  if (event.target.name === "search") {
    applyFilters();
  }
});
filterForm.addEventListener("reset", () => {
  setTimeout(applyFilters); // поля очищаются после события reset
});
sortSelect.addEventListener("change", applyFilters);

// Переход из сборки вида catalog.html?category=gpu сразу отмечает нужную категорию
const presetCategory = new URLSearchParams(location.search).get("category");
if (presetCategory) {
  const checkbox = filterForm.querySelector(`input[name="category"][value="${presetCategory}"]`);
  if (checkbox) {
    checkbox.checked = true;
  }
}
applyFilters();
