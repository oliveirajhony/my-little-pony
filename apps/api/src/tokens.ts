// Nest injection tokens for the framework-free ports declared in @my-little-pony/core.
export const USER_REPOSITORY = Symbol('UserRepository');
export const DOCUMENT_REPOSITORY = Symbol('DocumentRepository');
export const CONTACT_MESSAGE_REPOSITORY = Symbol('ContactMessageRepository');
export const EVENT_PUBLISHER = Symbol('EventPublisher');
export const CACHE_STORE = Symbol('CacheStore');
export const SEARCH_GATEWAY = Symbol('SearchGateway');
export const PASSWORD_HASHER = Symbol('PasswordHasher');
export const TOKEN_SERVICE = Symbol('TokenService');
export const REFRESH_TOKEN_STORE = Symbol('RefreshTokenStore');
export const ID_GENERATOR = Symbol('IdGenerator');
export const CLOCK = Symbol('Clock');
export const AVATAR_STORAGE = Symbol('AvatarStorage');
export const PDF_RENDERER = Symbol('PdfRenderer');
export const DOCUMENT_PDF_STORAGE = Symbol('DocumentPdfStorage');
export const EMAIL_SENDER = Symbol('EmailSender');
