# Backend Nest (hexagonal) — Design / Spec 1

**Data:** 2026-07-05
**Status:** Aprovado para planejamento
**Escopo desta spec:** apenas o backend NestJS. O serviço Python de
processamento/busca é a **Spec 2** (posterior). A ligação do frontend à API é
trabalho separado (não entra aqui).

---

## 1. Contexto

`my-little-pony` é um editor de documentos open-source (estilo Google Docs),
monorepo Nx com um app Next (`apps/web`) já construído: telas de login, lista de
documentos, editor rich-text e configurações. Hoje o front usa dados mock e um
store client-side (`documents-store.ts`) cujo próprio comentário anuncia a
intenção: *"the single seam the real backend will replace"*.

O produto real é uma **plataforma de documentos com busca**: o usuário escreve
documentos no editor, pode **publicá-los** (ganham um `slug` e ficam acessíveis
publicamente por link) e, ao publicar, o conteúdo é **indexado para busca
semântica/híbrida**. A parte de IA (chunking, embeddings, busca híbrida, RAG) já
existe como protótipo Python (`tst-docling/v2`: Docling + HybridChunker + bge-m3
denso + BM25 esparso + Qdrant com fusão RRF + rerank cross-encoder + RAG via
Ollama) e será produtizada na Spec 2.

Este é um projeto de **portfólio** mirando vagas de fullstack: banco relacional,
API, cache, fila, autenticação com senha criptografada e busca híbrida são
requisitos deliberados para demonstrar domínio dessas peças.

## 2. Decisões travadas

- **Duas specs, nesta ordem:** (1) Nest hexagonal — esta. (2) Serviço Python
  hexagonal — depois.
- **Somente documentos nativos** criados no editor (conteúdo HTML). Upload em
  lote de PDF + Docling é **fase futura** — o modelo de dados já reserva o
  ponteiro (`storage_key`), mas nenhuma rota/infra de upload entra agora.
- **Indexação dispara no PUBLICAR**, nunca no autosave.
- **Autosave** = `UPDATE` barato, síncrono, só no Postgres. Não toca na fila.
- **Dois bancos:** Postgres (verdade transacional) e Qdrant (verdade de busca —
  vive no serviço Python). Object storage (MinIO) e Docling só quando o upload
  chegar.
- **Redis** = cache + rate limit. **RabbitMQ** = fila (desacopla Nest↔Python e
  dá backpressure ao pipeline caro).
- **ORM:** TypeORM, atrás da porta `DocumentRepository` (detalhe de adapter).
- **Hash de senha:** Argon2id.

## 3. Objetivos e não-objetivos

**Objetivos (Spec 1):**

1. Autenticação: registro com senha criptografada (Argon2id), login, JWT de
   acesso + refresh token, perfil e troca de senha.
2. Documentos: CRUD, autosave, `slug`, listagem com busca lexical (full-text do
   Postgres) e filtros (status, categoria).
3. Publicação: publicar/despublicar, projeção de `index_status`, produção do
   evento de indexação e consumo do evento de conclusão.
4. Leitura pública por `slug` (anônima, só publicados, com cache).
5. Definir as **costuras** de integração com o Python (contrato de eventos da
   fila, endpoint interno de conteúdo, contrato HTTP de busca) e deixar as
   portas de busca com adapter-stub.
6. Cross-cutting: rate limit escalonado, validação de secrets no boot, cache.
7. Arquitetura ports & adapters (hexagonal) de ponta a ponta, testável.

**Não-objetivos (ficam para Spec 2 ou fases futuras):**

- Upload de arquivos, storage (MinIO), Docling.
- Geração de chunks, embeddings, Qdrant.
- Busca híbrida real e rerank (aqui só a porta + stub; a implementação é Python).
- `/ask` / RAG com LLM.
- Edição colaborativa em tempo real (CRDT/OT) — cada documento tem um dono só;
  autosave é last-write-wins com guarda de versão.
- Ligar o frontend à API (trabalho separado).

## 4. Arquitetura hexagonal

Dependência aponta só para dentro: `adapters → application → domain`.

```
apps/api  (NestJS — bootstrap + adapters)
libs/core (TypeScript puro, sem framework)
  ├─ domain/          entidades + invariantes
  │     User, Document (unicidade de slug, transições de status, versão)
  ├─ application/     casos de uso + PORTAS (interfaces)
  │     use-cases: Register, Authenticate, RefreshToken, UpdateProfile,
  │                ChangePassword, CreateDocument, SaveDraft (autosave),
  │                PublishDocument, UnpublishDocument, ListDocuments,
  │                GetDocument, DeleteDocument, GetPublicBySlug, Search
  │     ports:     UserRepository, RefreshTokenStore, DocumentRepository,
  │                PasswordHasher, TokenService, EventPublisher,
  │                SearchGateway, CacheStore, Clock, IdGenerator
  └─ adapters/ (implementados em apps/api/infra)
      inbound:   REST controllers, consumer da fila (document.index.completed)
      outbound:  TypeOrmUserRepository, TypeOrmDocumentRepository,
                 Argon2PasswordHasher, JwtTokenService, RabbitEventPublisher,
                 RedisCacheStore, RedisRefreshTokenStore,
                 HttpSearchGateway (stub → Python na Spec 2)
packages/contracts  DTOs/tipos compartilhados com o front (tipagem ponta a ponta)
```

