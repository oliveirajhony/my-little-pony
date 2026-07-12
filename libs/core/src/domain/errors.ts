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
  | 'invalid-image'
  | 'document-not-found'
  | 'forbidden'
  | 'stale-version'
  | 'slug-taken'
  | 'invalid-contact'
  | 'invalid-page-config'
  | 'invalid-token-scope'
  | 'invalid-token'
  | 'token-not-found'
  | 'insufficient-scope'
  | 'invalid-file'
  | 'file-not-found'
  | 'invalid-llm-provider'
  | 'llm-provider-not-found';

export class DomainError extends Error {
  constructor(readonly code: DomainErrorCode) {
    super(code);
    this.name = 'DomainError';
  }
}
