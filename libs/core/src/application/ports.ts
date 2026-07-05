import type { Document, DocumentStatus } from '../domain/document.js';
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

export type DocumentQuery = {
  ownerId: string;
  q?: string;
  status?: DocumentStatus;
  category?: string;
  page: number;
  limit: number;
};

export type DocumentPage = { items: Document[]; total: number };

export interface DocumentRepository {
  save(document: Document): Promise<void>;
  findById(id: string): Promise<Document | null>;
  delete(id: string): Promise<void>;
  /** Owner-scoped list with full-text query, filters and pagination. */
  list(query: DocumentQuery): Promise<DocumentPage>;
  /** A published document by its public slug, or null. */
  findPublishedBySlug(slug: string): Promise<Document | null>;
}

/** Emitted when a published document needs (re)indexing by the Python service. */
export type DocumentIndexRequested = { documentId: string; ownerId: string; version: number };

/** Outbound port to the message broker (RabbitMQ adapter). */
export interface EventPublisher {
  documentIndexRequested(event: DocumentIndexRequested): Promise<void>;
}

/** Key/value cache with TTL (Redis adapter). */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** A single hit from the semantic/hybrid search service (Python, Spec 2). */
export type SearchHit = { documentId: string; score: number; snippet: string };

/** Outbound port to the search service. The HTTP adapter proxies to Python. */
export interface SearchGateway {
  search(input: { ownerId: string; q: string }): Promise<SearchHit[]>;
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
