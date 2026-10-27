// Страница «Моя сборка»: таблица слотов, итоговая стоимость и проверка совместимости.

const BASE_SYSTEM_POWER = 100; // плата, память, накопители, вентиляторы, Вт

const rowsContainer = document.getElementById("build-rows");
const totalElement = document.getElementById("build-total");
const countElement = document.getElementById("build-count");
const powerElement = document.getElementById("build-power");
const currencyElement = document.getElementById("build-currency");
const checksList = document.getElementById("build-checks");

function createSlotRow(slot, item) {
  const row = document.createElement("tr");
  const header = document.createElement("th");
  header.scope = "row";
  header.textContent = slot.title;
  row.append(header);

  if (!item) {
    const cell = document.createElement("td");
    cell.colSpan = 3;
    cell.className = "empty-slot";
    cell.innerHTML = `не выбрано — <a href="catalog.html?category=${slot.category}">выбрать в каталоге</a>`;
    row.append(cell);
    return row;
  }

  const nameCell = document.createElement("td");
  const link = document.createElement("a");
  link.href = `product.html?id=${item.id}`;
  link.textContent = item.name;
  nameCell.append(link);

  const priceCell = document.createElement("td");
  priceCell.textContent = formatRub(item.price);

  const actionCell = document.createElement("td");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn btn-small btn-danger";
  removeButton.textContent = "Убрать";
  removeButton.setAttribute("aria-label", `Убрать из сборки: ${item.name}`);
  removeButton.addEventListener("click", () => {
    removeFromBuild(slot.category);
    renderBuild();
  });
  actionCell.append(removeButton);

  row.append(nameCell, priceCell, actionCell);
  return row;
}

function estimatePower(build) {
  if (countBuildItems(build) === 0) {
    return 0;
  }
  const cpuPower = build.cpu ? build.cpu.power : 0;
  const gpuPower = build.gpu ? build.gpu.power : 0;
  return cpuPower + gpuPower + BASE_SYSTEM_POWER;
}

// Возвращает список проверок: { level: "ok" | "warn" | "error", text }
function checkCompatibility(build) {
  const checks = [];
  const { cpu, motherboard, ram, gpu, psu, cooler } = build;
  const pcCase = build.case;

  if (cpu && motherboard) {
    checks.push(cpu.socket === motherboard.socket
      ? { level: "ok", text: `Сокет совпадает: ${cpu.socket}` }
      : { level: "error",
          text: `Сокет не совпадает: ${cpu.socket} и ` +
                `${motherboard.socket}` });
  }
  if (ram && motherboard) {
    checks.push(ram.ramType === motherboard.ramType
      ? { level: "ok", text: `Тип памяти: ${ram.ramType}` }
      : { level: "error",
          text: `Плата поддерживает ${motherboard.ramType}, ` +
                `а выбрана память ${ram.ramType}` });
  }
  if (motherboard && pcCase) {
    const fits = pcCase.formFactor === "ATX" || motherboard.formFactor === "mATX";
    checks.push(fits
      ? { level: "ok", text: `Плата ${motherboard.formFactor} помещается в корпус ${pcCase.formFactor}` }
      : { level: "error", text: `Плата ${motherboard.formFactor} не поместится в корпус ${pcCase.formFactor}` });
  }
  if (gpu && pcCase) {
    checks.push(gpu.gpuLength <= pcCase.gpuLength
      ? { level: "ok", text: `Видеокарта ${gpu.gpuLength} мм помещается в корпус (до ${pcCase.gpuLength} мм)` }
      : { level: "error", text: `Видеокарта ${gpu.gpuLength} мм длиннее допустимых ${pcCase.gpuLength} мм` });
  }
  if (psu) {
    const need = estimatePower(build);
    if (psu.power < need) {
      checks.push({ level: "error", text: `Блок питания ${psu.power} Вт слабее потребления ≈ ${need} Вт` });
    } else if (psu.power < need * 1.3) {
      checks.push({ level: "warn", text: `Блок питания ${psu.power} Вт — запас меньше 30 % (нужно ≈ ${need} Вт)` });
    } else {
      checks.push({ level: "ok", text: `Блок питания ${psu.power} Вт при потреблении ≈ ${need} Вт` });
    }
  }
  if (cpu && cooler) {
    checks.push(cooler.power >= cpu.power
      ? { level: "ok", text: `Кулер рассеивает до ${cooler.power} Вт — хватит для процессора` }
      : { level: "warn", text: `Кулер (${cooler.power} Вт) слабее тепловыделения процессора (${cpu.power} Вт)` });
  }

  const missing = BUILD_SLOTS.filter((slot) => !build[slot.category]).map((slot) => slot.title.toLowerCase());
  if (missing.length > 0) {
    checks.push({ level: "warn", text: `Не выбрано: ${missing.join(", ")}` });
  }
  return checks;
}

function renderChecks(checks) {
  checksList.replaceChildren(
    ...checks.map((check) => {
      const li = document.createElement("li");
      li.className = check.level === "ok" ? "" : `is-${check.level}`;
      li.textContent = check.text;
      return li;
    })
  );
}

function renderBuild() {
  const build = loadBuild();
  rowsContainer.replaceChildren(...BUILD_SLOTS.map((slot) => createSlotRow(slot, build[slot.category])));

  const total = Object.values(build).reduce((sum, item) => sum + item.price, 0);
  totalElement.textContent = formatRub(total);
  countElement.textContent = `${countBuildItems(build)} из ${BUILD_SLOTS.length}`;
  powerElement.textContent = `≈ ${estimatePower(build)} Вт`;
  renderChecks(checkCompatibility(build));

  if (total > 0) {
    renderCurrency(currencyElement, total);
  } else {
    currencyElement.className = "";
    currencyElement.textContent = "—";
  }
  updateBuildCounter();
}

document.getElementById("clear-build").addEventListener("click", () => {
  clearBuild();
  renderBuild();
});

renderBuild();

// ---------- Сохранение сборки в личном кабинете ----------

const saveForm = document.getElementById("save-build-form");
const saveResult = document.getElementById("save-build-result");
const saveRules = { title: requiredText("Название сборки", 2) };

saveForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveResult.hidden = true;
  const build = loadBuild();
  if (countBuildItems(build) === 0) {
    saveResult.className = "form-result is-error";
    saveResult.textContent = "Сборка пуста — добавьте комплектующие из каталога.";
    saveResult.hidden = false;
    return;
  }
  if (!validateForm(saveForm, saveRules)) {
    return;
  }
  try {
    const saved = await apiRequest("/api/builds", {
      method: "POST",
      body: {
        title: saveForm.elements.title.value.trim(),
        component_ids: Object.values(build).map((item) => item.id),
      },
    });
    saveResult.className = "form-result";
    saveResult.innerHTML = `Сборка «<span></span>» сохранена. <a href="account.html">Открыть кабинет</a>`;
    saveResult.querySelector("span").textContent = saved.title;
    saveForm.reset();
  } catch (error) {
    saveResult.className = "form-result is-error";
    if (error.status === 401) {
      saveResult.innerHTML = 'Чтобы сохранить сборку, <a href="account.html">войдите или зарегистрируйтесь</a>.';
    } else {
      saveResult.textContent = error.message;
    }
  }
  saveResult.hidden = false;
});
