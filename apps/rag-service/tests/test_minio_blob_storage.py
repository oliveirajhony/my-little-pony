"""Teste de integração do MinioBlobStorage (precisa do MinIO do docker-compose)."""

from io import BytesIO

import pytest
from minio import Minio

from rag_service.adapters.outbound.minio_blob_storage import MinioBlobStorage

pytestmark = pytest.mark.integration

ENDPOINT = "localhost:9000"
ACCESS_KEY = "minioadmin"
SECRET_KEY = "minioadmin"
BUCKET = "test-documents"


@pytest.fixture
def minio_client():
    client = Minio(ENDPOINT, access_key=ACCESS_KEY, secret_key=SECRET_KEY, secure=False)
    if not client.bucket_exists(BUCKET):
        client.make_bucket(BUCKET)
    return client


def test_reads_uploaded_blob(minio_client):
    data = b"%PDF-1.7 conteudo de um arquivo enviado"
    minio_client.put_object(BUCKET, "docs/relatorio.pdf", BytesIO(data), length=len(data))

    storage = MinioBlobStorage(ENDPOINT, ACCESS_KEY, SECRET_KEY, BUCKET, secure=False)

    assert storage.get("docs/relatorio.pdf") == data
