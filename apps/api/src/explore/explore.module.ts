import {
  type AnswerGateway,
  AnswerQuestion,
  type DocumentRepository,
  type SourceFileRepository,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { ANSWER_GATEWAY, DOCUMENT_REPOSITORY, SOURCE_FILE_REPOSITORY } from '../tokens';
import { ExploreController } from './explore.controller';
import { HttpAnswerGateway } from './http-answer.gateway';

@Module({
  controllers: [ExploreController],
  providers: [
    {
      provide: ANSWER_GATEWAY,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new HttpAnswerGateway(config.searchServiceUrl, config.searchServiceToken),
    },
    {
      provide: AnswerQuestion,
      inject: [ANSWER_GATEWAY, DOCUMENT_REPOSITORY, SOURCE_FILE_REPOSITORY],
      useFactory: (
        gateway: AnswerGateway,
        documents: DocumentRepository,
        files: SourceFileRepository,
      ) => new AnswerQuestion(gateway, documents, files),
    },
  ],
  exports: [AnswerQuestion],
})
export class ExploreModule {}
