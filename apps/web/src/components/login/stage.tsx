import { ArrowRightIcon, PublishIcon, ShareIcon, WriteIcon } from '../icons';
import styles from './stage.module.css';

export function Stage() {
  return (
    <section className={styles.stage}>
      <div className={styles.glow} />

      {/* Placeholder do mascote — o pônei 3D (React Three Fiber) entra na próxima etapa. */}
      <div className={styles.orb} aria-hidden="true">
        <svg viewBox="0 0 200 200" className={styles.orbFace} aria-hidden="true">
          <ellipse cx="78" cy="94" rx="14" ry="18" fill="#fff" />
          <circle cx="80" cy="98" r="7" fill="#12203f" />
          <circle cx="76.5" cy="93" r="2.4" fill="#fff" />
          <ellipse cx="122" cy="94" rx="14" ry="18" fill="#fff" />
          <circle cx="120" cy="98" r="7" fill="#12203f" />
          <circle cx="116.5" cy="93" r="2.4" fill="#fff" />
          <ellipse cx="62" cy="116" rx="9" ry="6" fill="var(--blush)" opacity="0.5" />
          <ellipse cx="138" cy="116" rx="9" ry="6" fill="var(--blush)" opacity="0.5" />
          <path
            d="M86 122 Q100 132 114 122"
            stroke="#12203f"
            strokeWidth="3.5"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      <div className={styles.story}>
        <span className={styles.badge}>Open source · editor de documentos</span>
        <h2 className={styles.title}>
          Escreva livremente. <b>Publique com um link.</b>
        </h2>
        <div className={styles.steps}>
          <div className={styles.step}>
            <span className={styles.stepIc}>
              <WriteIcon />
            </span>
            Escreva
          </div>
          <span className={styles.arrow}>
            <ArrowRightIcon />
          </span>
          <div className={styles.step}>
            <span className={styles.stepIc}>
              <PublishIcon />
            </span>
            Publique
          </div>
          <span className={styles.arrow}>
            <ArrowRightIcon />
          </span>
          <div className={styles.step}>
            <span className={styles.stepIc}>
              <ShareIcon />
            </span>
            Compartilhe
          </div>
        </div>
      </div>
    </section>
  );
}
