import { Check, X } from 'lucide-react';
import { evaluatePassword, type StrengthLevel } from '../../lib/password-strength';
import styles from './password-strength.module.css';

const COLOR: Record<StrengthLevel, string> = {
  'muito-fraca': 'var(--destructive)',
  fraca: 'var(--destructive)',
  media: '#e8a33d',
  forte: 'var(--primary)',
  'muito-forte': '#17b26a',
};

export function PasswordStrength({ password, name }: { password: string; name: string }) {
  if (!password) return null;

  const result = evaluatePassword(password, name);
  const color = COLOR[result.level];

  return (
    <div className={styles.wrap}>
      <div className={styles.bars}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={styles.bar}
            style={i < result.score ? { background: color } : undefined}
          />
        ))}
      </div>
      <p className={styles.label} style={{ color }}>
        Senha {result.label.toLowerCase()}
      </p>
      <ul className={styles.checks}>
        {result.checks.map((check) => (
          <li key={check.id} className={`${styles.item} ${check.ok ? styles.ok : ''}`}>
            {check.ok ? <Check /> : <X />}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
