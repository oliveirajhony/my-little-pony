import {
  type AccessTokenGenerator,
  AuthenticatePersonalAccessToken,
  type Clock,
  type PersonalAccessTokenRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { SearchModule } from '../search/search.module';
import { ACCESS_TOKEN_GENERATOR, CLOCK, PERSONAL_ACCESS_TOKEN_REPOSITORY } from '../tokens';
import { McpController } from './mcp.controller';
import { PatGuard } from './pat.guard';

// Streamable-HTTP MCP endpoint. Reuses SearchDocuments from SearchModule; every
// other use-case is built from the global ports inside the controller.
@Module({
  imports: [SearchModule],
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
