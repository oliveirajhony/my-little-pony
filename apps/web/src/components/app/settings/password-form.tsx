'use client';

import { Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';

const MIN_PASSWORD = 8;

export function PasswordForm() {
  const changePassword = useAuth((s) => s.changePassword);

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (next.length < MIN_PASSWORD) {
      setError('A nova senha precisa ter ao menos 8 caracteres.');
      return;
    }
    if (next !== confirm) {
      setError('A confirmação não confere.');
      return;
    }
    setStatus('saving');
    try {
      await changePassword({ current, next });
      setStatus('saved');
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('idle');
      setError(asApiError(err)?.message ?? 'Não foi possível atualizar a senha.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-sm space-y-5">
      <div className="space-y-2">
        <Label htmlFor="current-password">Senha atual</Label>
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">Nova senha</Label>
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirmar nova senha</Label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-sm text-primary">
            <Check className="size-4" /> Senha atualizada
          </span>
        )}
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Atualizando…' : 'Atualizar senha'}
        </Button>
      </div>
    </form>
  );
}
