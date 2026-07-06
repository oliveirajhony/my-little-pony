import type { ContactMessage } from '../domain/contact-message.js';
import type { Document, DocumentStatus } from '../domain/document.js';
import type { PersonalAccessToken } from '../domain/personal-access-token.js';
import type { SourceFile } from '../domain/source-file.js';
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
  /** A published document by owner + public slug, or null. */
  findPublishedBySlug(ownerId: string, slug: string): Promise<Document | null>;
}

/** Emitted when a published document needs (re)indexing by the Python service. */
export type DocumentIndexRequested = { documentId: string; ownerId: string; version: number };

/**
 * Fonte indexável: documento nativo (HTML do editor) ou arquivo importado
 * (bytes no MinIO). O worker Python usa o `kind` para resolver o descriptor.
 */
export type SourceKind = 'native' | 'file';

/** Emitted when an indexable source (document or file) needs (re)indexing. */
export type IndexRequested = {
  documentId: string;
  ownerId: string;
  version: number;
  kind: SourceKind;
};

/** Emitted when an indexable source is removed and its vectors must be dropped. */
export type DeindexRequested = { documentId: string; ownerId: string; kind: SourceKind };

/** Emitted when a published document needs its PDF (re)generated. */
export type DocumentPdfRequested = { documentId: string; ownerId: string };

/** Emitted when someone asks to receive a published document's PDF by e-mail. */
export type DocumentPdfEmailRequested = { ownerId: string; slug: string; recipient: string };

/** Outbound port to the message broker (RabbitMQ adapter). */
export interface EventPublisher {
  indexRequested(event: IndexRequested): Promise<void>;
  deindexRequested(event: DeindexRequested): Promise<void>;
  documentPdfRequested(event: DocumentPdfRequested): Promise<void>;
  documentPdfEmailRequested(event: DocumentPdfEmailRequested): Promise<void>;
}

/** Sends transactional e-mail (SMTP/nodemailer adapter). */
export interface EmailSender {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<void>;
}

export type ContactMessagePage = { items: ContactMessage[]; total: number };

/** Persistência das mensagens de contato (adapter TypeORM). */
export interface ContactMessageRepository {
  save(message: ContactMessage): Promise<void>;
  findById(id: string): Promise<ContactMessage | null>;
  /** Mensagens de um autor, mais recentes primeiro, paginadas. */
  listByOwner(query: { ownerId: string; page: number; limit: number }): Promise<ContactMessagePage>;
  countUnread(ownerId: string): Promise<number>;
}

/** Key/value cache with TTL (Redis adapter). */
export interface CacheStore {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

/** A single hit from the semantic/hybrid search service (Python, Spec 2). */
export type SearchHit = {
  documentId: string;
  score: number;
  snippet: string;
  // Fonte do hit: documento nativo ou arquivo importado (ausente => native).
  kind?: SourceKind;
};

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

/** Persistence for Personal Access Tokens (TypeORM adapter in apps/api). */
export interface PersonalAccessTokenRepository {
  save(token: PersonalAccessToken): Promise<void>;
  /** Looks a token up by the SHA-256 hash of its raw value. */
  findByHash(tokenHash: string): Promise<PersonalAccessToken | null>;
  findById(id: string): Promise<PersonalAccessToken | null>;
  /** Owner's non-revoked tokens, newest first. */
  listActiveByOwner(ownerId: string): Promise<PersonalAccessToken[]>;
  /** Removes tokens whose expiry is at or before `now`. Returns how many were deleted. */
  deleteExpired(now: Date): Promise<number>;
}

/** A freshly generated opaque token: the raw secret, a display prefix and its hash. */
export type GeneratedAccessToken = { raw: string; prefix: string; hash: string };

/**
 * Generates and hashes Personal Access Tokens. The raw value is high-entropy,
 * so a fast SHA-256 (not Argon2) is used for O(1) lookup. Adapter: node:crypto.
 */
export interface AccessTokenGenerator {
  generate(): GeneratedAccessToken;
  /** Hashes a raw token the same way, for lookup on authentication. */
  hash(raw: string): string;
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

/** Renders a document's HTML into PDF bytes (headless-browser adapter). */
export interface PdfRenderer {
  render(input: { title: string; contentHtml: string }): Promise<Uint8Array>;
}

/** One private PDF per published document, addressed by owner + document id. */
export interface DocumentPdfStorage {
  put(input: { ownerId: string; documentId: string; data: Uint8Array }): Promise<void>;
  get(input: { ownerId: string; documentId: string }): Promise<Uint8Array | null>;
  remove(input: { ownerId: string; documentId: string }): Promise<void>;
}

export interface Clock {
  now(): Date;
}

/** Persistência dos metadados dos documentos-fonte (adapter TypeORM). */
export interface SourceFileRepository {
  save(file: SourceFile): Promise<void>;
  findById(id: string): Promise<SourceFile | null>;
  delete(id: string): Promise<void>;
  /** Arquivos de um autor, mais recentes primeiro. */
  listByOwner(ownerId: string): Promise<SourceFile[]>;
}

/** Um blob de documento-fonte: bytes + MIME para servir na pré-visualização. */
export interface StoredSourceFile {
  data: Uint8Array;
  contentType: string;
}

/** Bytes dos documentos-fonte, endereçados por owner + id (adapter: MinIO). */
export interface SourceFileStorage {
  put(input: {
    ownerId: string;
    fileId: string;
    data: Uint8Array;
    contentType: string;
  }): Promise<void>;
  get(input: { ownerId: string; fileId: string }): Promise<StoredSourceFile | null>;
  remove(input: { ownerId: string; fileId: string }): Promise<void>;
}