**Por que hexagonal aqui rende:** `PublishDocument` não sabe se a fila é
RabbitMQ nem se o banco é Postgres — fala com `EventPublisher` e
`DocumentRepository`. Trocar adapter não toca no domínio; testes de caso de uso
rodam com portas fake, sem infra.

**Layout Nx:** `libs/core` guarda domínio + aplicação (sem dependência de Nest);
`apps/api` guarda os adapters (controllers, TypeORM, Rabbit, Redis) e o
bootstrap; `packages/contracts` guarda os DTOs partilhados com `apps/web`.

## 5. Modelo de dados (Postgres)

```
users
  id            uuid  pk
  name          text
  email         text  unique, not null
  password_hash text  not null          -- Argon2id
  avatar_url    text  null
  created_at    timestamptz
  updated_at    timestamptz

-- refresh tokens: adapter PADRÃO é Redis (RefreshTokenStore), com TTL nativo e
-- revogação por delete. A tabela abaixo é a ALTERNATIVA em Postgres (não usada
-- por padrão) caso se queira auditoria/persistência dos tokens:
refresh_tokens
  id            uuid  pk
  user_id       uuid  fk users
  token_hash    text  not null           -- hash do refresh token, nunca em claro
  expires_at    timestamptz
  revoked_at    timestamptz  null

documents
  id            uuid  pk
  owner_id      uuid  fk users
  title         text
  slug          text  unique             -- único GLOBAL (é URL pública)
  status        text  check (draft|published)   default 'draft'
  content       jsonb                     -- HTML/estrutura do editor
  excerpt       text                      -- derivado do conteúdo
  categories    text[]                    -- índice GIN
  index_status  text  check (none|indexing|ready|failed)  default 'none'
  version       int   default 0           -- guarda contra sobrescrita de autosave
  search_tsv    tsvector                  -- full-text da LISTA (índice GIN)
  storage_key   text  null                -- ponteiro p/ arquivo (só uploads, futuro)
  published_at  timestamptz  null
  created_at    timestamptz
  updated_at    timestamptz
```

**Invariantes de domínio:**

- `slug` é único global; ao publicar, se colidir, o domínio anexa sufixo
  (`-2`, `-3`, …).
- Só documentos com `status = published` são acessíveis por `/public/.../:slug`
  e elegíveis para busca semântica.
- `search_tsv` alimenta a busca **lexical da lista** dentro do próprio Postgres;
  é distinta da busca semântica (Qdrant, Spec 2).
- `version` incrementa a cada save; o autosave envia a versão que leu e o
  backend rejeita se estiver defasada (409), evitando clobber.

## 6. Superfície de API

```
Auth
  POST   /auth/register            { name, email, password } -> tokens
  POST   /auth/login               { email, password } -> access + refresh(cookie)
  POST   /auth/refresh             (refresh cookie) -> novo access
  POST   /auth/logout              revoga refresh

Perfil
  GET    /users/me
  PATCH  /users/me                 { name?, email?, avatar_url? }
  PATCH  /users/me/password        { current, next }

Documentos (autenticado, escopado ao dono)
  GET    /documents                ?q&status&category&page&limit  (FTS Postgres)
  POST   /documents                cria documento novo (rascunho)
  GET    /documents/:id
  PATCH  /documents/:id            autosave: { title?, content?, slug?, categories?, version }
  POST   /documents/:id/publish
  POST   /documents/:id/unpublish
  DELETE /documents/:id

Público (anônimo)
  GET    /public/documents/:slug   só published; com cache

Busca (porta p/ Python — stub nesta spec)
  GET    /search                   ?q  -> proxy autenticado ao serviço Python

Interno (consumido pelo Python)
  GET    /internal/documents/:id/content   auth de serviço; Python lê o HTML p/ indexar

Saúde
  GET    /health
```

Respostas de erro seguem um envelope consistente (código, mensagem, detalhes de
validação). Rate limit excedido responde `429` + `Retry-After`.

## 7. Ciclo de vida do documento

```
Digitando ──autosave(PATCH)──► Postgres(content, version++)   [rascunho, salvo, NÃO buscável]
    │  (repete o dia todo, sem fila)
    ▼
Publicar ──► domínio: status=published, slug garantido, index_status=indexing
             └─► EventPublisher: "document.index.requested { id, ownerId, version }"
                     └─► [Spec 2] Python consome, busca conteúdo em
                         GET /internal/documents/:id/content, faz chunk+embed,
                         upsert no Qdrant
                             └─► "document.index.completed { id, status, chunkCount, error? }"
                                     └─► Nest consome -> index_status=ready|failed
                                                         [buscável + público em /d/:slug]
```

Editar um documento já publicado: o autosave continua barato (só Postgres); o
conteúdo público/buscável fica defasado até **republicar** (ou um reindex
debounce-ado, no máximo 1 a cada N minutos). Reindexar é idempotente do lado
Python (apaga chunks do `document_id` e regrava com id estável).

