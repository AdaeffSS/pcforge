// Каталог: данные приходят с сервера, фильтры и сортировка — без перезагрузки страницы.

const filterForm = document.getElementById("filter-form");
const sortSelect = document.getElementById("sort");
const list = document.getElementById("catalog-list");
const foundCount = document.getElementById("found-count");
const priceError = document.getElementById("price-error");

function readFilters() {
  const data = new FormData(filterForm);
  return {
    search: data.get("search").trim(),
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

// Параметры фильтра -> строка запроса /api/components?category=gpu&min_price=...
function buildQuery(filters) {
  const params = new URLSearchParams();
  filters.categories.forEach((category) => params.append("category", category));
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.search) params.set("q", filters.search);
  if (filters.priceMin !== null) params.set("min_price", filters.priceMin);
  if (filters.priceMax !== null) params.set("max_price", filters.priceMax);
  params.set("sort", sortSelect.value);
  return params.toString();
}

let lastRequest = 0;

async function loadCatalog() {
  const filters = readFilters();
  if (!validatePrice(filters)) {
    return;
  }
  const requestNumber = ++lastRequest;
  list.setAttribute("aria-busy", "true");
  foundCount.textContent = "…";
  try {
    const components = await apiRequest(`/api/components?${buildQuery(filters)}`);
    if (requestNumber !== lastRequest) return; // пришёл ответ на устаревший запрос
    foundCount.textContent = components.length;
    if (components.length === 0) {
      list.innerHTML = '<p class="catalog-empty">Ничего не найдено. Измените условия фильтра.</p>';
    } else {
      list.replaceChildren(...components.map(createCard));
    }
  } catch (error) {
    foundCount.textContent = "0";
    list.innerHTML = "";
    const message = document.createElement("p");
    message.className = "catalog-empty status-error";
    message.textContent = `Не удалось загрузить каталог: ${error.message}`;
    list.append(message);
  } finally {
    list.removeAttribute("aria-busy");
  }
}

let searchTimer = null;

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadCatalog();
});
filterForm.addEventListener("change", (event) => {
  if (event.target.name !== "search") loadCatalog();
});
// Поиск по мере ввода, но не чаще одного запроса за 300 мс
filterForm.addEventListener("input", (event) => {
  if (event.target.name === "search") {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(loadCatalog, 300);
  }
});
filterForm.addEventListener("reset", () => {
  setTimeout(loadCatalog); // поля очищаются после события reset
});
sortSelect.addEventListener("change", loadCatalog);

const presetCategory = new URLSearchParams(location.search).get("category");
if (presetCategory) {
  const checkbox = filterForm.querySelector(`input[name="category"][value="${CSS.escape(presetCategory)}"]`);
  if (checkbox) checkbox.checked = true;
}
loadCatalog();
