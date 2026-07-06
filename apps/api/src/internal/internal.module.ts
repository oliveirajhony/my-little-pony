import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';
import { InternalSourceFilesController } from './internal-source-files.controller';

// Service-to-service endpoints consumed by the Python indexing service.
@Module({
  controllers: [InternalController, InternalSourceFilesController],
})
export class InternalModule {}
