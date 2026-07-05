'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useId, useState } from 'react';
import { asApiError } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-store';
import { useLoginUi } from '../../lib/login-ui-store';
import { isValidEmail } from '../../lib/validation';
import { AlertIcon, CheckIcon, DocIcon, EyeIcon, EyeOffIcon, GitHubIcon } from '../icons';
import styles from './login-form.module.css';

const REPO_URL = 'https://github.com/oliveirajhony/my-little-pony';
const MIN_PASSWORD = 8;

type Status = 'idle' | 'loading' | 'success';
type Mode = 'login' | 'register';

export function LoginForm() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const authStatus = useAuth((s) => s.status);

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const setFocusedField = useLoginUi((s) => s.setFocusedField);
  const setPasswordVisible = useLoginUi((s) => s.setPasswordVisible);
  const triggerReaction = useLoginUi((s) => s.react);

  const isRegister = mode === 'register';

  // Já autenticado (ex.: silent-refresh) → segue direto para a área logada.
  useEffect(() => {
    if (authStatus === 'authed') router.replace('/app');
  }, [authStatus, router]);

  function fail(message: string) {
    setError(message);
    setShaking(true);
    triggerReaction('error');
  }

  function switchMode() {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
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

    if (isRegister && name.trim().length === 0) {
      fail('Informe seu nome.');
      return;
    }
    if (!isValidEmail(email)) {
      fail('Confira o e-mail digitado.');
      return;
    }
    if (password.length === 0) {
      fail('Digite sua senha.');
      return;
    }
    if (isRegister && password.length < MIN_PASSWORD) {
      fail('A senha precisa ter ao menos 8 caracteres.');
      return;
    }

    setStatus('loading');
    try {
      if (isRegister) {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      setStatus('success');
      triggerReaction('success');
      // Deixa a comemoração do pônei aparecer antes de navegar.
      setTimeout(() => router.replace('/app'), 700);
    } catch (err) {
      setStatus('idle');
      fail(asApiError(err)?.message ?? 'Não foi possível conectar. Tente de novo.');
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

      <h1 className={styles.head}>{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</h1>
      <p className={styles.sub}>
        {isRegister
          ? 'Leva menos de um minuto — comece a escrever e publicar seus documentos.'
          : 'Entre para acessar seus rascunhos e documentos publicados — e continuar de onde parou.'}
      </p>

      {isRegister && (
        <div className={styles.field}>
          <label className={styles.label} htmlFor={nameId}>
            Nome
          </label>
          <input
            id={nameId}
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoComplete="name"
            disabled={locked}
          />
        </div>
      )}

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
            autoComplete={isRegister ? 'new-password' : 'current-password'}
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

      {!isRegister && (
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
      )}

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
        ) : isRegister ? (
          'Criar conta'
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

      <div className={styles.foot}>
        <span>
          {isRegister ? 'Já tem conta? ' : 'Novo por aqui? '}
          <button type="button" className={styles.linkBtn} onClick={switchMode} disabled={locked}>
            {isRegister ? 'Entrar' : 'Criar conta'}
          </button>
        </span>
        <a className={styles.repo} href={REPO_URL} target="_blank" rel="noreferrer">
          <GitHubIcon /> GitHub
        </a>
      </div>
    </form>
  );
}
