# Образ приложения PCForge: FastAPI + статические страницы
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DATABASE_PATH=/app/data/pcforge.db

WORKDIR /app

# Сначала зависимости — этот слой кэшируется и не пересобирается при правке кода
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend backend
COPY frontend frontend

# Приложение работает не от root; база хранится в томе /app/data
RUN useradd --create-home pcforge \
    && mkdir -p /app/data && chown pcforge /app/data
USER pcforge

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--proxy-headers", "--forwarded-allow-ips", "*"]
