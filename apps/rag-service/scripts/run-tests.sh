#!/usr/bin/env sh
# Roda os testes unitários do rag-service da forma disponível no ambiente:
#   1) .venv local (dev que instalou as deps de ML), ou
#   2) a imagem Docker do serviço (o jeito padrão — deps pesadas ficam no container),
#   3) senão, avisa e não bloqueia (o CI é o gate).
# Env limpo: o conftest.py define os secrets de teste (setdefault).
set -e
cd "$(dirname "$0")/.." # apps/rag-service

if [ -x ".venv/bin/pytest" ]; then
  exec .venv/bin/pytest -m "not integration" "$@"
fi

IMAGE="my-little-pony-rag-api:latest"
if command -v docker >/dev/null 2>&1 && docker image inspect "$IMAGE" >/dev/null 2>&1; then
  exec docker run --rm \
    -v "$(pwd)/rag_service:/app/rag_service:ro" \
    -v "$(pwd)/tests:/app/tests:ro" \
    -v "$(pwd)/pyproject.toml:/app/pyproject.toml:ro" \
    -w /app "$IMAGE" python -m pytest -m "not integration" "$@"
fi

echo "⚠ rag-service: sem .venv e sem a imagem Docker '$IMAGE' — testes Python pulados localmente."
echo "  Rode 'docker compose --profile rag build rag-api' para habilitá-los, ou confie no CI."
exit 0
