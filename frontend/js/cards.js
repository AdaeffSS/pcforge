// Карточка товара для каталога и главной страницы (данные приходят с сервера).

const CATEGORY_IMAGES_ALT = {
  cpu: "Иллюстрация процессора",
  motherboard: "Иллюстрация материнской платы",
  ram: "Иллюстрация двух модулей оперативной памяти",
  gpu: "Иллюстрация видеокарты с двумя вентиляторами",
  storage: "Иллюстрация SSD-накопителя M.2",
  psu: "Иллюстрация блока питания",
  case: "Иллюстрация компьютерного корпуса",
  cooler: "Иллюстрация башенного кулера",
};

function createCard(component) {
  const card = document.createElement("article");
  card.className = "card";
  const specs = Object.values(component.specs).slice(0, 3).join(" · ");
  card.innerHTML = `
    <img src="img/${component.category}.svg" alt="${CATEGORY_IMAGES_ALT[component.category]}" width="400" height="300" loading="lazy">
    <div class="card-body">
      <span class="card-category"></span>
      <h3><a href="product.html?id=${component.id}"></a></h3>
      <p class="card-specs"></p>
      <div class="card-footer">
        <span class="price">${formatRub(component.price)}</span>
        <button class="btn btn-small" type="button" data-add-to-build="${component.id}">В сборку</button>
      </div>
    </div>`;
  // Текст с сервера вставляем через textContent, чтобы он не превратился в HTML
  card.querySelector(".card-category").textContent = component.category_name;
  card.querySelector("h3 a").textContent = component.name;
  card.querySelector(".card-specs").textContent = specs;

  const item = itemFromApi(component);
  card.dataset.id = item.id;
  card.dataset.name = item.name;
  card.dataset.category = item.category;
  card.dataset.price = item.price;
  for (const key of ["socket", "ramType", "formFactor", "power", "gpuLength"]) {
    if (item[key] !== null) card.dataset[key] = item[key];
  }
  return card;
}
