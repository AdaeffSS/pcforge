// Запросы к серверу PCForge. Все адреса относительные: сайт и API на одном домене.

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function apiRequest(path, options = {}) {
  const settings = { credentials: "same-origin", headers: {}, ...options };
  if (options.body !== undefined) {
    settings.headers["Content-Type"] = "application/json";
    settings.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(path, settings);
  } catch (error) {
    throw new ApiError("Нет связи с сервером. Проверьте подключение к интернету.", 0);
  }

  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.detail || `Ошибка сервера (${response.status})`, response.status);
  }
  return data;
}

// Ответ сервера (snake_case) -> объект для сборки (как в build-store.js)
function itemFromApi(component) {
  return {
    id: component.id,
    name: component.name,
    category: component.category,
    price: component.price,
    socket: component.socket,
    ramType: component.ram_type,
    formFactor: component.form_factor,
    power: component.power,
    gpuLength: component.gpu_length,
  };
}
