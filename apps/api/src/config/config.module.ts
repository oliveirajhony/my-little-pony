import { Global, Module } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { type AppConfig, loadConfig } from './env.schema';

export const APP_CONFIG = Symbol('APP_CONFIG');

// Loads .env (dev) and validates the process environment ONCE at boot.
// Any failure here throws and aborts startup — fail fast.
@Global()
@Module({
  providers: [
    {
      provide: APP_CONFIG,
      useFactory: (): AppConfig => {
        dotenv.config();
        return loadConfig(process.env);
      },
    },
  ],
  exports: [APP_CONFIG],
})
export class ConfigModule {}
