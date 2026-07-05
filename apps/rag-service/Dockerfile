# Imagem do serviço Python (worker e API compartilham a mesma imagem).
# CPU por padrão. Para GPU no WSL, ver o README (base CUDA + torch cu121 + RAG_DEVICE=cuda).
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY pyproject.toml .
COPY rag_service ./rag_service

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# O comando (worker ou api) é definido por serviço no docker-compose.
