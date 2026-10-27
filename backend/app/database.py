"""Подключение к SQLite, создание таблиц и начальное наполнение.

Все запросы параметризованные: значения передаются через «?» отдельно от текста SQL.
"""
import json
import sqlite3
from pathlib import Path

from .config import DATABASE_PATH
from .seed_data import CATEGORIES, COMPONENTS

SCHEMA_PATH = Path(__file__).with_name("schema.sql")


def get_connection() -> sqlite3.Connection:
    # FastAPI может выполнить зависимость и обработчик в разных потоках,
    # поэтому разрешаем использовать соединение вне потока, где оно создано
    # (каждый запрос всё равно получает своё отдельное соединение).
    connection = sqlite3.connect(DATABASE_PATH, check_same_thread=False)
    connection.row_factory = sqlite3.Row  # строки как словари: row["name"]
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def get_db():
    """Зависимость FastAPI: одно соединение на запрос, закрывается после ответа."""
    connection = get_connection()
    try:
        yield connection
    finally:
        connection.close()


def init_db() -> None:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_connection() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        has_data = connection.execute("SELECT COUNT(*) FROM components").fetchone()[0]
        if not has_data:
            seed(connection)


def seed(connection: sqlite3.Connection) -> None:
    connection.executemany(
        "INSERT INTO categories (slug, name, position) VALUES (?, ?, ?)",
        CATEGORIES,
    )
    category_ids = {
        row["slug"]: row["id"]
        for row in connection.execute("SELECT id, slug FROM categories")
    }
    connection.executemany(
        """INSERT INTO components
               (category_id, name, brand, price, description, specs,
                socket, ram_type, form_factor, power, gpu_length)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        [
            (
                category_ids[item["category"]],
                item["name"],
                item["brand"],
                item["price"],
                item["description"],
                json.dumps(item["specs"], ensure_ascii=False),
                item.get("socket"),
                item.get("ram_type"),
                item.get("form_factor"),
                item.get("power"),
                item.get("gpu_length"),
            )
            for item in COMPONENTS
        ],
    )
