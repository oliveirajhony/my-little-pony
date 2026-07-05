'use client';

import gsap from 'gsap';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorScene } from '../components/system/error-scene';
import { prefersReducedMotion } from '../lib/prefers-reduced-motion';

export default function GlobalRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const sweep = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.error(error);
  }, [error]);

  function handleReset() {
    const el = sweep.current;
    if (!el || prefersReducedMotion()) {
      reset();
      return;
    }
    // A quick light-sweep "re-sync" before the boundary re-renders.
    gsap
      .timeline({ onComplete: reset })
      .set(el, { xPercent: -120, opacity: 1 })
      .to(el, { xPercent: 120, duration: 0.6, ease: 'power2.inOut' })
      .to(el, { opacity: 0, duration: 0.15 }, '-=0.1');
  }

  return (
    <ErrorScene
      code="500"
      srTitle="Erro inesperado"
      title="Algo saiu do lugar"
      subtitle="Um erro inesperado aconteceu do nosso lado. Já registramos o problema — tente novamente."
      actions={
        <>
          <Button onClick={handleReset}>Tentar de novo</Button>
          <Button asChild variant="ghost">
            <Link href="/app">Voltar para Documentos</Link>
          </Button>
        </>
      }
      meta={error.digest ? `id: ${error.digest}` : undefined}
      overlay={
        <div
          ref={sweep}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 opacity-0 blur-2xl"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary) 22%, transparent), transparent)',
          }}
        />
      }
    />
  );
}
