import {
  type Clock,
  DeleteSourceFile,
  GetSourceFileContent,
  type IdGenerator,
  ImportSourceFile,
  ListSourceFiles,
  type SourceFileRepository,
  type SourceFileStorage,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { CLOCK, ID_GENERATOR, SOURCE_FILE_REPOSITORY, SOURCE_FILE_STORAGE } from '../tokens';
import { SourceFilesController } from './source-files.controller';

@Module({
  controllers: [SourceFilesController],
  providers: [
    {
      provide: ImportSourceFile,
      inject: [SOURCE_FILE_REPOSITORY, SOURCE_FILE_STORAGE, ID_GENERATOR, CLOCK],
      useFactory: (
        repo: SourceFileRepository,
        storage: SourceFileStorage,
        ids: IdGenerator,
        clock: Clock,
      ) => new ImportSourceFile(repo, storage, ids, clock),
    },
    {
      provide: ListSourceFiles,
      inject: [SOURCE_FILE_REPOSITORY],
      useFactory: (repo: SourceFileRepository) => new ListSourceFiles(repo),
    },
    {
      provide: GetSourceFileContent,
      inject: [SOURCE_FILE_REPOSITORY, SOURCE_FILE_STORAGE],
      useFactory: (repo: SourceFileRepository, storage: SourceFileStorage) =>
        new GetSourceFileContent(repo, storage),
    },
    {
      provide: DeleteSourceFile,
      inject: [SOURCE_FILE_REPOSITORY, SOURCE_FILE_STORAGE],
      useFactory: (repo: SourceFileRepository, storage: SourceFileStorage) =>
        new DeleteSourceFile(repo, storage),
    },
  ],
})
export class SourceFilesModule {}
