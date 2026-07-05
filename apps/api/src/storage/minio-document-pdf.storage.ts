import type { DocumentPdfStorage } from '@my-little-pony/core';
import { Client } from 'minio';

export type MinioDocumentPdfStorageOptions = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

/**
 * DocumentPdfStorage sobre MinIO. Um PDF por documento publicado, com chave
 * `documents/{ownerId}/{documentId}.pdf` no bucket privado (SSE por padrão).
 * Reusa o mesmo bucket dos avatares (chaves não colidem).
 */
export class MinioDocumentPdfStorage implements DocumentPdfStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private ready?: Promise<void>;

  constructor(options: MinioDocumentPdfStorageOptions) {
    this.client = new Client({
      endPoint: options.endPoint,
      port: options.port,
      useSSL: options.useSSL,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
    });
    this.bucket = options.bucket;
  }

  private key(ownerId: string, documentId: string): string {
    return `documents/${ownerId}/${documentId}.pdf`;
  }

  async put(input: { ownerId: string; documentId: string; data: Uint8Array }): Promise<void> {
    await this.ensureBucket();
    const body = Buffer.from(input.data);
    await this.client.putObject(
      this.bucket,
      this.key(input.ownerId, input.documentId),
      body,
      body.length,
      {
        'Content-Type': 'application/pdf',
      },
    );
  }

  async get(input: { ownerId: string; documentId: string }): Promise<Uint8Array | null> {
    await this.ensureBucket();
    try {
      const stream = await this.client.getObject(
        this.bucket,
        this.key(input.ownerId, input.documentId),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async remove(input: { ownerId: string; documentId: string }): Promise<void> {
    await this.ensureBucket();
    try {
      await this.client.removeObject(this.bucket, this.key(input.ownerId, input.documentId));
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  /** Cria o bucket com SSE padrão uma vez; reprovisiona se a 1ª tentativa falhar. */
  private ensureBucket(): Promise<void> {
    this.ready ??= this.provisionBucket().catch((error) => {
      this.ready = undefined;
      throw error;
    });
    return this.ready;
  }

  private async provisionBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) await this.client.makeBucket(this.bucket);
    try {
      await this.client.setBucketEncryption(this.bucket, {
        Rule: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
      });
    } catch {
      // Encryption may already be set (or unsupported) — a private bucket is enough.
    }
  }
}

/** MinIO/S3 signal that the requested object does not exist. */
function isNotFound(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'NoSuchKey' || code === 'NotFound' || code === 'NoSuchObject';
}
