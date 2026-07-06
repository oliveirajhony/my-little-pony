import {
  type AccessTokenGenerator,
  AuthenticatePersonalAccessToken,
  type Clock,
  type PersonalAccessTokenRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { ExploreModule } from '../explore/explore.module';
import { SearchModule } from '../search/search.module';
import { ACCESS_TOKEN_GENERATOR, CLOCK, PERSONAL_ACCESS_TOKEN_REPOSITORY } from '../tokens';
import { McpController } from './mcp.controller';
import { PatGuard } from './pat.guard';

// Streamable-HTTP MCP endpoint. Reuses SearchDocuments (SearchModule) and
// AnswerQuestion (ExploreModule); other use-cases are built from global ports.
@Module({
  imports: [SearchModule, ExploreModule],
  controllers: [McpController],
  providers: [
    PatGuard,
    {
      provide: AuthenticatePersonalAccessToken,
      inject: [PERSONAL_ACCESS_TOKEN_REPOSITORY, ACCESS_TOKEN_GENERATOR, CLOCK],
      useFactory: (
        repo: PersonalAccessTokenRepository,
        generator: AccessTokenGenerator,
        clock: Clock,
      ) => new AuthenticatePersonalAccessToken(repo, generator, clock),
    },
  ],
})
export class McpModule {}
