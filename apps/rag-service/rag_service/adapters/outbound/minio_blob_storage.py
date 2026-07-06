"""Adapter da porta BlobStorage usando MinIO (S3-compatível).

Lê os bytes de um arquivo enviado. O upload/gravação é responsabilidade do
Nest; aqui só lemos.
"""

from __future__ import annotations

from minio import Minio


class MinioBlobStorage:
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
    ) -> None:
        self._client = Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
        self._bucket = bucket

    def get(self, key: str) -> bytes:
        response = None
        try:
            response = self._client.get_object(self._bucket, key)
            return response.read()
        finally:
            if response is not None:
                response.close()
                response.release_conn()
