# API principal do PixoraMed: o FastAPI serve a API em /api e o site React no resto.
# Os modelos ficam no microsserviço de IA (ia/Dockerfile).

# 1. Build do React (só o dist/ segue para a imagem final)
FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. API com o site já compilado
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RESULTADOS_CSV=/app/data/resultados.csv \
    FRONTEND_DIR=/app/frontend

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/scripts ./scripts
COPY data/resultados.csv ./data/resultados.csv
COPY --from=frontend /frontend/dist ./frontend

# O Render define a variável PORT; localmente usa 8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
