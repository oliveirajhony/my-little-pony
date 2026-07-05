import { lookup as dnsLookup } from 'node:dns';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIPv4, type LookupFunction } from 'node:net';
import { DomainError } from '@my-little-pony/core';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 5000;

/**
 * Só http(s) é permitido. A validação de IP (anti-SSRF) acontece no `lookup`
 * fixado abaixo, durante a conexão — não numa checagem separada.
 */
export function assertSafeUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new DomainError('invalid-image');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new DomainError('invalid-image');
  }
}

/**
 * `dns.lookup` guardado: resolve o host, rejeita QUALQUER endereço privado, e
 * devolve o endereço validado — que é exatamente o IP em que a conexão vai
 * ocorrer. Como não há uma segunda resolução, isso fecha a janela de DNS
 * rebinding (o socket conecta no mesmo IP que foi checado). O Host/SNI continua
 * o hostname original (a conexão é feita com a URL, não com o IP).
 */
const pinnedGuardedLookup: LookupFunction = (hostname, _options, callback) => {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) {
      callback(err, '', 0);
      return;
    }
    if (addresses.length === 0 || addresses.some((entry) => isPrivateAddress(entry.address))) {
      callback(new DomainError('invalid-image'), '', 0);
      return;
    }
    const chosen = addresses[0];
    callback(null, chosen.address, chosen.family);
  });
};

/** Baixa uma imagem remota atrás do guard SSRF, com timeout e teto de 5 MB. */
export function fetchImageFromUrl(url: string): Promise<Buffer> {
  assertSafeUrl(url);
  const parsed = new URL(url);
  const request = parsed.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise<Buffer>((resolve, reject) => {
    const fail = () => reject(new DomainError('invalid-image'));

    const req = request(url, { lookup: pinnedGuardedLookup, timeout: FETCH_TIMEOUT_MS }, (res) => {
      const status = res.statusCode ?? 0;
      // Redirects não são seguidos — um 3xx poderia apontar para a rede interna.
      const contentType = String(res.headers['content-type'] ?? '');
      const declared = Number(res.headers['content-length'] ?? '0');
      if (
        status < 200 ||
        status >= 300 ||
        !contentType.startsWith('image/') ||
        declared > MAX_IMAGE_BYTES
      ) {
        res.resume();
        fail();
        return;
      }

      const chunks: Buffer[] = [];
      let size = 0;
      res.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_IMAGE_BYTES) {
          res.destroy();
          fail();
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', fail);
    });

    req.on('timeout', () => {
      req.destroy();
      fail();
    });
    req.on('error', fail);
    req.end();
  });
}

function isPrivateAddress(address: string): boolean {
  if (isIPv4(address)) return isPrivateIPv4(address);
  return isPrivateIPv6(address);
}

function isPrivateIPv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts;
  if (a === 0) return true; // 0.0.0.0/8 (includes 0.0.0.0)
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local
  return false;
}

function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase().split('%')[0];
  if (normalized === '::' || normalized === '::1') return true; // unspecified / loopback
  // IPv4-mapped addresses (::ffff:a.b.c.d) — check the embedded IPv4.
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  const first = normalized.split(':')[0];
  const head = Number.parseInt(first || '0', 16);
  if ((head & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((head & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  return false;
}
