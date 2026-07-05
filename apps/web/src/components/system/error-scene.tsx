'use client';

import gsap from 'gsap';
import { type ReactNode, useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../lib/prefers-reduced-motion';

export type ErrorCode = '404' | '500' | '429';

// Aura hue per state — blue = lost-but-safe, red = our fault, amber = slow down.
// Amber is an ambient-only accent; it never touches text or controls.
const AURA: Record<ErrorCode, string> = {
  '404': 'var(--primary)',
  '500': 'var(--destructive)',
  '429': '#e8a33d',
};

// Fixed positions (no Math.random) so server and client markup match — the drift
// is added later by GSAP, which only runs on the client.
const FRAGMENTS = [
  { left: '12%', top: '22%', size: 78, rotate: -8 },
  { left: '80%', top: '18%', size: 56, rotate: 10 },
  { left: '22%', top: '72%', size: 64, rotate: 6 },
  { left: '72%', top: '68%', size: 88, rotate: -5 },
  { left: '50%', top: '86%', size: 48, rotate: 12 },
];

type Props = {
  code: ErrorCode;
  title: string;
  subtitle: ReactNode;
  /** Announced to screen readers in place of the decorative numeral. */
  srTitle: string;
  actions?: ReactNode;
  /** Extra content between subtitle and actions (e.g. a countdown). */
  children?: ReactNode;
  /** Tiny footnote under the actions (e.g. an error id). */
  meta?: ReactNode;
  /** Full-bleed overlay on top of the scene (e.g. the 500 reset sweep). */
  overlay?: ReactNode;
};

export function ErrorScene({
  code,
  title,
  subtitle,
  srTitle,
  actions,
  children,
  meta,
  overlay,
}: Props) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.set('[data-anim]', { opacity: 1, clearProps: 'all' });
        return;
      }

      gsap
        .timeline({ defaults: { ease: 'power3.out' } })
        .from('.es-numeral', { yPercent: 8, opacity: 0, filter: 'blur(12px)', duration: 0.9 })
        .from('.es-title', { y: 16, opacity: 0, duration: 0.6 }, '-=0.5')
        .from('.es-subtitle', { y: 14, opacity: 0, duration: 0.6 }, '-=0.45')
        .from('.es-extra', { y: 12, opacity: 0, duration: 0.5 }, '-=0.4')
        .from('.es-actions > *', { y: 12, opacity: 0, duration: 0.5, stagger: 0.08 }, '-=0.35');

      gsap.to('.es-aura', {
        scale: 1.06,
        opacity: '+=0.06',
        duration: 8,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray<HTMLElement>('.es-fragment').forEach((frag, i) => {
        gsap.to(frag, {
          x: gsap.utils.random(-40, 40),
          y: gsap.utils.random(-60, 60),
          rotation: `+=${gsap.utils.random(-8, 8)}`,
          duration: gsap.utils.random(18, 26),
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          delay: i * 0.6,
        });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={root}
      className="relative grid min-h-svh place-items-center overflow-hidden bg-background px-6 py-16"
    >
      {/* Ambient substrate: aura + drifting document fragments. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="es-aura absolute left-1/2 top-[38%] size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-30 blur-[80px] dark:opacity-50"
          style={{ background: AURA[code] }}
        />
        {FRAGMENTS.map((f) => (
          <div
            key={`${f.left}-${f.top}`}
            className="es-fragment absolute rounded-md border border-border bg-card opacity-25 blur-[0.5px]"
            style={{
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size * 0.72,
              transform: `rotate(${f.rotate}deg)`,
            }}
          >
            <div className="mx-2 mt-2.5 h-1 rounded bg-muted-foreground/30" />
            <div className="mx-2 mt-1.5 h-1 w-2/3 rounded bg-muted-foreground/20" />
            <div className="mx-2 mt-1.5 h-1 w-4/5 rounded bg-muted-foreground/20" />
          </div>
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-[34rem] flex-col items-center text-center">
        <span
          aria-hidden
          data-anim
          className="es-numeral font-mono font-semibold tabular-nums leading-none tracking-[-0.04em] text-[clamp(6rem,22vw,13rem)]"
          style={{ color: 'color-mix(in oklab, var(--foreground) 9%, transparent)' }}
        >
          {code}
        </span>
        <h1 className="sr-only">{srTitle}</h1>

        <p
          data-anim
          className="es-title -mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {title}
        </p>
        <div
          data-anim
          className="es-subtitle mx-auto mt-3 max-w-prose text-[15px] leading-relaxed text-muted-foreground"
        >
          {subtitle}
        </div>

        {children && (
          <div data-anim className="es-extra mt-6">
            {children}
          </div>
        )}

        {actions && (
          <div data-anim className="es-actions mt-8 flex flex-wrap justify-center gap-3">
            {actions}
          </div>
        )}

        {meta && <div className="mt-6 font-mono text-xs text-muted-foreground">{meta}</div>}
      </div>

      {overlay}
    </div>
  );
}
