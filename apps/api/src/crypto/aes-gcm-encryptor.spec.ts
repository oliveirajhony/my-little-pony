import { describe, expect, it } from 'vitest';
import { AesGcmEncryptor } from './aes-gcm-encryptor';

const SECRET = 'dev_provider_key_encryption_secret_0123456789';

describe('AesGcmEncryptor', () => {
  it('faz round-trip (decrypt(encrypt(x)) === x)', () => {
    const enc = new AesGcmEncryptor(SECRET);
    const key = 'sk-or-v1-0123456789abcdefghijklmnop';
    expect(enc.decrypt(enc.encrypt(key))).toBe(key);
  });

  it('cifra o mesmo texto de forma diferente a cada vez (IV aleatório)', () => {
    const enc = new AesGcmEncryptor(SECRET);
    expect(enc.encrypt('segredo')).not.toBe(enc.encrypt('segredo'));
  });

  it('detecta adulteração (tag GCM) e lança no decrypt', () => {
    const enc = new AesGcmEncryptor(SECRET);
    const cipher = enc.encrypt('segredo');
    const [iv, tag, data] = cipher.split(':');
    // troca 1 byte dos dados → a verificação da tag falha
    const tampered = `${iv}:${tag}:${Buffer.from(`${data}x`)?.toString('base64')}`;
    expect(() => enc.decrypt(tampered)).toThrow();
  });

  it('um segredo diferente não decripta (chaves distintas)', () => {
    const cipher = new AesGcmEncryptor(SECRET).encrypt('segredo');
    expect(() => new AesGcmEncryptor(`${SECRET}-outro`).decrypt(cipher)).toThrow();
  });
});
