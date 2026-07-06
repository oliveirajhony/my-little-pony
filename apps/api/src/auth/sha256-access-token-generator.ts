import { createHash, randomBytes } from 'node:crypto';
import type { AccessTokenGenerator, GeneratedAccessToken } from '@my-little-pony/core';

const TOKEN_PREFIX = 'mlp_pat_';
// Bytes of entropy in the random part (base64url ~= 43 chars for 32 bytes).
const ENTROPY_BYTES = 32;
// Length of the display prefix stored for identification (prefix + 8 chars).
const DISPLAY_PREFIX_LENGTH = TOKEN_PREFIX.length + 8;

/**
 * Generates opaque Personal Access Tokens ("mlp_pat_…") and hashes them with
 * SHA-256 for O(1) lookup. Raw tokens are high-entropy, so a fast hash is safe.
 */
export class Sha256AccessTokenGenerator implements AccessTokenGenerator {
  generate(): GeneratedAccessToken {
    const raw = TOKEN_PREFIX + randomBytes(ENTROPY_BYTES).toString('base64url');
    return {
      raw,
      prefix: raw.slice(0, DISPLAY_PREFIX_LENGTH),
      hash: this.hash(raw),
    };
  }

  hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
