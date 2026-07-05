import {
  AuthenticateUser,
  type Clock,
  type IdGenerator,
  Logout,
  type PasswordHasher,
  RefreshSession,
  RegisterUser,
  SessionIssuer,
  type UserRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CLOCK, ID_GENERATOR, PASSWORD_HASHER, USER_REPOSITORY } from '../tokens';
import { AuthController } from './auth.controller';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: RegisterUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, ID_GENERATOR, CLOCK, SessionIssuer],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        ids: IdGenerator,
        clock: Clock,
        session: SessionIssuer,
      ) => new RegisterUser(users, hasher, ids, clock, session),
    },
    {
      provide: AuthenticateUser,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, SessionIssuer],
      useFactory: (users: UserRepository, hasher: PasswordHasher, session: SessionIssuer) =>
        new AuthenticateUser(users, hasher, session),
    },
    {
      provide: RefreshSession,
      inject: [SessionIssuer],
      useFactory: (session: SessionIssuer) => new RefreshSession(session),
    },
    {
      provide: Logout,
      inject: [SessionIssuer],
      useFactory: (session: SessionIssuer) => new Logout(session),
    },
  ],
})
export class AuthModule {}
