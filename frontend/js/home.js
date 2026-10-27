// Главная страница: подборка популярных позиций загружается с сервера.

const POPULAR_IDS = [1, 15, 10, 18, 22, 25];
const popularList = document.getElementById("popular-list");

async function loadPopular() {
  try {
    const components = await apiRequest("/api/components");
    const popular = POPULAR_IDS.map((id) => components.find((item) => item.id === id)).filter(Boolean);
    popularList.replaceChildren(...popular.map(createCard));
    document.getElementById("catalog-size").textContent = components.length;
  } catch (error) {
    popularList.innerHTML = "";
    const message = document.createElement("p");
    message.className = "catalog-empty status-error";
    message.textContent = `Не удалось загрузить подборку: ${error.message}`;
    popularList.append(message);
  }
}

loadPopular();
