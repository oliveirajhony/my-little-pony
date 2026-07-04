import Link from 'next/link';
import { ThemeToggle } from '../components/theme-toggle';
import styles from './page.module.css';

export default function HomePage() {
  return (
    <main className={styles.home}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.mark}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" aria-hidden="true">
              <path d="M4 4h11l5 5v11H4z" />
              <path d="M15 4v5h5" />
              <path d="M8 13h8M8 17h5" />
            </svg>
          </span>
          <span className={styles.name}>my-little-pony</span>
        </div>

        <h1 className={styles.title}>
          Escreva livremente. <b>Publique com um link.</b>
        </h1>
        <p className={styles.sub}>
          Editor de documentos open-source. A fundação, o design system e o tema já estão de pé — a
          tela de login vem a seguir.
        </p>

        <ThemeToggle />

        <div className={styles.actions}>
          <Link className={styles.link} href="/design-system">
            Ver o design system
          </Link>
        </div>
      </div>
    </main>
  );
}
