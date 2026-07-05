import { describe, expect, it } from 'vitest';
import { evaluatePassword } from './password-strength';

describe('evaluatePassword', () => {
  it('senha vazia é muito fraca e inválida', () => {
    const r = evaluatePassword('', 'Ana');
    expect(r.score).toBe(0);
    expect(r.valid).toBe(false);
  });

  it('senha completa é válida e forte', () => {
    const r = evaluatePassword('Abc12345!', 'Ana');
    expect(r.valid).toBe(true);
    expect(r.score).toBeGreaterThanOrEqual(3);
  });

  it('bloqueia senha que contém o nome', () => {
    const r = evaluatePassword('Joaquim123!', 'Joaquim Silva');
    expect(r.containsName).toBe(true);
    expect(r.valid).toBe(false);
  });

  it('senha curta é inválida', () => {
    const r = evaluatePassword('Ab1!', 'Ana');
    expect(r.valid).toBe(false);
  });

  it('só minúsculas é fraca demais para cadastrar', () => {
    const r = evaluatePassword('abcdefgh', 'Ana');
    expect(r.valid).toBe(false);
  });
});
