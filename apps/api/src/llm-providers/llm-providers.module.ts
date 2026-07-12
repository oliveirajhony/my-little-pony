import {
  ActivateLlmProvider,
  AddLlmProvider,
  type Clock,
  type Encryptor,
  type IdGenerator,
  ListLlmProviders,
  type LlmProviderRepository,
  RemoveLlmProvider,
  ResolveActiveLlmConfig,
} from '@my-little-pony/core';
import { Module } from '@nestjs/common';
import { APP_CONFIG } from '../config/config.module';
import type { AppConfig } from '../config/env.schema';
import { AesGcmEncryptor } from '../crypto/aes-gcm-encryptor';
import { CLOCK, ENCRYPTOR, ID_GENERATOR, LLM_PROVIDER_REPOSITORY } from '../tokens';
import { LlmProvidersController } from './llm-providers.controller';

@Module({
  controllers: [LlmProvidersController],
  providers: [
    {
      provide: ENCRYPTOR,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => new AesGcmEncryptor(config.providerKeyEncryptionKey),
    },
    {
      provide: ListLlmProviders,
      inject: [LLM_PROVIDER_REPOSITORY],
      useFactory: (repo: LlmProviderRepository) => new ListLlmProviders(repo),
    },
    {
      provide: AddLlmProvider,
      inject: [LLM_PROVIDER_REPOSITORY, ID_GENERATOR, CLOCK, ENCRYPTOR],
      useFactory: (repo: LlmProviderRepository, ids: IdGenerator, clock: Clock, enc: Encryptor) =>
        new AddLlmProvider(repo, ids, clock, enc),
    },
    {
      provide: ActivateLlmProvider,
      inject: [LLM_PROVIDER_REPOSITORY],
      useFactory: (repo: LlmProviderRepository) => new ActivateLlmProvider(repo),
    },
    {
      provide: RemoveLlmProvider,
      inject: [LLM_PROVIDER_REPOSITORY],
      useFactory: (repo: LlmProviderRepository) => new RemoveLlmProvider(repo),
    },
    {
      provide: ResolveActiveLlmConfig,
      inject: [LLM_PROVIDER_REPOSITORY, ENCRYPTOR],
      useFactory: (repo: LlmProviderRepository, enc: Encryptor) =>
        new ResolveActiveLlmConfig(repo, enc),
    },
  ],
  // Exportado para o Explorar resolver o provedor ativo e passar na geração.
  exports: [ResolveActiveLlmConfig],
})
export class LlmProvidersModule {}
