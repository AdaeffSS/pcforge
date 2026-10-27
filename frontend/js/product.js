// Страница товара: данные загружаются с сервера по id из адреса (product.html?id=15).

const productRoot = document.getElementById("product-root");
const crumbName = document.getElementById("crumb-name");

function showProductError(message) {
  productRoot.innerHTML = "";
  const title = document.createElement("h1");
  title.textContent = "Товар не найден";
  const text = document.createElement("p");
  text.className = "status-error";
  text.textContent = message;
  const link = document.createElement("p");
  link.innerHTML = '<a class="btn" href="catalog.html">Вернуться в каталог</a>';
  productRoot.append(title, text, link);
  document.title = "Товар не найден — PCForge";
}

function renderProduct(component) {
  const item = itemFromApi(component);
  productRoot.innerHTML = `
    <article class="product">
      <div class="product-image">
        <img src="img/${component.category}.svg" alt="" width="400" height="300">
      </div>
      <div>
        <p class="card-category"></p>
        <h1></h1>
        <p class="product-description"></p>
        <div class="product-buy">
          <span class="price">${formatRub(component.price)}</span>
          <button class="btn" type="button" data-add-to-build="${component.id}">Добавить в сборку</button>
          <p class="currency-box" id="currency-box"></p>
        </div>
        <h2>Характеристики</h2>
        <table class="spec-table"><tbody></tbody></table>
      </div>
    </article>`;

  const article = productRoot.querySelector(".product");
  for (const [key, value] of Object.entries(item)) {
    if (value !== null) article.dataset[key] = value;
  }
  article.querySelector("img").alt = `${component.category_name}: ${component.name}`;
  article.querySelector(".card-category").textContent = `${component.category_name} · ${component.brand}`;
  article.querySelector("h1").textContent = component.name;
  article.querySelector(".product-description").textContent = component.description;

  const tbody = article.querySelector("tbody");
  for (const [name, value] of Object.entries(component.specs)) {
    const row = tbody.insertRow();
    const header = document.createElement("th");
    header.scope = "row";
    header.textContent = name;
    row.append(header);
    row.insertCell().textContent = value;
  }

  crumbName.textContent = component.name;
  document.title = `${component.name} — PCForge`;
  renderCurrency(document.getElementById("currency-box"), component.price);
}

async function loadProduct() {
  const id = Number(new URLSearchParams(location.search).get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    showProductError("В адресе страницы не указан номер товара.");
    return;
  }
  try {
    renderProduct(await apiRequest(`/api/components/${id}`));
  } catch (error) {
    showProductError(error.message);
  }
}

loadProduct();
