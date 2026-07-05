// Internal error codes are English; user-facing messages (pt-BR) are attached
// by the HTTP layer. Domain code never carries presentation strings.
export type DomainErrorCode =
  | 'invalid-name'
  | 'invalid-email'
  | 'weak-password'
  | 'email-taken'
  | 'bad-credentials'
  | 'stale-token'
  | 'user-not-found'
  | 'document-not-found'
  | 'forbidden'
  | 'stale-version'
  | 'slug-taken';

export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode) {
    super(code);
    this.name = 'DomainError';
  }
}
