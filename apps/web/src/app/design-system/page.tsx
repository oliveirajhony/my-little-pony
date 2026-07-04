import type { CSSProperties } from 'react';
import { ThemeToggle } from '../../components/theme-toggle';
import styles from './design-system.module.css';

export const metadata = {
  title: 'Design System · my-little-pony',
};

const COLORS: { group: string; items: { name: string; value: string; note?: string }[] }[] = [
  {
    group: 'Azul (ação)',
    items: [
      { name: 'blue', value: 'var(--blue)', note: 'ação' },
      { name: 'blue-strong', value: 'var(--blue-strong)', note: 'hover' },
      { name: 'blue-deep', value: 'var(--blue-deep)', note: 'gradiente' },
      { name: 'blue-050', value: 'var(--blue-050)', note: 'tint' },
    ],
  },
  {
    group: 'Pônei',
    items: [
      { name: 'peri-1', value: 'var(--peri-1)', note: 'corpo claro' },
      { name: 'peri-2', value: 'var(--peri-2)', note: 'corpo médio' },
      { name: 'peri-deep', value: 'var(--peri-deep)', note: 'sombra' },
      { name: 'mane-1', value: 'var(--mane-1)', note: 'crina' },
      { name: 'mane-2', value: 'var(--mane-2)', note: 'crina' },
      { name: 'mane-3', value: 'var(--mane-3)', note: 'crina' },
      { name: 'horn', value: 'var(--horn)', note: 'chifre' },
      { name: 'hoof', value: 'var(--hoof)', note: 'casco' },
    ],
  },
  {
    group: 'Neutros & semânticos',
    items: [
      { name: 'ink', value: 'var(--ink)', note: 'texto' },
      { name: 'ink-2', value: 'var(--ink-2)', note: 'texto 2' },
      { name: 'blush', value: 'var(--blush)', note: 'rubor' },
      { name: 'success', value: 'var(--success)', note: 'sucesso' },
      { name: 'error', value: 'var(--error)', note: 'erro' },
      { name: 'bg', value: 'linear-gradient(160deg, var(--bg-b), var(--bg-a))', note: 'fundo' },
    ],
  },
];

const TYPE = [
  { tag: 'Display · Poppins 600 · 40', cls: 'd40', sample: 'Bem-vindo de volta' },
  { tag: 'H1 · Poppins 600 · 30', cls: 'd30', sample: 'Bem-vindo de volta' },
  { tag: 'H2 · Poppins 600 · 24', cls: 'd24', sample: 'Entre na sua conta' },
  { tag: 'Subhead · Poppins 500 · 20', cls: 'd20', sample: 'Entre na sua conta' },
  { tag: 'Body · Inter 400 · 16', cls: 'b16', sample: 'Entre para continuar de onde parou.' },
  { tag: 'Input · Inter 400 · 15', cls: 'b15', sample: 'demo@mlp.app' },
  { tag: 'Label · Poppins 500 · 13', cls: 'l13', sample: 'E-mail' },
  { tag: 'Caption · Inter 400 · 12.5', cls: 'c12', sample: 'Demo — use demo@mlp.app e 123456' },
] as const;

const SPACING = [
  ['sp-1', 4],
  ['sp-2', 8],
  ['sp-3', 12],
  ['sp-4', 16],
  ['sp-5', 20],
  ['sp-6', 24],
  ['sp-8', 32],
  ['sp-10', 40],
  ['sp-12', 48],
  ['sp-16', 64],
] as const;

const RADII = [
  ['sm · 10', 'var(--r-sm)'],
  ['md · 14', 'var(--r-md)'],
  ['lg · 20', 'var(--r-lg)'],
  ['xl · 28', 'var(--r-xl)'],
  ['pill', 'var(--r-pill)'],
] as const;

const TYPE_STYLE: Record<string, CSSProperties> = {
  d40: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 40,
    letterSpacing: '-0.03em',
  },
  d30: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 30,
    letterSpacing: '-0.025em',
  },
  d24: {
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 24,
    letterSpacing: '-0.02em',
  },
  d20: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 20 },
  b16: { fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 16 },
  b15: { fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 15 },
  l13: { fontFamily: 'var(--font-display)', fontWeight: 500, fontSize: 13 },
  c12: { fontFamily: 'var(--font-body)', fontWeight: 400, fontSize: 12.5, color: 'var(--ink-2)' },
};

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M5 12l5 5L20 6" />
    </svg>
  );
}

