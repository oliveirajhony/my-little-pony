import {
  type AvatarStorage,
  ChangePassword,
  type Clock,
  GetProfile,
  type PasswordHasher,
  type RefreshTokenStore,
  RemoveAvatar,
  SetAvatar,
  UpdateProfile,
  type UserRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import {
  AVATAR_STORAGE,
  CLOCK,
  PASSWORD_HASHER,
  REFRESH_TOKEN_STORE,
  USER_REPOSITORY,
} from '../tokens';
import { AvatarController } from './avatar.controller';
import { UsersController } from './users.controller';

@Module({
  controllers: [UsersController, AvatarController],
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
    {
      provide: SetAvatar,
      inject: [USER_REPOSITORY, AVATAR_STORAGE, CLOCK],
      useFactory: (users: UserRepository, storage: AvatarStorage, clock: Clock) =>
        new SetAvatar(users, storage, clock),
    },
    {
      provide: RemoveAvatar,
      inject: [USER_REPOSITORY, AVATAR_STORAGE, CLOCK],
      useFactory: (users: UserRepository, storage: AvatarStorage, clock: Clock) =>
        new RemoveAvatar(users, storage, clock),
    },
  ],
})
export class UsersModule {}
