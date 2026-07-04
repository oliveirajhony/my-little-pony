import { ArrowRightIcon, PublishIcon, ShareIcon, WriteIcon } from '../icons';
import { Mascot } from './mascot';
import styles from './stage.module.css';

export function Stage() {
  return (
    <section className={styles.stage}>
      <div className={styles.glow} />

      <Mascot />

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