export default function DesignSystemPage() {
  return (
    <div className={styles.page}>
      <div className={styles.toggleFixed}>
        <ThemeToggle />
      </div>

      <div className={styles.wrap}>
        <header>
          <h1 className={styles.display}>Design System</h1>
          <p className={styles.lede}>
            Os tokens que definem a cara do my-little-pony, vivos no app. Alterne o tema no canto
            para ver claro/escuro/sistema. Fonte de verdade: <code>src/styles/tokens.css</code>.
          </p>
        </header>

        {/* Cores */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>01 · Cores</p>
          <p className={styles.sectionDesc}>Os valores mudam entre claro e escuro.</p>
          <div className={styles.panel}>
            {COLORS.map((group) => (
              <div
                key={group.group}
                style={{ marginTop: group.group !== COLORS[0].group ? 24 : 0 }}
              >
                <p className={styles.sectionDesc} style={{ margin: '0 0 12px', fontWeight: 600 }}>
                  {group.group}
                </p>
                <div className={styles.swatchGrid}>
                  {group.items.map((c) => (
                    <div key={c.name} className={styles.swatch}>
                      <div className={styles.swatchChip} style={{ background: c.value }} />
                      <div className={styles.swatchMeta}>
                        <div className={styles.swatchName}>{c.name}</div>
                        <div className={styles.swatchHex}>{c.note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Tipografia */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>02 · Tipografia</p>
          <p className={styles.sectionDesc}>
            Poppins para títulos, botões e labels. Inter para inputs, corpo e dados.
          </p>
          <div className={styles.panel}>
            {TYPE.map((t) => (
              <div key={t.tag} className={styles.typeRow}>
                <span className={styles.typeTag}>{t.tag}</span>
                <span style={TYPE_STYLE[t.cls]}>{t.sample}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Espaçamento */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>03 · Espaçamento</p>
          <p className={styles.sectionDesc}>Escala base 4px.</p>
          <div className={styles.panel}>
            {SPACING.map(([name, px]) => (
              <div key={name} className={styles.spaceRow}>
                <span className={styles.spaceTag}>
                  {name} · {px}
                </span>
                <span className={styles.spaceBar} style={{ width: px }} />
              </div>
            ))}
          </div>
        </section>

        {/* Raios */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>04 · Raios</p>
          <p className={styles.sectionDesc}>Do input ao card.</p>
          <div className={styles.panel}>
            <div className={styles.radii}>
              {RADII.map(([label, value]) => (
                <div key={label} className={styles.radiiBox} style={{ borderRadius: value }}>
                  {label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Elevação */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>05 · Sombras / Elevação</p>
          <p className={styles.sectionDesc}>Três níveis suaves azulados.</p>
          <div className={styles.panel}>
            <div className={styles.elevs}>
              <div className={styles.elev} style={{ boxShadow: 'var(--e1)' }}>
                e1 · sutil
              </div>
              <div className={styles.elev} style={{ boxShadow: 'var(--e2)' }}>
                e2 · card
              </div>
              <div className={styles.elev} style={{ boxShadow: 'var(--e3)' }}>
                e3 · destaque
              </div>
            </div>
          </div>
        </section>

        {/* Vidro */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>06 · Vidro / Blur</p>
          <p className={styles.sectionDesc}>
            backdrop-filter: blur + saturate — o material do card de login.
          </p>
          <div className={styles.glassBg}>
            <div className={styles.glassCard}>
              <strong style={{ fontFamily: 'var(--font-display)' }}>glass</strong>
              <p style={{ margin: '6px 0 0', fontSize: 14 }}>
                blur(26px) · saturate(150%) · borda translúcida · sombra em camadas
              </p>
            </div>
          </div>
        </section>

        {/* Movimento */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>07 · Movimento</p>
          <p className={styles.sectionDesc}>Durações: fast 140 · base 240 · slow 420. Easings:</p>
          <div className={styles.panel}>
            <div className={styles.motion}>
              <div className={styles.m1}>
                <div className={styles.track}>
                  <span className={styles.dot} />
                </div>
                <p className={styles.motionLabel}>ease · padrão</p>
              </div>
              <div className={styles.m2}>
                <div className={styles.track}>
                  <span className={styles.dot} />
                </div>
                <p className={styles.motionLabel}>ease-back · pops</p>
              </div>
              <div className={styles.m3}>
                <div className={styles.track}>
                  <span className={styles.dot} />
                </div>
                <p className={styles.motionLabel}>linear · loaders</p>
              </div>
            </div>
          </div>
        </section>

        {/* Componentes */}
        <section className={styles.section}>
          <p className={styles.sectionTitle}>08 · Componentes</p>
          <p className={styles.sectionDesc}>Os tokens aplicados.</p>
          <div className={styles.panel}>
            <div className={styles.comp}>
              <div>
                <span className={styles.label}>E-mail</span>
                <input className={styles.input} defaultValue="voce@exemplo.com" readOnly />
              </div>
              <div>
                <span className={styles.label}>Senha (foco)</span>
                <input
                  className={`${styles.input} ${styles.inputFocus}`}
                  type="password"
                  defaultValue="123456"
                  readOnly
                />
              </div>
              <span className={styles.chk}>
                <span className={styles.chkBox}>
                  <CheckIcon />
                </span>
                Manter conectado
              </span>
              <button type="button" className={styles.btn}>
                Entrar
              </button>
              <button type="button" className={`${styles.btn} ${styles.btnGhost}`}>
                Ação secundária
              </button>
              <a className={styles.link} href="/design-system">
                Esqueceu a senha?
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
