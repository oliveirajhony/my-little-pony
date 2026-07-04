import { LoginForm } from '../components/login/login-form';
import { Stage } from '../components/login/stage';
import { ThemeToggle } from '../components/theme-toggle';
import styles from './page.module.css';

export default function LoginPage() {
  return (
    <>
      <div className={styles.toggle}>
        <ThemeToggle />
      </div>
      <main className={styles.split}>
        <Stage />
        <div className={styles.panel}>
          <LoginForm />
        </div>
      </main>
    </>
  );
}
