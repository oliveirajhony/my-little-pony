import { Module } from '@nestjs/common';
import { InternalController } from './internal.controller';

// Service-to-service endpoints consumed by the Python indexing service.
@Module({
  controllers: [InternalController],
})
export class InternalModule {}
