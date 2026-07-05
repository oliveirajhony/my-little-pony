'use client';

import { RateLimitScene } from '../../../components/system/rate-limit-scene';

export default function RateLimitPreview() {
  return <RateLimitScene retryAfter={15} onRetry={() => window.location.reload()} />;
}
