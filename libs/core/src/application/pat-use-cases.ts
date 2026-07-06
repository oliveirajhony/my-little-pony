import { DomainError } from '../domain/errors.js';
import { type PatScope, PersonalAccessToken } from '../domain/personal-access-token.js';
import type {
  AccessTokenGenerator,
  Clock,
  IdGenerator,
  PersonalAccessTokenRepository,
} from './ports.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CreatedAccessToken = {
  /** The raw secret — returned once, never persisted. */
  token: string;
  record: PersonalAccessToken;
};

export class CreatePersonalAccessToken {
  constructor(
    private readonly repo: PersonalAccessTokenRepository,
    private readonly generator: AccessTokenGenerator,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: {
    ownerId: string;
    name: string;
    scopes: PatScope[];
    expiresInDays?: number | null;
  }): Promise<CreatedAccessToken> {
    const now = this.clock.now();
    const { raw, prefix, hash } = this.generator.generate();
    const expiresAt =
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(now.getTime() + input.expiresInDays * MS_PER_DAY)
        : null;
    const record = PersonalAccessToken.create({
      id: this.ids.next(),
      ownerId: input.ownerId,
      name: input.name,
      prefix,
      tokenHash: hash,
      scopes: input.scopes,
      expiresAt,
      now,
    });
    await this.repo.save(record);
    return { token: raw, record };
  }
}

export class ListPersonalAccessTokens {
  constructor(private readonly repo: PersonalAccessTokenRepository) {}

  execute(input: { ownerId: string }): Promise<PersonalAccessToken[]> {
    return this.repo.listActiveByOwner(input.ownerId);
  }
}

export class UpdatePersonalAccessToken {
  constructor(private readonly repo: PersonalAccessTokenRepository) {}

  async execute(input: {
    ownerId: string;
    id: string;
    name?: string;
    scopes?: PatScope[];
  }): Promise<PersonalAccessToken> {
    const token = await this.repo.findById(input.id);
    if (!token) throw new DomainError('document-not-found');
    if (!token.isOwnedBy(input.ownerId)) throw new DomainError('forbidden');
    if (input.name !== undefined) token.rename(input.name);
    if (input.scopes !== undefined) token.setScopes(input.scopes);
    await this.repo.save(token);
    return token;
  }
}

export class RevokePersonalAccessToken {
  constructor(
    private readonly repo: PersonalAccessTokenRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: { ownerId: string; id: string }): Promise<void> {
    const token = await this.repo.findById(input.id);
    if (!token) throw new DomainError('document-not-found');
    if (!token.isOwnedBy(input.ownerId)) throw new DomainError('forbidden');
    token.revoke(this.clock.now());
    await this.repo.save(token);
  }
}

/**
 * Housekeeping: deletes tokens past their expiry. Security is already enforced
 * lazily by isActive() at authentication time — this only tidies the store.
 * Driven by a scheduler adapter (see apps/api). Returns how many were removed.
 */
export class PurgeExpiredTokens {
  constructor(
    private readonly repo: PersonalAccessTokenRepository,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<number> {
    return this.repo.deleteExpired(this.clock.now());
  }
}

/**
 * Resolves a raw token to its (active) record for the MCP guard. Bumps
 * lastUsedAt for auditing. Unknown, revoked or expired tokens raise
 * 'invalid-token'.
 */
export class AuthenticatePersonalAccessToken {
  constructor(
    private readonly repo: PersonalAccessTokenRepository,
    private readonly generator: AccessTokenGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: { raw: string }): Promise<PersonalAccessToken> {
    const hash = this.generator.hash(input.raw);
    const token = await this.repo.findByHash(hash);
    const now = this.clock.now();
    if (!token?.isActive(now)) throw new DomainError('invalid-token');
    token.touch(now);
    await this.repo.save(token);
    return token;
  }
}
