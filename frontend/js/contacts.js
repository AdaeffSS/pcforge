// Форма обратной связи: проверка данных и отправка на сервер.

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

feedbackForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  feedbackResult.hidden = true;
  if (!validateForm(feedbackForm, feedbackRules)) {
    return;
  }
  const fields = feedbackForm.elements;
  const submitButton = feedbackForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  try {
    await apiRequest("/api/feedback", {
      method: "POST",
      body: {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone.value.replace(/[\s()-]/g, "") || null,
        topic: fields.topic.value,
        message: fields.message.value.trim(),
      },
    });
    feedbackResult.className = "form-result";
    feedbackResult.textContent = `${fields.name.value.trim()}, спасибо! Сообщение отправлено, мы ответим на почту.`;
    feedbackForm.reset();
  } catch (error) {
    feedbackResult.className = "form-result is-error";
    feedbackResult.textContent = `Сообщение не отправлено: ${error.message}`;
  } finally {
    submitButton.disabled = false;
    feedbackResult.hidden = false;
  }
});
