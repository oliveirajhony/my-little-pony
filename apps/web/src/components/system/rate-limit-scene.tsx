'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { prefersReducedMotion } from '../../lib/prefers-reduced-motion';
import { ErrorScene } from './error-scene';

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  /** Seconds until the user may retry (maps to a Retry-After header). */
  retryAfter?: number;
  onRetry?: () => void;
};

/**
 * 429 / rate-limit screen. Reusable: drop it into an API-error boundary or
 * render it when a 429 response is caught. No backend exists yet, so it's also
 * previewable on its own. The depleting ring IS the timer.
 */
export function RateLimitScene({ retryAfter = 20, onRetry }: Props) {
  const [remaining, setRemaining] = useState(retryAfter);
  const ring = useRef<SVGCircleElement>(null);

  // Count down from a fixed target so backgrounding the tab doesn't drift.
  useEffect(() => {
    const target = Date.now() + retryAfter * 1000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [retryAfter]);

  // Deplete the ring over the countdown.
  useEffect(() => {
    const el = ring.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      gsap.set(el, { strokeDashoffset: 0 });
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { strokeDashoffset: 0 },
        { strokeDashoffset: CIRCUMFERENCE, duration: retryAfter, ease: 'none' },
      );
    });
    return () => ctx.revert();
  }, [retryAfter]);

  const ready = remaining <= 0;

  return (
    <ErrorScene
      code="429"
      srTitle="Muitas requisições"
      title="Vamos com calma"
      subtitle="Você fez muitas ações em pouco tempo. Espere um instante e tente de novo — sem pressa."
      actions={
        <Button disabled={!ready} onClick={onRetry}>
          {ready ? 'Tentar de novo' : 'Aguarde…'}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-2">
        <div className="relative size-28">
          <svg viewBox="0 0 110 110" className="size-full -rotate-90" aria-hidden>
            <title>Contagem regressiva</title>
            <circle cx="55" cy="55" r={RADIUS} fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              ref={ring}
              cx="55"
              cy="55"
              r={RADIUS}
              fill="none"
              stroke="#e8a33d"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={0}
            />
          </svg>
          <span className="absolute inset-0 grid place-items-center font-mono text-2xl tabular-nums">
            {remaining}
          </span>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {ready ? 'Pronto — pode tentar de novo' : `Tente novamente em ${remaining}s`}
        </p>
      </div>
    </ErrorScene>
  );
}
