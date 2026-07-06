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
  UnpublishDocument,
} from './application/document-use-cases.js';
export {
  AuthenticatePersonalAccessToken,
  type CreatedAccessToken,
  CreatePersonalAccessToken,
  ListPersonalAccessTokens,
  PurgeExpiredTokens,
  RevokePersonalAccessToken,
  UpdatePersonalAccessToken,
} from './application/pat-use-cases.js';
export type {
  AccessTokenGenerator,
  AvatarStorage,
  CacheStore,
  Clock,
  ContactMessagePage,
  ContactMessageRepository,
  DeindexRequested,
  DocumentPage,
  DocumentPdfEmailRequested,
  DocumentPdfRequested,
  DocumentPdfStorage,
  DocumentQuery,
  DocumentRepository,
  EmailSender,
  EventPublisher,
  GeneratedAccessToken,
  IdGenerator,
  IndexRequested,
  PasswordHasher,
  PdfRenderer,
  PersonalAccessTokenRepository,
  RefreshTokenStore,
  SearchGateway,
  SearchHit,
  SourceFileRepository,
  SourceFileStorage,
  SourceKind,
  StoredAvatar,
  StoredSourceFile,
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
export {
  DeleteSourceFile,
  GetSourceFileContent,
  ImportSourceFile,
  ListSourceFiles,
} from './application/source-file-use-cases.js';
export { ContactMessage, type ContactMessageProps } from './domain/contact-message.js';
export {
  Document,
  type DocumentProps,
  type DocumentStatus,
  type IndexStatus,
} from './domain/document.js';
export { DomainError, type DomainErrorCode } from './domain/errors.js';
export {
  clonePageConfig,
  DEFAULT_PAGE_CONFIG,
  DOCUMENT_THEMES,
  type DocumentTheme,
  mergePageConfig,
  PAGE_ORIENTATIONS,
  PAPER_SIZES,
  type PageConfig,
  type PageConfigPatch,
  type PageMargins,
  type PageOrientation,
  type PaperSize,
} from './domain/page-config.js';
export {
  PAT_SCOPES,
  type PatScope,
  PersonalAccessToken,
  type PersonalAccessTokenProps,
} from './domain/personal-access-token.js';
export {
  kindFromFilename,
  SOURCE_FILE_KINDS,
  SourceFile,
  type SourceFileKind,
  type SourceFileProps,
} from './domain/source-file.js';
export { User, type UserProps } from './domain/user.js';
