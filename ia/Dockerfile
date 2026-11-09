# Microsserviço de IA: carrega os modelos ONNX e devolve probabilidades. Build com o contexto na raiz do repositório.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    MODELS_DIR=/app/models

WORKDIR /app

COPY ia/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ia/app ./app
COPY models ./models

# O Render define a variável PORT; localmente usa 8001
EXPOSE 8001
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
