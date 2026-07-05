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
export type {
  AvatarStorage,
  Clock,
  IdGenerator,
  PasswordHasher,
  RefreshTokenStore,
  StoredAvatar,
  TokenService,
  UserRepository,
} from './application/ports.js';
export {
  ChangePassword,
  GetProfile,
  UpdateProfile,
} from './application/profile-use-cases.js';
export { DomainError, type DomainErrorCode } from './domain/errors.js';
export { User, type UserProps } from './domain/user.js';
