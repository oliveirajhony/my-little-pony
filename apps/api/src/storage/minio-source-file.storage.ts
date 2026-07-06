import type { SourceFileStorage, StoredSourceFile } from '@my-little-pony/core';
import { Client } from 'minio';

/**
 * Chave do objeto no bucket dos documentos-fonte. É o mesmo valor que vai no
 * descriptor interno (`storageKey`) e que o worker Python usa para ler os bytes.
 */
export function sourceFileStorageKey(ownerId: string, fileId: string): string {
  return `source-files/${ownerId}/${fileId}`;
}

export type MinioSourceFileStorageOptions = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

/**
 * SourceFileStorage sobre MinIO. Um blob por documento-fonte, com chave
 * `source-files/{ownerId}/{fileId}` no bucket privado dedicado (SSE por padrão).
 * O contentType é guardado no metadata do objeto e recuperado no `get`.
 */
export class MinioSourceFileStorage implements SourceFileStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private ready?: Promise<void>;

  constructor(options: MinioSourceFileStorageOptions) {
    this.client = new Client({
      endPoint: options.endPoint,
      port: options.port,
      useSSL: options.useSSL,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
    });
    this.bucket = options.bucket;
  }

  private key(ownerId: string, fileId: string): string {
    return sourceFileStorageKey(ownerId, fileId);
  }

  async put(input: {
    ownerId: string;
    fileId: string;
    data: Uint8Array;
    contentType: string;
  }): Promise<void> {
    await this.ensureBucket();
    const body = Buffer.from(input.data);
    await this.client.putObject(
      this.bucket,
      this.key(input.ownerId, input.fileId),
      body,
      body.length,
      {
        'Content-Type': input.contentType,
      },
    );
  }

  async get(input: { ownerId: string; fileId: string }): Promise<StoredSourceFile | null> {
    await this.ensureBucket();
    const key = this.key(input.ownerId, input.fileId);
    try {
      const stat = await this.client.statObject(this.bucket, key);
      const contentType =
        (stat.metaData?.['content-type'] as string | undefined) ?? 'application/octet-stream';
      const stream = await this.client.getObject(this.bucket, key);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      return { data: Buffer.concat(chunks), contentType };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async remove(input: { ownerId: string; fileId: string }): Promise<void> {
    await this.ensureBucket();
    try {
      await this.client.removeObject(this.bucket, this.key(input.ownerId, input.fileId));
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
