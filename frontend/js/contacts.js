// Форма обратной связи: проверка данных перед отправкой.

const feedbackForm = document.getElementById("feedback-form");
const feedbackResult = document.getElementById("feedback-result");

const feedbackRules = {
  name: requiredText("Имя", 2),
  email: emailRule,
  phone: optionalPhoneRule,
  topic: (value) => (value ? "" : "Выберите тему обращения"),
  message: requiredText("Сообщение", 10),
};

enableLiveValidation(feedbackForm, feedbackRules);

feedbackForm.addEventListener("submit", (event) => {
  event.preventDefault();
  feedbackResult.hidden = true;
  if (!validateForm(feedbackForm, feedbackRules)) {
    return;
  }
  const name = feedbackForm.elements.name.value.trim();
  feedbackResult.className = "form-result";
  feedbackResult.textContent = `${name}, спасибо! Данные заполнены верно. Отправка на сервер появится в следующей версии сайта.`;
  feedbackResult.hidden = false;
  feedbackForm.reset();
});
