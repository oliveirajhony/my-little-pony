import {
  type DocumentRepository,
  SearchDocuments,
  type SearchGateway,
  type SourceFileRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { DOCUMENT_REPOSITORY, SEARCH_GATEWAY, SOURCE_FILE_REPOSITORY } from '../tokens';
import { HttpSearchGateway } from './http-search.gateway';
import { SearchController } from './search.controller';

@Module({
  controllers: [SearchController],
  providers: [
    {
      provide: SEARCH_GATEWAY,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new HttpSearchGateway(
          config.searchServiceUrl,
          config.searchServiceToken,
          config.searchServiceTimeoutMs,
        ),
    },
    {
      provide: SearchDocuments,
      inject: [SEARCH_GATEWAY, DOCUMENT_REPOSITORY, SOURCE_FILE_REPOSITORY],
      useFactory: (
        gateway: SearchGateway,
        documents: DocumentRepository,
        files: SourceFileRepository,
      ) => new SearchDocuments(gateway, documents, files),
    },
  ],
  exports: [SearchDocuments],
})
export class SearchModule {}
