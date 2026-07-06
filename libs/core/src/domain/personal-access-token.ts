import { DomainError } from './errors.js';

/**
 * Granular capabilities a Personal Access Token may carry. Each MCP tool (and
 * the guard in apps/api) requires one of these. Tokens are created with the
 * least privilege the integration needs.
 */
export type PatScope =
  | 'documents:read'
  | 'documents:write'
  | 'documents:publish'
  | 'messages:read'
  | 'messages:write'
  | 'profile:read'
  | 'profile:write';

export const PAT_SCOPES: readonly PatScope[] = [
  'documents:read',
  'documents:write',
  'documents:publish',
  'messages:read',
  'messages:write',
  'profile:read',
  'profile:write',
];

export type PersonalAccessTokenProps = {
  id: string;
  ownerId: string;
  name: string;
  /** Short human-readable prefix (e.g. "mlp_pat_ab12cd34") for identification. */
  prefix: string;
  /** SHA-256 hash of the raw token. The raw value is never stored. */
  tokenHash: string;
  scopes: PatScope[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

function assertValidScopes(scopes: PatScope[]): void {
  if (scopes.length === 0) throw new DomainError('invalid-token-scope');
  for (const scope of scopes) {
    if (!PAT_SCOPES.includes(scope)) throw new DomainError('invalid-token-scope');
  }
}

/**
 * A revocable, scoped API credential owned by a user. Used by external agents
 * (Claude Code, other models) to drive the system through the MCP server.
 * Framework-free: hashing and randomness live in adapters (apps/api).
 */
export class PersonalAccessToken {
  private constructor(private props: PersonalAccessTokenProps) {}

  static fromProps(props: PersonalAccessTokenProps): PersonalAccessToken {
    return new PersonalAccessToken(props);
  }

  static create(input: {
    id: string;
    ownerId: string;
    name: string;
    prefix: string;
    tokenHash: string;
    scopes: PatScope[];
    expiresAt: Date | null;
    now: Date;
  }): PersonalAccessToken {
    const name = input.name.trim();
    if (name.length === 0) throw new DomainError('invalid-name');
    assertValidScopes(input.scopes);
    return new PersonalAccessToken({
      id: input.id,
      ownerId: input.ownerId,
      name,
      prefix: input.prefix,
      tokenHash: input.tokenHash,
      scopes: [...input.scopes],
      lastUsedAt: null,
      expiresAt: input.expiresAt,
      createdAt: input.now,
      revokedAt: null,
    });
  }

  /** Valid = not revoked and not past its expiry. */
  isActive(now: Date): boolean {
    if (this.props.revokedAt) return false;
    if (this.props.expiresAt && this.props.expiresAt.getTime() <= now.getTime()) return false;
    return true;
  }

  hasScope(scope: PatScope): boolean {
    return this.props.scopes.includes(scope);
  }

  /** Renames the token. Editing metadata never changes the secret. */
  rename(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length === 0) throw new DomainError('invalid-name');
    this.props.name = trimmed;
  }

  /** Replaces the scope set (validated). The token value is unchanged. */
  setScopes(scopes: PatScope[]): void {
    assertValidScopes(scopes);
    this.props.scopes = [...scopes];
  }

  revoke(now: Date): void {
    if (!this.props.revokedAt) this.props.revokedAt = now;
  }

  /** Records that the token was just used (for auditing). */
  touch(now: Date): void {
    this.props.lastUsedAt = now;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.ownerId === userId;
  }

  get id(): string {
    return this.props.id;
  }
  get ownerId(): string {
    return this.props.ownerId;
  }
  get name(): string {
    return this.props.name;
  }
  get prefix(): string {
    return this.props.prefix;
  }
  get scopes(): PatScope[] {
    return [...this.props.scopes];
  }
  get lastUsedAt(): Date | null {
    return this.props.lastUsedAt;
  }
  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  toProps(): PersonalAccessTokenProps {
    return { ...this.props, scopes: [...this.props.scopes] };
  }
}
