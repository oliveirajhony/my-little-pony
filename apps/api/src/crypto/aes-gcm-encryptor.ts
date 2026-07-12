import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import type { Encryptor } from '@my-little-pony/core';

/**
 * Adapter Encryptor com AES-256-GCM (`node:crypto`). A chave de 32 bytes é
 * derivada do segredo (`scrypt`) uma vez. Formato do texto cifrado:
 * `base64(iv):base64(authTag):base64(dados)` — IV aleatório por chamada e a tag
 * GCM garante integridade (decrypt lança se o ciphertext for adulterado).
 */
export class AesGcmEncryptor implements Encryptor {
  private readonly key: Buffer;

  constructor(secret: string) {
    // scrypt determinístico (salt fixo): o segredo do env é a fonte de entropia.
    this.key = scryptSync(secret, 'mlp-llm-provider', 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${tag.toString('base64')}:${data.toString('base64')}`;
  }

  decrypt(cipher: string): string {
    const [iv, tag, data] = cipher.split(':');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    const plain = Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
    return plain.toString('utf8');
  }
}
