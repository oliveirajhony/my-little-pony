'use client';

import { type FormEvent, useId, useState } from 'react';
import { useLoginUi } from '../../lib/login-ui-store';
import { AUTH_MESSAGES, authenticate, DEMO_USER } from '../../lib/mock-auth';
import { isValidEmail } from '../../lib/validation';
import { AlertIcon, CheckIcon, DocIcon, EyeIcon, EyeOffIcon, GitHubIcon } from '../icons';
import styles from './login-form.module.css';

const REPO_URL = 'https://github.com/oliveirajhony/my-little-pony';

type Status = 'idle' | 'loading' | 'success';

export function LoginForm({ authDelayMs = 900 }: { authDelayMs?: number } = {}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const setFocusedField = useLoginUi((s) => s.setFocusedField);
  const setPasswordVisible = useLoginUi((s) => s.setPasswordVisible);
  const triggerReaction = useLoginUi((s) => s.react);

  function fail(message: string) {
    setError(message);
    setShaking(true);
    triggerReaction('error');
  }

  function toggleShowPassword() {
    const next = !showPassword;
    setShowPassword(next);
    setPasswordVisible(next);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status !== 'idle') return;
    setError(null);

    if (!isValidEmail(email)) {
      fail(AUTH_MESSAGES['invalid-email']);
      return;
    }
    if (password.length === 0) {
      fail(AUTH_MESSAGES['empty-password']);
      return;
    }

    setStatus('loading');
    const result = await authenticate(email, password, authDelayMs);
    if (result.ok) {
      setStatus('success');
      triggerReaction('success');
    } else {
      setStatus('idle');
      fail(AUTH_MESSAGES[result.reason]);
    }
  }

  const busy = status === 'loading';
  const done = status === 'success';
  const locked = busy || done;

  return (
    <form
      className={`${styles.card} ${shaking ? styles.shake : ''}`}
      onSubmit={handleSubmit}
      onAnimationEnd={() => setShaking(false)}
      noValidate
    >
      <div className={styles.brand}>
        <span className={styles.mark}>
          <DocIcon />
        </span>
        <span className={styles.name}>my-little-pony</span>
        <span className={styles.tag}>Beta</span>
      </div>

      <h1 className={styles.head}>Bem-vindo de volta</h1>
      <p className={styles.sub}>
        Entre para acessar seus rascunhos e documentos publicados — e continuar de onde parou.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={emailId}>
          E-mail
        </label>
        <input
          id={emailId}
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField(null)}
          placeholder="voce@exemplo.com"
          autoComplete="email"
          disabled={locked}
        />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={passwordId}>
          Senha
        </label>
        <div className={styles.pwWrap}>
          <input
            id={passwordId}
            className={`${styles.input} ${styles.inputPw}`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setFocusedField('password')}
            onBlur={() => setFocusedField(null)}
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={locked}
          />
          <button
            type="button"
            className={styles.eye}
            onClick={toggleShowPassword}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            disabled={locked}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      <div className={styles.row}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={locked}
          />
          <span className={styles.checkBox}>
            <CheckIcon />
          </span>
          Manter conectado
        </label>
        <a className={styles.link} href="#top">
          Esqueceu a senha?
        </a>
      </div>

      <button
        type="submit"
        className={`${styles.btn} ${done ? styles.btnDone : ''}`}
        disabled={locked}
        aria-describedby={errorId}
      >
        {done ? (
          <span className={styles.btnDoneLabel}>
            <CheckIcon /> Tudo certo!
          </span>
        ) : busy ? (
          <span className={styles.spinner} aria-hidden="true" />
        ) : (
          'Entrar'
        )}
      </button>

      <p id={errorId} className={`${styles.error} ${error ? styles.errorShow : ''}`} role="alert">
        {error ? (
          <>
            <AlertIcon />
            <span>{error}</span>
          </>
        ) : null}
      </p>

      <p className={styles.demo}>
        Demo — use <code>{DEMO_USER.email}</code> e <code>{DEMO_USER.password}</code>
      </p>

      <div className={styles.foot}>
        <span>
          Novo por aqui?{' '}
          <a className={styles.link} href="#top">
            Criar conta
          </a>
        </span>
        <a className={styles.repo} href={REPO_URL} target="_blank" rel="noreferrer">
          <GitHubIcon /> GitHub
        </a>
      </div>
    </form>
  );
}
