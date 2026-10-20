// Общий код для всех страниц: счётчик сборки в меню и кнопки «В сборку».

function updateBuildCounter() {
  const count = countBuildItems(loadBuild());
  document.querySelectorAll("[data-build-counter]").forEach((counter) => {
    counter.textContent = count;
  });
}

function handleAddToBuild(button) {
  const holder = button.closest("[data-id]");
  if (!holder) {
    return;
  }
  const item = itemFromDataset(holder.dataset);
  const replaced = addToBuild(item);
  updateBuildCounter();

  button.textContent = replaced && replaced.id !== item.id ? "Заменено ✓" : "В сборке ✓";
  button.classList.add("btn-outline");
}

// Делегирование событий: один обработчик на весь документ,
// поэтому работают и кнопки в карточках, созданных позже из JavaScript.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add-to-build]");
  if (button) {
    handleAddToBuild(button);
  }
});

updateBuildCounter();
