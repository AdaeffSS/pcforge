"""PCForge — серверная часть (FastAPI + SQLite)."""
import json
import sqlite3
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import COOKIE_SECURE, FRONTEND_DIR, SESSION_DAYS
from .database import get_db, init_db
from .schemas import (BuildIn, BuildOut, CategoryOut, ComponentOut, FeedbackIn,
                      LoginIn, RegisterIn, UserOut)
from .security import (SESSION_COOKIE, create_session, delete_session,
                       get_current_user, hash_password, verify_password)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # создаём таблицы и наполняем базу при первом запуске
    yield


app = FastAPI(
    title="PCForge API",
    description="Подбор комплектующих и сборка компьютера. Вариант 1.",
    version="1.0.0",
    lifespan=lifespan,
)


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    fields = [str(error["loc"][-1]) for error in exc.errors()]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        content={"detail": "Некорректные данные в запросе", "fields": fields},
    )


# ---------- Каталог ----------

COMPONENT_SELECT = """
    SELECT components.*, categories.slug AS category, categories.name AS category_name
    FROM components JOIN categories ON categories.id = components.category_id
"""

SORT_ORDERS = {
    "default": "categories.position, components.price",
    "price-asc": "components.price",
    "price-desc": "components.price DESC",
    "name": "components.name",
}


def component_from_row(row: sqlite3.Row) -> ComponentOut:
    data = dict(row)
    data["specs"] = json.loads(data["specs"])
    return ComponentOut(**data)


@app.get("/api/categories", response_model=list[CategoryOut], tags=["Каталог"], summary="Список категорий")
def list_categories(db: sqlite3.Connection = Depends(get_db)):
    rows = db.execute("SELECT slug, name FROM categories ORDER BY position").fetchall()
    return [dict(row) for row in rows]


@app.get("/api/components", response_model=list[ComponentOut], tags=["Каталог"], summary="Список комплектующих с фильтрами")
def list_components(
    category: list[str] = Query(default=[]),
    brand: str | None = None,
    q: str | None = Query(default=None, max_length=50),
    min_price: int | None = Query(default=None, ge=0),
    max_price: int | None = Query(default=None, ge=0),
    sort: Literal["default", "price-asc", "price-desc", "name"] = "default",
    db: sqlite3.Connection = Depends(get_db),
):
    """Список комплектующих с фильтрами. Условия добавляются в запрос
    готовыми фрагментами, а значения передаются отдельно в params."""
    if min_price is not None and max_price is not None and min_price > max_price:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Минимальная цена больше максимальной")

    conditions, params = [], []
    if category:
        marks = ", ".join("?" for _ in category)
        conditions.append(f"categories.slug IN ({marks})")
        params.extend(category)
    if brand:
        conditions.append("components.brand = ?")
        params.append(brand)
    if q:
        conditions.append("components.name LIKE ?")
        params.append(f"%{q}%")
    if min_price is not None:
        conditions.append("components.price >= ?")
        params.append(min_price)
    if max_price is not None:
        conditions.append("components.price <= ?")
        params.append(max_price)

    sql = COMPONENT_SELECT
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    sql += " ORDER BY " + SORT_ORDERS[sort]  # только из словаря
    rows = db.execute(sql, params)
    return [component_from_row(row) for row in rows]


@app.get("/api/components/{component_id}", response_model=ComponentOut, tags=["Каталог"], summary="Одно комплектующее по id")
def get_component(component_id: int, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute(COMPONENT_SELECT + " WHERE components.id = ?", (component_id,)).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Комплектующее не найдено")
    return component_from_row(row)


# ---------- Учётные записи ----------

@app.post("/api/auth/register", response_model=UserOut, status_code=201, tags=["Пользователи"], summary="Регистрация")
def register(data: RegisterIn, response: Response, db: sqlite3.Connection = Depends(get_db)):
    email = data.email.lower()
    exists = db.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone()
    if exists:
        raise HTTPException(status.HTTP_409_CONFLICT, "Пользователь с такой почтой уже зарегистрирован")

    cursor = db.execute(
        "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
        (data.name.strip(), email, hash_password(data.password)),
    )
    db.commit()
    set_session_cookie(response, create_session(db, cursor.lastrowid))
    user = db.execute("SELECT id, name, email, created_at FROM users WHERE id = ?",
                      (cursor.lastrowid,)).fetchone()
    return dict(user)


@app.post("/api/auth/login", response_model=UserOut, tags=["Пользователи"], summary="Вход")
def login(data: LoginIn, response: Response, db: sqlite3.Connection = Depends(get_db)):
    user = db.execute(
        "SELECT id, name, email, created_at, password_hash FROM users WHERE email = ?",
        (data.email.lower(),),
    ).fetchone()
    if user is None or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Неверная почта или пароль")

    set_session_cookie(response, create_session(db, user["id"]))
    return {key: user[key] for key in ("id", "name", "email", "created_at")}


@app.post("/api/auth/logout", status_code=204, tags=["Пользователи"], summary="Выход")
def logout(
    response: Response,
    pcforge_session: str | None = Cookie(default=None),
    db: sqlite3.Connection = Depends(get_db),
):
    if pcforge_session:
        delete_session(db, pcforge_session)
    response.delete_cookie(SESSION_COOKIE)


@app.get("/api/auth/me", response_model=UserOut, tags=["Пользователи"], summary="Текущий пользователь")
def me(user: sqlite3.Row = Depends(get_current_user)):
    return dict(user)


def set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,       # недоступна из JavaScript
        samesite="lax",
        secure=COOKIE_SECURE,
    )


