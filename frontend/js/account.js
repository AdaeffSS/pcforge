// Личный кабинет: вход, регистрация, профиль и сохранённые сборки.

const authBlock = document.getElementById("auth-block");
const profileBlock = document.getElementById("profile-block");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const myBuilds = document.getElementById("my-builds");

const loginRules = {
  email: emailRule,
  password: (value) => (value ? "" : "Введите пароль"),
};

const registerRules = {
  name: requiredText("Имя", 2),
  email: emailRule,
  password: (value) => {
    if (value.length < 8) return "Пароль должен быть не короче 8 символов";
    if (!/\d/.test(value) || !/\p{L}/u.test(value)) return "Пароль должен содержать буквы и цифры";
    return "";
  },
};

enableLiveValidation(loginForm, loginRules);
enableLiveValidation(registerForm, registerRules);

function showFormMessage(element, message) {
  element.textContent = message;
  element.hidden = false;
}

function formatDate(value) {
  // SQLite хранит время в UTC в виде "2026-11-01 12:00:00"
  return new Date(value.replace(" ", "T") + "Z").toLocaleString("ru-RU", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function createBuildItem(build) {
  const li = document.createElement("li");
  li.innerHTML = `
    <div class="build-head">
      <h3></h3>
      <span class="price">${formatRub(build.total_price)}</span>
    </div>
    <p class="field-hint"></p>
    <ul></ul>
    <button class="btn btn-small btn-danger" type="button">Удалить</button>`;
  li.querySelector("h3").textContent = build.title;
  li.querySelector(".field-hint").textContent = `Сохранена ${formatDate(build.created_at)}`;
  li.querySelector("ul").replaceChildren(
    ...build.items.map((item) => {
      const row = document.createElement("li");
      row.textContent = `${item.category_name}: ${item.name} — ${formatRub(item.price)}`;
      return row;
    })
  );
  li.querySelector("button").addEventListener("click", async () => {
    try {
      await apiRequest(`/api/builds/${build.id}`, { method: "DELETE" });
      li.remove();
      if (!myBuilds.children.length) renderBuilds([]);
    } catch (error) {
      alertBuildsError(error.message);
    }
  });
  return li;
}

function alertBuildsError(message) {
  const li = document.createElement("li");
  li.className = "status-error";
  li.textContent = message;
  myBuilds.prepend(li);
}

function renderBuilds(builds) {
  if (builds.length === 0) {
    myBuilds.innerHTML = '<li>Сохранённых сборок пока нет. Соберите компьютер на странице <a href="build.html">«Моя сборка»</a> и нажмите «Сохранить в кабинете».</li>';
    return;
  }
  myBuilds.replaceChildren(...builds.map(createBuildItem));
}

async function showProfile(user) {
  authBlock.hidden = true;
  profileBlock.hidden = false;
  document.getElementById("profile-name").textContent = user.name;
  document.getElementById("profile-email").textContent = user.email;
  document.getElementById("profile-created").textContent = formatDate(user.created_at);

  myBuilds.innerHTML = '<li class="status-loading">Загружаем сборки…</li>';
  try {
    renderBuilds(await apiRequest("/api/builds"));
  } catch (error) {
    myBuilds.innerHTML = "";
    alertBuildsError(error.message);
  }
}

function showAuthForms() {
  authBlock.hidden = false;
  profileBlock.hidden = true;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = document.getElementById("login-result");
  result.hidden = true;
  if (!validateForm(loginForm, loginRules)) return;
  try {
    const user = await apiRequest("/api/auth/login", {
      method: "POST",
      body: { email: loginForm.elements.email.value.trim(), password: loginForm.elements.password.value },
    });
    loginForm.reset();
    showProfile(user);
  } catch (error) {
    showFormMessage(result, error.message);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const result = document.getElementById("register-result");
  result.hidden = true;
  if (!validateForm(registerForm, registerRules)) return;
  try {
    const user = await apiRequest("/api/auth/register", {
      method: "POST",
      body: {
        name: registerForm.elements.name.value.trim(),
        email: registerForm.elements.email.value.trim(),
        password: registerForm.elements.password.value,
      },
    });
    registerForm.reset();
    showProfile(user);
  } catch (error) {
    showFormMessage(result, error.message);
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await apiRequest("/api/auth/logout", { method: "POST" }).catch(() => null);
  showAuthForms();
});

// При открытии страницы узнаём, выполнен ли вход
apiRequest("/api/auth/me").then(showProfile).catch(showAuthForms);
