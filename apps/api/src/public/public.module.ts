import { type CacheStore, type DocumentRepository, GetPublicDocument } from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CACHE_STORE, DOCUMENT_REPOSITORY } from '../tokens';
import { PublicController } from './public.controller';

const PUBLIC_CACHE_TTL_SECONDS = 60;

@Module({
  controllers: [PublicController],
  providers: [
    {
      provide: GetPublicDocument,
      inject: [DOCUMENT_REPOSITORY, CACHE_STORE],
      useFactory: (repo: DocumentRepository, cache: CacheStore) =>
        new GetPublicDocument(repo, cache, PUBLIC_CACHE_TTL_SECONDS),
    },
  ],
})
export class PublicModule {}
