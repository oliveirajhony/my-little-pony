'use client';

import gsap from 'gsap';
import { useEffect, useRef, useState } from 'react';
import { eyesShouldClose, useLoginUi } from '../../lib/login-ui-store';
import styles from './mascot.module.css';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function Mascot() {
  const mascotRef = useRef<HTMLDivElement>(null);
  const pupilsRef = useRef<SVGGElement>(null);

  const focusedField = useLoginUi((s) => s.focusedField);
  const passwordVisible = useLoginUi((s) => s.passwordVisible);
  const reaction = useLoginUi((s) => s.reaction);
  const reactionNonce = useLoginUi((s) => s.reactionNonce);

  const closed = eyesShouldClose(focusedField, passwordVisible);
  const [blinking, setBlinking] = useState(false);
  const [happy, setHappy] = useState(false);

  // Latest gaze-blocking state, read inside the once-bound pointer handler.
  const gazeBlocked = useRef(false);
  gazeBlocked.current = closed || happy;

  // Eyes follow the pointer.
  useEffect(() => {
    const group = pupilsRef.current;
    if (!group || prefersReducedMotion()) return;

    const xTo = gsap.quickTo(group, 'x', { duration: 0.3, ease: 'power3' });
    const yTo = gsap.quickTo(group, 'y', { duration: 0.3, ease: 'power3' });

    function onMove(event: PointerEvent) {
      const el = mascotRef.current;
      if (!el || gazeBlocked.current) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height * 0.42;
      const dx = Math.max(-1, Math.min(1, (event.clientX - cx) / (rect.width * 0.7)));
      const dy = Math.max(-1, Math.min(1, (event.clientY - cy) / (rect.height * 0.7)));
      xTo(dx * 7);
      yTo(dy * 7);
    }

    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Recenter the pupils when the eyes shut or celebrate.
  useEffect(() => {
    const group = pupilsRef.current;
    if (group && (closed || happy)) {
      gsap.to(group, { x: 0, y: 0, duration: 0.2, ease: 'power2' });
    }
  }, [closed, happy]);

  // Idle blink.
  useEffect(() => {
    const id = setInterval(() => {
      if (gazeBlocked.current) return;
      setBlinking(true);
      setTimeout(() => setBlinking(false), 140);
    }, 4200);
    return () => clearInterval(id);
  }, []);

  // Reactions: shake on error, magic hop on success.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reactionNonce retriggers the effect on repeat reactions
  useEffect(() => {
    if (reaction === 'idle') return;
    const el = mascotRef.current;
    if (!el || prefersReducedMotion()) {
      if (reaction === 'success') {
        setHappy(true);
        const t = setTimeout(() => setHappy(false), 1400);
        return () => clearTimeout(t);
      }
      return;
    }

    if (reaction === 'error') {
      gsap.set(el, { transformOrigin: '50% 62%' });
      gsap
        .timeline({ defaults: { duration: 0.07, ease: 'power1.inOut' } })
        .to(el, { rotation: -9 })
        .to(el, { rotation: 8 })
        .to(el, { rotation: -7 })
        .to(el, { rotation: 6 })
        .to(el, { rotation: -3 })
        .to(el, { rotation: 0 });
      return;
    }

    // success
    setHappy(true);
    gsap.set(el, { transformOrigin: '50% 70%' });
    gsap
      .timeline()
      .fromTo(
        el,
        { y: 0, rotation: 0, scale: 1 },
        { y: -34, rotation: -6, scale: 1.05, duration: 0.34, ease: 'back.out(2)' },
      )
      .to(el, { y: 0, rotation: 0, scale: 1, duration: 0.5, ease: 'power2.out' });
    const t = setTimeout(() => setHappy(false), 1400);
    return () => clearTimeout(t);
  }, [reaction, reactionNonce]);

  const rootClass = [
    styles.mascot,
    closed ? styles.closed : '',
    blinking ? styles.blink : '',
    happy ? styles.happy : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={mascotRef} className={rootClass}>
      <svg viewBox="0 0 260 300" role="img" aria-label="Mascote do my-little-pony">
        <title>Mascote do my-little-pony</title>
        <defs>
          <radialGradient id="mascotBody" cx="42%" cy="32%" r="74%">
            <stop offset="0%" stopColor="#cdd8ff" />
            <stop offset="68%" stopColor="#97a8ff" />
            <stop offset="100%" stopColor="#5f71d6" />
          </radialGradient>
          <linearGradient id="mascotMane" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6a8bff" />
            <stop offset="50%" stopColor="#4ac8ff" />
            <stop offset="100%" stopColor="#9d6bff" />
          </linearGradient>
        </defs>

        <ellipse cx="130" cy="272" rx="70" ry="12" fill="#465ab4" opacity="0.16" />

        {/* cauda */}
        <path
          d="M60 210 C18 200 12 258 40 288 C24 256 56 232 82 244 C40 260 46 300 78 302 C56 276 88 256 108 258 Z"
          fill="url(#mascotMane)"
          opacity="0.94"
        />

        {/* patas */}
        <g fill="#97a8ff" stroke="#5f71d6" strokeWidth="3">
          <rect x="98" y="232" width="24" height="46" rx="12" />
          <rect x="138" y="232" width="24" height="46" rx="12" />
        </g>
        <g fill="#b6c2ff">
          <rect x="98" y="266" width="24" height="13" rx="6" />
          <rect x="138" y="266" width="24" height="13" rx="6" />
        </g>

        {/* corpo */}
        <ellipse cx="130" cy="200" rx="82" ry="58" fill="url(#mascotBody)" />
        <ellipse cx="104" cy="180" rx="40" ry="26" fill="#ffffff" opacity="0.22" />

        {/* crina de trás */}
        <path
          d="M92 96 C64 78 62 42 92 32 C74 24 92 -2 118 12 C106 -2 138 -8 145 18 C147 2 175 4 171 30 C189 24 196 52 179 62 C193 72 184 100 160 98 Z"
          fill="url(#mascotMane)"
          opacity="0.92"
        />

        {/* chifre */}
        <path
          d="M130 42 L121 10 L130 -6 L139 10 Z"
          fill="#eaf1ff"
          stroke="#aebbe8"
          strokeWidth="2"
        />

        {/* orelhas */}
        <path d="M78 74 L68 44 L100 62 Z" fill="#97a8ff" />
        <path d="M182 74 L192 44 L160 62 Z" fill="#97a8ff" />

        <g className={styles.face}>
          {/* rosto */}
          <ellipse cx="130" cy="118" rx="70" ry="66" fill="url(#mascotBody)" />
          <ellipse cx="130" cy="150" rx="40" ry="28" fill="#ffffff" opacity="0.18" />
          <circle cx="116" cy="156" r="3" fill="#8090c0" opacity="0.6" />
          <circle cx="144" cy="156" r="3" fill="#8090c0" opacity="0.6" />

          {/* blush */}
          <ellipse className={styles.blush} cx="88" cy="140" rx="14" ry="9" fill="#ff9bb0" />
          <ellipse className={styles.blush} cx="172" cy="140" rx="14" ry="9" fill="#ff9bb0" />

          {/* olhos abertos */}
          <g className={styles.eyesOpen}>
            <ellipse cx="106" cy="116" rx="18" ry="23" fill="#fff" />
            <ellipse cx="154" cy="116" rx="18" ry="23" fill="#fff" />
            <g ref={pupilsRef}>
              <circle cx="106" cy="120" r="10.5" fill="#1a2a52" />
              <circle cx="101" cy="113" r="3.6" fill="#fff" />
              <circle cx="154" cy="120" r="10.5" fill="#1a2a52" />
              <circle cx="149" cy="113" r="3.6" fill="#fff" />
            </g>
          </g>

          {/* olhos fechados (senha) */}
          <g
            className={styles.eyesClosed}
            fill="none"
            stroke="#1a2a52"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <path d="M90 122 Q106 108 122 122" />
            <path d="M138 122 Q154 108 170 122" />
          </g>

          {/* olhos felizes (sucesso) */}
          <g
            className={styles.eyesHappy}
            fill="none"
            stroke="#1a2a52"
            strokeWidth="5"
            strokeLinecap="round"
          >
            <path d="M90 124 Q106 106 122 124" />
            <path d="M138 124 Q154 106 170 124" />
          </g>

          {/* sorriso */}
          <path
            d="M116 164 Q130 176 144 164"
            stroke="#1a2a52"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            opacity="0.62"
          />
        </g>

        {/* topete */}
        <path
          d="M96 60 C96 24 132 22 140 48 C146 24 178 30 172 62 C160 48 148 58 141 68 C132 52 112 52 106 68 C102 60 98 58 96 60 Z"
          fill="url(#mascotMane)"
        />
      </svg>
    </div>
  );
}
