import {
  type AccessTokenGenerator,
  type Clock,
  CreatePersonalAccessToken,
  type IdGenerator,
  ListPersonalAccessTokens,
  type PersonalAccessTokenRepository,
  PurgeExpiredTokens,
  RevokePersonalAccessToken,
  UpdatePersonalAccessToken,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import {
  ACCESS_TOKEN_GENERATOR,
  CLOCK,
  ID_GENERATOR,
  PERSONAL_ACCESS_TOKEN_REPOSITORY,
} from '../tokens';
import { PersonalAccessTokensController } from './pat.controller';
import { TokenCleanupJob } from './token-cleanup.job';

@Module({
  controllers: [PersonalAccessTokensController],
  providers: [
    {
      provide: CreatePersonalAccessToken,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY, ACCESS_TOKEN_GENERATOR, ID_GENERATOR, CLOCK],
      useFactory: (
        repo: PersonalAccessTokenRepository,
        generator: AccessTokenGenerator,
        ids: IdGenerator,
        clock: Clock,
      ) => new CreatePersonalAccessToken(repo, generator, ids, clock),
    },
    {
      provide: ListPersonalAccessTokens,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY],
      useFactory: (repo: PersonalAccessTokenRepository) => new ListPersonalAccessTokens(repo),
    },
    {
      provide: UpdatePersonalAccessToken,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY],
      useFactory: (repo: PersonalAccessTokenRepository) => new UpdatePersonalAccessToken(repo),
    },
    {
      provide: RevokePersonalAccessToken,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY, CLOCK],
      useFactory: (repo: PersonalAccessTokenRepository, clock: Clock) =>
        new RevokePersonalAccessToken(repo, clock),
    },
    {
      provide: PurgeExpiredTokens,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY, CLOCK],
      useFactory: (repo: PersonalAccessTokenRepository, clock: Clock) =>
        new PurgeExpiredTokens(repo, clock),
    },
    TokenCleanupJob,
  ],
})
export class PersonalAccessTokensModule {}
