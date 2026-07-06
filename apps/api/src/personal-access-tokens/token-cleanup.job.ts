import { PurgeExpiredTokens } from '@my-little-pony/core';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Driving adapter: runs the PurgeExpiredTokens use-case on a daily schedule.
 * Security doesn't depend on this (isActive() rejects expired tokens at auth
 * time) — this only removes the dead rows. Delete is idempotent, so it is safe
 * to run on every node.
 */
@Injectable()
export class TokenCleanupJob {
  private readonly logger = new Logger(TokenCleanupJob.name);

  constructor(private readonly purge: PurgeExpiredTokens) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async run(): Promise<void> {
    const removed = await this.purge.execute();
    if (removed > 0) this.logger.log(`purged ${removed} expired access token(s)`);
  }
}
