"""Casos de uso da aplicação."""

from rag_service.application.use_cases.index_document import IndexDocument
from rag_service.application.use_cases.search_documents import SearchDocuments

__all__ = ["IndexDocument", "SearchDocuments"]
