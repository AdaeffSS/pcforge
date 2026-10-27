"""Настройки приложения читаются из переменных окружения."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # корень проекта

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "data" / "pcforge.db"))
FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", BASE_DIR / "frontend"))

# Сколько дней действует вход (сессия)
SESSION_DAYS = int(os.getenv("SESSION_DAYS", "7"))

# На сервере с HTTPS cookie передаётся только по защищённому соединению
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
