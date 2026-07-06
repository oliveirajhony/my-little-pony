# RAG Service (Spec 2) — Python hexagonal

Serviço de **indexação** e **busca híbrida** do projeto `my-little-pony`.
Consome eventos do Nest (RabbitMQ), busca o HTML via API interna do Nest,
chunka + embeda + indexa no Qdrant, e expõe busca híbrida por HTTP. Multi-tenant
(tudo filtrado por `ownerId`). Arquitetura ports & adapters.

## Arquitetura

```
rag_service/
├── domain/              # entidades puras (Chunk, EmbeddedChunk, SearchHit, IndexResult)
├── application/
│   ├── ports.py         # interfaces (Protocol): o domínio só conhece isto
│   └── use_cases/       # IndexDocument, SearchDocuments
├── adapters/
│   ├── inbound/         # RabbitIndexConsumer (worker), search_api (FastAPI)
│   ├── outbound/        # DoclingHtmlChunker, Bge*/Bm25 embedders, QdrantServerIndex,
│   │                    #   BgeReranker, NestContentClient, RabbitEventPublisher
│   └── fakes/           # implementações em memória (testes sem infra)
├── config.py            # pydantic-settings, valida secrets no boot
├── composition.py       # fiação (use cases + adapters reais)
├── main_worker.py       # entrypoint do worker
└── contracts.py         # nomes/payloads dos eventos (camelCase, contrato do Nest)
```

Regra: `adapters → application → domain` (dependência aponta pra dentro).

## Contratos com o Nest (Spec 1, §8)

- **Consome** `document.index.requested { documentId, ownerId, version }`
- **Publica** `document.index.completed { documentId, status, chunkCount, error? }`
- **Lê conteúdo** `GET {nest}/internal/documents/:id/content` (Bearer de serviço) → `{ content }`
- **Busca** `POST /search { query, ownerId, filters }` → `[{ documentId, chunkId, score, snippet }]`

## Rodar a infra (Docker no WSL)

```bash
# de dentro de v3/ no WSL:
docker compose up -d qdrant rabbitmq
```

- Qdrant: http://localhost:6333
- RabbitMQ: amqp://rag:rag@localhost:5673/ · painel http://localhost:15673 (rag/rag)

## Rodar worker + API (dev, venv)

```bash
export RAG_NEST_BASE_URL=http://localhost:3000
export RAG_NEST_SERVICE_TOKEN=dev-token

python -m rag_service.main_worker                                   # worker
uvicorn rag_service.adapters.inbound.search_api:app --port 8000     # API
```

Ou tudo em container: `docker compose up --build worker api`.

## Testes

```bash
pytest -m "not integration"   # rápidos (domínio, fakes) — sem infra
pytest                        # tudo (precisa Qdrant + RabbitMQ no ar)
```

## GPU no WSL (opcional)

Por padrão os modelos rodam em CPU. Para GPU:
1. Trocar a base do `Dockerfile` por uma imagem CUDA e instalar torch cu121.
2. Descomentar o bloco `deploy.resources` do serviço `worker` no compose.
3. `RAG_DEVICE=cuda`.
