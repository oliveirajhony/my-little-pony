import type { PasswordHasher } from '@my-little-pony/core';
import * as argon2 from 'argon2';

/** Argon2id password hasher — the outbound adapter for the PasswordHasher port. */
export class Argon2PasswordHasher implements PasswordHasher {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      // A malformed stored hash must read as "does not match", never throw.
      return false;
    }
  }
}
