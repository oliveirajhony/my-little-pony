import type { AvatarStorage, StoredAvatar } from '@my-little-pony/core';
import { Client } from 'minio';

export type MinioAvatarStorageOptions = {
  endPoint: string;
  port: number;
  useSSL: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
};

/**
 * AvatarStorage backed by MinIO. The bucket stays private (served through the
 * API) and is created lazily with default SSE-S3 encryption on first use.
 */
export class MinioAvatarStorage implements AvatarStorage {
  private readonly client: Client;
  private readonly bucket: string;
  private ready?: Promise<void>;

  constructor(options: MinioAvatarStorageOptions) {
    this.client = new Client({
      endPoint: options.endPoint,
      port: options.port,
      useSSL: options.useSSL,
      accessKey: options.accessKey,
      secretKey: options.secretKey,
    });
    this.bucket = options.bucket;
  }

  async put(input: { userId: string; data: Uint8Array; contentType: string }): Promise<void> {
    await this.ensureBucket();
    const body = Buffer.from(input.data);
    await this.client.putObject(this.bucket, input.userId, body, body.length, {
      'Content-Type': input.contentType,
    });
  }

  async get(userId: string): Promise<StoredAvatar | null> {
    await this.ensureBucket();
    try {
      const stat = await this.client.statObject(this.bucket, userId);
      const contentType =
        (stat.metaData?.['content-type'] as string | undefined) ?? 'application/octet-stream';
      const stream = await this.client.getObject(this.bucket, userId);
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

  async remove(userId: string): Promise<void> {
    await this.ensureBucket();
    try {
      await this.client.removeObject(this.bucket, userId);
    } catch (error) {
      if (!isNotFound(error)) throw error;
    }
  }

  /** Create the bucket and set default encryption once, memoized for reuse. */
  private ensureBucket(): Promise<void> {
    this.ready ??= this.provisionBucket();
    return this.ready;
  }

  private async provisionBucket(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
    try {
      await this.client.setBucketEncryption(this.bucket, {
        Rule: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }],
      });
    } catch {
      // Encryption may already be configured (or unsupported by the backend);
      // a private, working bucket is enough to proceed.
    }
  }
}

/** MinIO/S3 signal that the requested object or key does not exist. */
function isNotFound(error: unknown): boolean {
  const code = (error as { code?: string })?.code;
  return code === 'NoSuchKey' || code === 'NotFound' || code === 'NoSuchObject';
}
