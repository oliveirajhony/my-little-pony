'use client';

import { Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';
import { AvatarDialog } from './avatar-dialog';

function initialsOf(name: string): string {
  const parts = name.split(' ').filter(Boolean).slice(0, 2);
  return (
    parts
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '—'
  );
}

export function ProfileForm() {
  const user = useAuth((s) => s.user);
  const updateProfile = useAuth((s) => s.updateProfile);

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState('');

  // Diálogo de confirmação de senha — só aparece quando o e-mail muda.
  const [pwdOpen, setPwdOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [pwdError, setPwdError] = useState('');

  const emailChanged = email.trim() !== (user?.email ?? '');

  function save(password?: string) {
    return updateProfile({
      name: name.trim(),
      email: email.trim(),
      ...(password ? { currentPassword: password } : {}),
    });
  }

  function flashSaved() {
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 2000);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    // Trocar o e-mail exige a senha atual: pede num diálogo antes de salvar.
    if (emailChanged) {
      setCurrentPassword('');
      setPwdError('');
      setPwdOpen(true);
      return;
    }
    setStatus('saving');
    try {
      await save();
      flashSaved();
    } catch (err) {
      setStatus('idle');
      setError(asApiError(err)?.message ?? 'Não foi possível salvar.');
    }
  }

  async function confirmEmailChange(event: FormEvent) {
    event.preventDefault();
    setPwdError('');
    setStatus('saving');
    try {
      await save(currentPassword);
      setPwdOpen(false);
      setCurrentPassword('');
      flashSaved();
    } catch (err) {
      setStatus('idle');
      setPwdError(asApiError(err)?.message ?? 'Senha incorreta. Tente de novo.');
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-5">
        <AvatarDialog initials={initialsOf(name)} />
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">E-mail</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-end gap-3">
          {status === 'saved' && (
            <span className="flex items-center gap-1 text-sm text-primary">
              <Check className="size-4" /> Salvo
            </span>
          )}
          <Button type="submit" disabled={status === 'saving'}>
            {status === 'saving' && !pwdOpen ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </div>
      </form>

      <Dialog
        open={pwdOpen}
        onOpenChange={(next) => {
          setPwdOpen(next);
          if (!next) setStatus('idle');
        }}
      >
        <DialogContent>
          <form onSubmit={confirmEmailChange}>
            <DialogHeader>
              <DialogTitle>Confirme sua senha</DialogTitle>
              <DialogDescription>
                Trocar o e-mail para <strong>{email.trim()}</strong> exige a sua senha atual, por
                segurança.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <Label htmlFor="confirm-current-password">Senha atual</Label>
              <Input
                id="confirm-current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
              />
              {pwdError && <p className="text-sm text-destructive">{pwdError}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={status === 'saving' || !currentPassword}>
                {status === 'saving' ? 'Confirmando…' : 'Confirmar troca'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
