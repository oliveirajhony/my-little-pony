import { randomUUID } from 'node:crypto';
import type { Clock, IdGenerator } from '@my-little-pony/core';

export class UuidIdGenerator implements IdGenerator {
  next(): string {
    return randomUUID();
  }
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
