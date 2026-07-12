# Provedores de IA plugáveis (Configurações) — design (#63)

Configurar o LLM da **geração** (Explorar/RAG) pela interface, sem env/restart. Por
usuário, multi-provedor, chave **criptografada e write-only**.

## Decisões

- **Escopo:** por usuário (`owner_id`), como os Personal Access Tokens.
- **Chave:** write-only. Você digita → persiste **criptografada** (reversível, o
  servidor decripta pra chamar o provedor). Nunca é reexibida/copiada — só a
  máscara (`hint`, últimos 4) + remover. Trocar = remover e adicionar.
- **Um ativo por usuário.** Ativar um desativa os outros. A geração das respostas
  do usuário usa o ativo dele. Sem ativo → fallback pro env (Ollama local).
- **Backends:** `openai` (qualquer endpoint compatível com `/chat/completions`:
  OpenAI, OpenRouter→Claude/Gemini/tudo, Gemini-compat, Groq, LM Studio, vLLM…) e
  `ollama` (local). Anthropic/Gemini nativos entram via OpenRouter/endpoint compat.

## Camadas

### core (`libs/core`)
- Domínio `LlmProvider` { id, ownerId, label, backend, baseUrl, model,
  apiKeyEncrypted, apiKeyHint, isActive, createdAt } + `isOwnedBy`.
- Porta `Encryptor` { encrypt(plain): string; decrypt(cipher): string }.
- Porta `LlmProviderRepository` (listByOwner, findById, save, delete,
  deactivateAllForOwner).
- Use-cases: `ListLlmProviders`, `AddLlmProvider` (cifra a chave via Encryptor,
  calcula hint), `ActivateLlmProvider` (desativa os outros do dono), `RemoveLlmProvider`.
- `type LlmConfig = { backend; baseUrl; apiKey?; model }`.
- `AnswerQuestion.execute/stream` e `AnswerGateway.answer/answerStream` ganham
  `llm?: LlmConfig` (passthrough puro; retrieval/enriquecimento não mudam).

### api (`apps/api`)
- `AesGcmEncryptor` (`node:crypto` aes-256-gcm) implementando `Encryptor`; guarda
  `base64(iv):base64(tag):base64(ct)`. Chave de 32 bytes derivada do segredo novo
  `PROVIDER_KEY_ENCRYPTION_KEY` (env, `z.string().min(32)`), via `scrypt`.
- ORM entity + repo `llm_providers` + migration.
- `LlmProvidersController` em `users/me/llm-providers` (guard access token),
  espelhando o `pat.controller`: `GET` (lista **sem** a chave), `POST` (add),
  `POST :id/activate`, `DELETE :id`. Response nunca inclui `apiKeyEncrypted`.
- No fluxo do Explorar: resolve o provedor ativo do `user.id`, decripta a chave,
  monta `LlmConfig` e passa em `AnswerQuestion` → `HttpAnswerGateway` (corpo do
  `/answer` e `/answer/stream`). Sem ativo → `llm` ausente.

### rag-service (`apps/rag-service`)
- `AnswerRequest.llm?` = { backend, base, apiKey?, model }.
- `Composition.answer_generator_for(llm)` cria o generator **por request**
  (`OpenAiAnswerGenerator`/`OllamaAnswerGenerator`), reusando os singletons de
  `dense/sparse/index/reranker`. `search_api` usa `request.llm` quando presente,
  senão o generator do env (fallback).

### web (`apps/web`)
- `lib/llm-providers-api.ts` (list/add/activate/remove; tipos **sem** a chave).
- `components/app/settings/llm-providers-section.tsx` (espelha `tokens-section`):
  lista com label + backend/modelo + máscara + badge "Ativo" + Ativar/Remover; e
  dialog "Adicionar" com **presets** (OpenAI, OpenRouter, Gemini, Groq, LM Studio,
  Ollama, Custom) que prefilam backend + base URL; campos label, modelo, chave
  (input password).
- Nova `SettingsSection` "Provedores de IA" na `config/page.tsx`.

## Testes
- core: `Encryptor` round-trip (fake), use-cases (add cifra + hint, list sem
  segredo, activate exclusivo, remove; re-checagem de posse).
- api: `AesGcmEncryptor` round-trip real; controller (POST/GET-sem-chave/activate/
  delete); wiring passa o `llm` ativo pro gateway.
- rag-service: `answer_generator_for` (openai vs ollama a partir do request +
  fallback env).
- web: seção (adicionar com preset, ativar, remover; a chave nunca aparece na
  lista/response).

## Fora de escopo
Editar a chave (remove+recria); a Busca usar LLM (ela só recupera, não gera);
múltiplos ativos simultâneos; troca de provedor por-feature.
