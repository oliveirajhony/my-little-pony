export type StrengthLevel = 'muito-fraca' | 'fraca' | 'media' | 'forte' | 'muito-forte';

export type PasswordCheck = { id: string; label: string; ok: boolean };

export type PasswordEvaluation = {
  /** 0–4, mapeia para as 5 faixas. */
  score: number;
  level: StrengthLevel;
  label: string;
  checks: PasswordCheck[];
  containsName: boolean;
  /** Atende ao mínimo para cadastrar (>= 8, sem o nome, ao menos "média"). */
  valid: boolean;
};

const LEVELS: StrengthLevel[] = ['muito-fraca', 'fraca', 'media', 'forte', 'muito-forte'];
const LABELS = ['Muito fraca', 'Fraca', 'Média', 'Forte', 'Muito forte'];

function nameWords(name: string): string[] {
  return name
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * Avalia a força de uma senha e as regras atendidas. Se `name` é passado,
 * penaliza (e bloqueia) senhas que contêm o nome.
 */
export function evaluatePassword(password: string, name = ''): PasswordEvaluation {
  const lower = password.toLowerCase();
  const containsName = password.length > 0 && nameWords(name).some((w) => lower.includes(w));

  const checks: PasswordCheck[] = [
    { id: 'length', label: 'Pelo menos 8 caracteres', ok: password.length >= 8 },
    { id: 'lower', label: 'Uma letra minúscula', ok: /[a-z]/.test(password) },
    { id: 'upper', label: 'Uma letra maiúscula', ok: /[A-Z]/.test(password) },
    { id: 'number', label: 'Um número', ok: /[0-9]/.test(password) },
    { id: 'special', label: 'Um caractere especial', ok: /[^a-zA-Z0-9]/.test(password) },
    { id: 'noname', label: 'Não contém seu nome', ok: !containsName },
  ];

  const passed = checks.slice(0, 5).filter((c) => c.ok).length;

  let score = 0;
  if (password.length > 0) {
    score = Math.max(0, passed - 1);
    if (containsName || password.length < 8) score = Math.min(score, 1);
  }

  return {
    score,
    level: LEVELS[score],
    label: LABELS[score],
    checks,
    containsName,
    valid: password.length >= 8 && !containsName && score >= 2,
  };
}
