import type { User } from '../domain/user.js';

/** Hashes and verifies plaintext passwords (Argon2id adapter in apps/api). */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

/** Opaque refresh tokens stored server-side (Redis adapter) with a TTL. */
export interface RefreshTokenStore {
  /** Persist a token for a user with a TTL; returns nothing. */
  issue(input: { userId: string; token: string; ttlSeconds: number }): Promise<void>;
  /** Returns the userId if the token is valid, else null. */
  resolve(token: string): Promise<string | null>;
  revoke(token: string): Promise<void>;
  /** Drop every refresh token for a user (used on password change/logout-all). */
  revokeAllForUser(userId: string): Promise<void>;
}

export interface TokenService {
  /** Signs a short-lived access token carrying the user id. */
  signAccessToken(userId: string): Promise<string>;
  /** Generates a fresh opaque refresh token string. */
  generateRefreshToken(): string;
}

export interface IdGenerator {
  next(): string;
}

/** A single stored avatar: raw bytes plus the MIME type to serve it with. */
export interface StoredAvatar {
  data: Uint8Array;
  contentType: string;
}

/** One private avatar per user, addressed by userId (adapter: MinIO in apps/api). */
export interface AvatarStorage {
  put(input: { userId: string; data: Uint8Array; contentType: string }): Promise<void>;
  get(userId: string): Promise<StoredAvatar | null>;
  remove(userId: string): Promise<void>;
}

export interface Clock {
  now(): Date;
}
