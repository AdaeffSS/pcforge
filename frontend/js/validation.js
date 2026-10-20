// Проверка полей форм. Сообщение об ошибке выводится в <span class="field-error">
// внутри того же блока .form-field, что и поле.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+7\d{10}$/;

function showFieldError(input, message) {
  const field = input.closest(".form-field");
  field.classList.add("has-error");
  field.querySelector(".field-error").textContent = message;
  input.setAttribute("aria-invalid", "true");
}

function clearFieldError(input) {
  const field = input.closest(".form-field");
  field.classList.remove("has-error");
  field.querySelector(".field-error").textContent = "";
  input.removeAttribute("aria-invalid");
}

// rules — объект { имяПоля: функция(значение) => текст ошибки или "" }
function validateForm(form, rules) {
  let firstInvalid = null;
  for (const [name, check] of Object.entries(rules)) {
    const input = form.elements[name];
    const message = check(input.value.trim());
    if (message) {
      showFieldError(input, message);
      firstInvalid = firstInvalid || input;
    } else {
      clearFieldError(input);
    }
  }
  if (firstInvalid) {
    firstInvalid.focus();
  }
  return firstInvalid === null;
}

// Повторная проверка поля сразу после исправления
function enableLiveValidation(form, rules) {
  form.addEventListener("input", (event) => {
    const check = rules[event.target.name];
    if (check && event.target.closest(".has-error")) {
      const message = check(event.target.value.trim());
      if (message) {
        showFieldError(event.target, message);
      } else {
        clearFieldError(event.target);
      }
    }
  });
}

// Готовые правила
function requiredText(label, minLength) {
  return (value) => {
    if (!value) {
      return `Заполните поле «${label}»`;
    }
    if (value.length < minLength) {
      return `Минимум ${minLength} символа`;
    }
    return "";
  };
}

function emailRule(value) {
  if (!value) {
    return "Укажите электронную почту";
  }
  return EMAIL_PATTERN.test(value) ? "" : "Адрес должен быть вида name@example.ru";
}

function optionalPhoneRule(value) {
  const digits = value.replace(/[\s()-]/g, "");
  if (!digits) {
    return "";
  }
  return PHONE_PATTERN.test(digits) ? "" : "Телефон в формате +7XXXXXXXXXX (10 цифр после +7)";
}
