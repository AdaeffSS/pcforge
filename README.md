# PCForge — подбор комплектующих для компьютера

Учебный проект по дисциплине «Введение в интернет-технологии», БГТУ «ВОЕНМЕХ» им. Д.Ф. Устинова.
Автор: Адаев Степан Сергеевич, группа Н251Б.

**Вариант 1 — подбор комплектующих для компьютера.** Особенность: сборка конфигурации
из нескольких частей и подсчёт итоговой стоимости.

- Тестовая учётная запись: `demo@pcforge.ru` / `Demo2026pc`

## Возможности
- каталог из 30 комплектующих (8 категорий) с фильтрами по категории, бренду, цене, поиском и сортировкой;
- страница товара с характеристиками и ценой в долларах и евро по курсу ЦБ РФ;
- «Моя сборка»: по одному слоту на категорию, итоговая стоимость, расчётное потребление и проверка
  совместимости (сокет, тип памяти, форм-фактор, длина видеокарты, мощность БП и кулера);
- регистрация, вход, личный кабинет с сохранёнными сборками;
- форма обратной связи (сообщения сохраняются в базе);
- адаптивная вёрстка (от 360 px), тёмная тема.

## Технологии
HTML, CSS (Grid, Flexbox), JavaScript без фреймворков · Python 3.12, FastAPI, Uvicorn · SQLite ·
bcrypt · внешний API: https://www.cbr-xml-daily.ru

## Как запустить

### Локальный запуск
Нужен Python 3.12+.
```bash
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload
```
Сайт: http://localhost:8000, документация API: http://localhost:8000/docs.

### Переменные окружения
| Переменная | По умолчанию | Назначение |
|---|---|---|
| `DATABASE_PATH` | `data/pcforge.db` | путь к файлу SQLite |
| `SESSION_DAYS` | `7` | срок действия входа, дней |
| `COOKIE_SECURE` | `false` | cookie входа только по HTTPS (на сервере — `true`) |

## Структура проекта
```
backend/app/      сервер: main.py (обработчики), database.py, security.py,
                  schemas.py, schema.sql, seed_data.py, config.py
backend/requirements.txt
frontend/         страницы, css/style.css, js/*.js, img/*.svg
docs/             техническое задание, набросок макета, схема БД
```

## База данных
Схема — `docs/db-schema.png`, SQL — `backend/app/schema.sql`.

| Таблица | Поля | Связи |
|---|---|---|
| `users` | id INTEGER PK, name TEXT, email TEXT UNIQUE, password_hash TEXT, created_at TEXT | — |
| `sessions` | token TEXT PK, user_id INTEGER, expires_at TEXT | user_id → users.id |
| `categories` | id INTEGER PK, slug TEXT UNIQUE, name TEXT, position INTEGER | — |
| `components` | id INTEGER PK, category_id INTEGER, name, brand TEXT, price INTEGER, description TEXT, specs TEXT (JSON), socket, ram_type, form_factor TEXT, power, gpu_length INTEGER | category_id → categories.id |
| `builds` | id INTEGER PK, user_id INTEGER, title TEXT, total_price INTEGER, created_at TEXT | user_id → users.id |
| `build_items` | build_id INTEGER, component_id INTEGER (составной PK) | → builds.id, → components.id |
| `feedback` | id INTEGER PK, name, email, phone, topic, message, created_at TEXT | — |

Пароли хранятся только в виде хеша bcrypt. Все SQL-запросы параметризованные.

## API
| Метод | Адрес | Описание |
|---|---|---|
| GET | `/api/categories` | категории |
| GET | `/api/components` | список с фильтрами `category`, `brand`, `q`, `min_price`, `max_price`, `sort` |
| GET | `/api/components/{id}` | одно комплектующее (404, если нет) |
| POST | `/api/auth/register` | регистрация |
| POST | `/api/auth/login` | вход (cookie сессии) |
| POST | `/api/auth/logout` | выход |
| GET | `/api/auth/me` | текущий пользователь (401 без входа) |
| GET / POST | `/api/builds` | мои сборки / сохранить сборку |
| DELETE | `/api/builds/{id}` | удалить свою сборку |
| POST | `/api/feedback` | сообщение обратной связи |

Полная документация — `/docs`.

## Что сделано
- [x] **ПР 1** — 5 обязательных страниц + «О проекте» и 404, семантическая разметка, общий `style.css`, Grid/Flexbox, адаптивность от 360 px, свой логотип.
- [x] **ПР 2** — проверка двух форм с сообщениями у полей, фильтр и сортировка каталога, сборка без перезагрузки, курсы валют ЦБ РФ через `fetch` с индикатором загрузки и обработкой ошибок сети.
- [x] **ПР 3** — FastAPI + SQLite (7 таблиц, 30 позиций каталога), регистрация и вход, хеширование bcrypt, параметризованные запросы, личный кабинет, страницы получают данные с сервера.
- [ ] **ПР 4** — развёртывание.