## 8. Costuras de integração com o serviço Python

Definidas nesta spec; implementadas na Spec 2.

- **Fila — produz:** `document.index.requested { documentId, ownerId, version }`
  ao publicar/republicar.
- **Fila — consome:** `document.index.completed { documentId, status, chunkCount, error? }`
  para atualizar `index_status`.
- **Endpoint interno de conteúdo:** o evento carrega apenas `id + version`; o
  Python busca o HTML via `GET /internal/documents/:id/content` (auth de
  serviço). Assim o **Nest permanece o único a escrever no Postgres**; o Python
  só lê.
- **Busca (HTTP Nest→Python):** `POST /search { query, ownerId, filters }` ->
  `[{ documentId, chunkId, score, snippet }]`. O Nest autentica, faz proxy e
  enriquece o resultado com metadados do Postgres (título, slug, dono). Até o
  Python existir, o `HttpSearchGateway` é um stub que responde
  `503 Service Unavailable` de forma controlada.

## 9. Infraestrutura (docker-compose)

- **Agora (Spec 1):** Postgres, Redis, RabbitMQ.
- **Depois (Spec 2):** MinIO, Qdrant, e os modelos/serviço Python.

## 10. Cross-cutting

- **Autenticação:** Argon2id para senha; JWT de acesso curto + refresh token em
  cookie `httpOnly`; guards por rota; `owner_id` em toda operação de documento.
- **Secrets:** validados no boot (schema de config). **Sem default no código**
  para JWT/keys/segredos — o boot falha rápido se faltar.
- **Rate limit:** `@nestjs/throttler` com storage no **Redis** (contador
  compartilhado entre instâncias), escalonado por rota:

  | Superfície | Dimensão | Aperto |
  |---|---|---|
  | Auth (login/registro) | IP | apertado (anti-brute-force) |
  | Busca / futuras rotas caras | userId | apertado |
  | Publicar (dispara pipeline) | userId | apertado + debounce de reindex |
  | Autosave / CRUD | userId | generoso |
  | Leitura pública `/d/:slug` | IP | médio (anti-scraping) |

- **Cache (Redis):** leitura pública por slug e (futuro) resultados de busca;
  invalidação ao republicar/despublicar.
- **Backpressure:** a concorrência de workers (Spec 2) é o freio natural do
  pipeline caro; a fila absorve picos de publicação.

## 11. Convenções de código

Seguem o padrão já estabelecido no `apps/web`, para o monorepo ter uma voz só.

| Camada | Idioma | Estilo |
|---|---|---|
| Commits | Inglês | Conventional Commits, minúsculo, imperativo (`feat: add ...`); tipos `feat/fix/refactor/style/test/docs/chore`; `(#NN)` opcional |
| Código (identificadores + comentários) | Inglês | `DocumentRepository`, `PublishDocument`; JSDoc `/** */` para propósito, `//` inline só para explicar o **porquê** |
| Mensagens de erro da API visíveis ao usuário | Português (pt-BR) | igual ao `AUTH_MESSAGES` do front: `"E-mail ou senha incorretos."` |
| Códigos de erro internos | Inglês | `bad-credentials`, `slug-taken`, `stale-version` |
| Docs / specs (`docs/*.md`) | Português | como este documento |

Comentários descrevem intenção/porquê, nunca narram o óbvio.

## 12. Testes

TDD. Casos de uso testados em `libs/core` com portas fake (sem infra). Adapters
e controllers com testes e2e (banco de teste efêmero). Vitest já está no
monorepo.

## 13. Blocos de trabalho (Spec 1)

| # | Bloco | Entrega |
|---|---|---|
| A | Scaffold `apps/api` (@nx/nest) + `libs/core` + `packages/contracts` + docker-compose (pg/redis/rabbitmq) | Nest de pé, camadas, infra local |
| B | Config + validação de secrets no boot + `/health` | Boot seguro |
| C | Auth & Users | registro (Argon2id), login, JWT+refresh, perfil, troca de senha |
| D | Documents: domínio + repo TypeORM + CRUD + autosave (versão) + slug + FTS da lista | criar/editar/listar/buscar documentos |
| E | Publicar/despublicar + produtor da fila + `index_status` + consumer de conclusão | ciclo publicar→indexar por evento |
| F | Leitura pública por slug + cache | `/public/documents/:slug` |
| G | Portas de Search + endpoint interno de conteúdo + `HttpSearchGateway` stub | costura pro Python pronta |
| H | Rate limit + endurecimento cross-cutting | limites por rota, `429` + `Retry-After` |

## 14. O que vem depois (fora desta spec)

- **Spec 2 (Python, hexagonal):** consumer da fila, chunk do HTML nativo + embed
  (denso bge-m3 + esparso BM25), Qdrant, endpoint de busca híbrida com rerank.
  Docling (upload) e `/ask`/LLM são fases seguintes dentro ou após a Spec 2.
- **Ligar o frontend:** trocar o `documents-store` por chamadas à API,
  aproveitando o "seam" já anunciado no código.