# ---------- Сборки пользователя ----------

def load_build(db: sqlite3.Connection, build: sqlite3.Row) -> BuildOut:
    items = db.execute(
        """SELECT components.id, categories.name AS category_name, components.name, components.price
           FROM build_items
           JOIN components ON components.id = build_items.component_id
           JOIN categories ON categories.id = components.category_id
           WHERE build_items.build_id = ?
           ORDER BY categories.position""",
        (build["id"],),
    ).fetchall()
    return BuildOut(**dict(build), items=[dict(item) for item in items])


@app.get("/api/builds", response_model=list[BuildOut], tags=["Сборки"], summary="Мои сборки")
def list_my_builds(user: sqlite3.Row = Depends(get_current_user), db: sqlite3.Connection = Depends(get_db)):
    builds = db.execute(
        "SELECT id, title, total_price, created_at FROM builds WHERE user_id = ? ORDER BY id DESC",
        (user["id"],),
    ).fetchall()
    return [load_build(db, build) for build in builds]


@app.post("/api/builds", response_model=BuildOut, status_code=201, tags=["Сборки"], summary="Сохранить сборку")
def create_build(
    data: BuildIn,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    ids = list(dict.fromkeys(data.component_ids))  # без повторов
    placeholders = ", ".join("?" for _ in ids)
    rows = db.execute(
        f"SELECT id, price, category_id FROM components WHERE id IN ({placeholders})", ids
    ).fetchall()
    if len(rows) != len(ids):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "В сборке есть несуществующие комплектующие")
    if len({row["category_id"] for row in rows}) != len(rows):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "В сборке может быть только одна позиция каждой категории")

    total = sum(row["price"] for row in rows)  # сумму считает сервер, а не браузер
    cursor = db.execute(
        "INSERT INTO builds (user_id, title, total_price) VALUES (?, ?, ?)",
        (user["id"], data.title.strip(), total),
    )
    db.executemany(
        "INSERT INTO build_items (build_id, component_id) VALUES (?, ?)",
        [(cursor.lastrowid, component_id) for component_id in ids],
    )
    db.commit()
    build = db.execute("SELECT id, title, total_price, created_at FROM builds WHERE id = ?",
                       (cursor.lastrowid,)).fetchone()
    return load_build(db, build)


@app.delete("/api/builds/{build_id}", status_code=204, tags=["Сборки"], summary="Удалить свою сборку")
def delete_build(
    build_id: int,
    user: sqlite3.Row = Depends(get_current_user),
    db: sqlite3.Connection = Depends(get_db),
):
    # условие user_id = ? не даёт удалить чужую сборку
    cursor = db.execute("DELETE FROM builds WHERE id = ? AND user_id = ?", (build_id, user["id"]))
    db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Сборка не найдена")


# ---------- Обратная связь ----------

@app.post("/api/feedback", status_code=201, tags=["Обратная связь"], summary="Отправить сообщение")
def send_feedback(data: FeedbackIn, db: sqlite3.Connection = Depends(get_db)):
    db.execute(
        "INSERT INTO feedback (name, email, phone, topic, message) VALUES (?, ?, ?, ?, ?)",
        (data.name.strip(), data.email.lower(), data.phone or None, data.topic, data.message.strip()),
    )
    db.commit()
    return {"detail": "Сообщение получено"}


# ---------- Страницы сайта ----------

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    if request.url.path.startswith("/api/"):
        detail = getattr(exc, "detail", "Не найдено")
        return JSONResponse(status_code=404, content={"detail": detail})
    return FileResponse(FRONTEND_DIR / "404.html", status_code=404)


# Статические файлы (HTML, CSS, JS, изображения) отдаются из папки frontend
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
