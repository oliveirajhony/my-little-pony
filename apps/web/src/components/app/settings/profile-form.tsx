'use client';

import { Check } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { asApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';

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

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setStatus('saving');
    try {
      await updateProfile({ name: name.trim(), email: email.trim() });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setStatus('idle');
      setError(asApiError(err)?.message ?? 'Não foi possível salvar.');
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <Avatar className="size-16 text-lg">
          <AvatarFallback>{initialsOf(name)}</AvatarFallback>
        </Avatar>
      </div>
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
          {status === 'saving' ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
