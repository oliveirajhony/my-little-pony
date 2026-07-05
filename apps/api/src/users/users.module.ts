import {
  ChangePassword,
  type Clock,
  GetProfile,
  type PasswordHasher,
  type RefreshTokenStore,
  UpdateProfile,
  type UserRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CLOCK, PASSWORD_HASHER, REFRESH_TOKEN_STORE, USER_REPOSITORY } from '../tokens';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController],
  providers: [
    {
      provide: GetProfile,
      inject: [USER_REPOSITORY],
      useFactory: (users: UserRepository) => new GetProfile(users),
    },
    {
      provide: UpdateProfile,
      inject: [USER_REPOSITORY, CLOCK],
      useFactory: (users: UserRepository, clock: Clock) => new UpdateProfile(users, clock),
    },
    {
      provide: ChangePassword,
      inject: [USER_REPOSITORY, PASSWORD_HASHER, CLOCK, REFRESH_TOKEN_STORE],
      useFactory: (
        users: UserRepository,
        hasher: PasswordHasher,
        clock: Clock,
        store: RefreshTokenStore,
      ) => new ChangePassword(users, hasher, clock, store),
    },
  ],
})
export class UsersModule {}
