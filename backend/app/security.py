"""Пароли и сессии пользователей."""
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone

import bcrypt
from fastapi import Cookie, Depends, HTTPException, status

from .config import SESSION_DAYS
from .database import get_db

SESSION_COOKIE = "pcforge_session"


def hash_password(password: str) -> str:
    # bcrypt добавляет случайную «соль» и хранит её в хеше
    return bcrypt.hashpw(password.encode("utf-8"),
                         bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:  # ограничение алгоритма bcrypt
        return False
    return bcrypt.checkpw(password_bytes,
                          password_hash.encode("utf-8"))


def create_session(db: sqlite3.Connection, user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    db.execute(
        "INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)",
        (token, user_id, expires_at.isoformat()),
    )
    db.commit()
    return token


def delete_session(db: sqlite3.Connection, token: str) -> None:
    db.execute("DELETE FROM sessions WHERE token = ?", (token,))
    db.commit()


def get_current_user(
    pcforge_session: str | None = Cookie(default=None),
    db: sqlite3.Connection = Depends(get_db),
) -> sqlite3.Row:
    """Зависимость для обработчиков, доступных только после входа."""
    if pcforge_session:
        user = db.execute(
            """SELECT users.id, users.name, users.email, users.created_at
               FROM sessions JOIN users ON users.id = sessions.user_id
               WHERE sessions.token = ? AND sessions.expires_at > ?""",
            (pcforge_session, datetime.now(timezone.utc).isoformat()),
        ).fetchone()
        if user:
            return user
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Требуется вход в аккаунт")
