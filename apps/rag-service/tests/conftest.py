"""Config compartilhada dos testes.

Define os secrets obrigatórios ANTES de qualquer módulo de teste importar a API
(o composition root e o SingleFlightGuard são criados no import de `search_api`,
e `get_settings()` valida os campos obrigatórios). Sem isto, coletar o módulo do
endpoint de streaming num ambiente limpo (CI) falha com ValidationError antes de
qualquer teste rodar. `setdefault` preserva valores reais quando presentes
(ex.: dentro do container).
"""

import os

os.environ.setdefault("RAG_NEST_BASE_URL", "http://nest:3000")
os.environ.setdefault("RAG_NEST_SERVICE_TOKEN", "test-token")
os.environ.setdefault("RAG_SERVICE_API_TOKEN", "search-token")
