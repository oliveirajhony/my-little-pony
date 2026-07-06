"""Configuração do serviço, validada no boot (espelha §10 da Spec 1).

Secrets NÃO têm default no código: se faltar `RAG_NEST_SERVICE_TOKEN`, o boot
falha rápido. URLs de infra têm default de dev por conveniência.

Variáveis de ambiente usam o prefixo RAG_ (ex.: RAG_QDRANT_URL).
"""

from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RAG_", env_file=".env", extra="ignore")

    # Infra (default de dev; sobrescrever em produção).
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "documents"
    rabbitmq_url: str = "amqp://rag:rag@localhost:5673/"

    # Confiabilidade do worker.
    # heartbeat alto: o embedding é longo e bloqueia a thread; evita o broker
    # derrubar a conexão durante o processamento (pitfall clássico do pika).
    rabbitmq_heartbeat: int = 600
    max_retries: int = 3
    retry_ttl_ms: int = 10_000

    # Porta HTTP onde o worker expõe /metrics (Prometheus).
    worker_metrics_port: int = 9100

    # Tamanho do lote de embedding/upsert. Cada lote é um CHECKPOINT: um crash
    # entre lotes preserva os já gravados (retomada de docs grandes).
    index_batch_size: int = 64

    # Integração com o Nest — SEM default (secret): boot falha se faltar.
    nest_base_url: str
    nest_service_token: str

    # Object storage (MinIO) — de onde o worker LÊ os arquivos enviados.
    minio_endpoint: str = "localhost:9000"
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = "minioadmin"
    minio_bucket: str = "documents"
    minio_secure: bool = False

    # Token de serviço exigido no /search (defesa em profundidade multi-tenant).
    # SEM default: boot falha se faltar.
    service_api_token: str

    # Modelos.
    device: str = "cpu"  # "cuda" no container WSL com GPU
    dense_model: str = "BAAI/bge-m3"
    dense_dim: int = 1024
    sparse_model: str = "Qdrant/bm25"
    rerank_model: str = "BAAI/bge-reranker-v2-m3"

    # Backend do embedding denso: "local" (modelo no processo) ou "http"
    # (serviço dedicado tipo TEI). "http" permite escalar workers sem GPU.
    dense_backend: str = "local"
    dense_service_url: str = "http://localhost:8080"

    # RAG generativo (/answer): backend do LLM plugável.
    #   "ollama": LLM local via Ollama (default — zero-config, sem API key, portável).
    #   "openai": qualquer endpoint compatível com a API OpenAI /chat/completions
    #             (OpenAI, Groq, OpenRouter, Together, vLLM, LM Studio...).
    llm_backend: str = "ollama"
    llm_model: str = "qwen2.5:7b-instruct"

    # Backend "ollama".
    ollama_url: str = "http://localhost:11434/api/chat"
    ollama_timeout: float = 300.0

    # Backend "openai" (API hospedada ou compatível). Só usados quando
    # llm_backend="openai"; a base e a chave dependem do provedor.
    llm_api_base: str = ""  # ex.: https://api.openai.com/v1
    llm_api_key: str = ""
    llm_api_timeout: float = 60.0

    # Streaming (/answer/stream): protege o LLM único (1 geração por vez em CPU).
    llm_max_concurrency: int = 1
    stream_queue_max_depth: int = 8      # fila cheia → recusa (error) em vez de enfileirar sem fim
    stream_queue_max_wait_s: float = 30.0  # espera máxima na fila antes de desistir
    stream_idle_timeout_s: float = 60.0    # sem token por esse tempo → encerra
    # Só entram no contexto trechos com score de rerank >= limiar (anti-alucinação).
    answer_min_score: float = 0.05
    # Quantos trechos, no máximo, viram contexto do LLM.
    answer_top_k: int = 5
    # Teto do contexto (chars) para não estourar a janela do modelo.
    answer_max_context_chars: int = 8000


@lru_cache
def get_settings() -> Settings:
    # Campos obrigatórios vêm do ambiente (.env / env vars); mypy não enxerga isso.
    return Settings()  # type: ignore[call-arg]
