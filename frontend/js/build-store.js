// Хранилище сборки пользователя в localStorage.
// Сборка — объект вида { cpu: {...}, gpu: {...} }: по одной позиции на категорию.

const BUILD_STORAGE_KEY = "pcforge-build";

const BUILD_SLOTS = [
  { category: "cpu", title: "Процессор" },
  { category: "motherboard", title: "Материнская плата" },
  { category: "ram", title: "Оперативная память" },
  { category: "gpu", title: "Видеокарта" },
  { category: "storage", title: "Накопитель" },
  { category: "psu", title: "Блок питания" },
  { category: "case", title: "Корпус" },
  { category: "cooler", title: "Охлаждение" },
];

function loadBuild() {
  try {
    return JSON.parse(localStorage.getItem(BUILD_STORAGE_KEY)) || {};
  } catch (error) {
    return {};
  }
}

function saveBuild(build) {
  localStorage.setItem(BUILD_STORAGE_KEY, JSON.stringify(build));
}

// Добавляет позицию в сборку. Возвращает позицию, которую она заменила (или null).
function addToBuild(item) {
  const build = loadBuild();
  const replaced = build[item.category] || null;
  build[item.category] = item;
  saveBuild(build);
  return replaced;
}

function removeFromBuild(category) {
  const build = loadBuild();
  delete build[category];
  saveBuild(build);
}

function clearBuild() {
  saveBuild({});
}

function countBuildItems(build) {
  return Object.keys(build).length;
}

// Читает данные о товаре из data-атрибутов карточки
function itemFromDataset(dataset) {
  return {
    id: Number(dataset.id),
    name: dataset.name,
    category: dataset.category,
    price: Number(dataset.price),
    socket: dataset.socket || null,
    ramType: dataset.ramType || null,
    formFactor: dataset.formFactor || null,
    power: dataset.power ? Number(dataset.power) : null,
    gpuLength: dataset.gpuLength ? Number(dataset.gpuLength) : null,
  };
}

function formatRub(value) {
  return value.toLocaleString("ru-RU") + " ₽";
}
