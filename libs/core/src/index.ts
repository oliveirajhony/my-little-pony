// Domain + application layers (framework-free). Consumed by apps/api adapters.

export {
  AuthenticateUser,
  type AuthResult,
  type AuthTokens,
  Logout,
  MIN_PASSWORD_LENGTH,
  RefreshSession,
  RegisterUser,
  SessionIssuer,
} from './application/auth-use-cases.js';
export {
  type AvatarImage,
  RemoveAvatar,
  SetAvatar,
} from './application/avatar-use-cases.js';
export {
  ListContactMessages,
  MarkContactMessageRead,
  SubmitContactMessage,
} from './application/contact-use-cases.js';
export {
  CreateDocument,
  DeleteDocument,
  GenerateDocumentPdf,
  GetDocument,
  GetDocumentPdf,
  GetPublicDocument,
  ListDocuments,
  MarkDocumentIndexed,
  type PublicDocument,
  PublishDocument,
  publicDocumentKey,
  SaveDraft,
  SendDocumentPdfEmail,
  UnpublishDocument,
} from './application/document-use-cases.js';
export type {
  AvatarStorage,
  CacheStore,
  Clock,
  ContactMessagePage,
  ContactMessageRepository,
  DocumentIndexRequested,
  DocumentPage,
  DocumentPdfEmailRequested,
  DocumentPdfRequested,
  DocumentPdfStorage,
  DocumentQuery,
  DocumentRepository,
  EmailSender,
  EventPublisher,
  IdGenerator,
  PasswordHasher,
  PdfRenderer,
  RefreshTokenStore,
  SearchGateway,
  SearchHit,
  StoredAvatar,
  TokenService,
  UserRepository,
} from './application/ports.js';
export {
  ChangePassword,
  GetProfile,
  UpdateProfile,
} from './application/profile-use-cases.js';
export {
  SearchDocuments,
  type SearchResultItem,
} from './application/search-use-cases.js';
export { ContactMessage, type ContactMessageProps } from './domain/contact-message.js';
export {
  Document,
  type DocumentProps,
  type DocumentStatus,
  type IndexStatus,
} from './domain/document.js';
export { DomainError, type DomainErrorCode } from './domain/errors.js';
export { User, type UserProps } from './domain/user.js';
