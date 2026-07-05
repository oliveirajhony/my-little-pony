'use client';

import { ImageUp, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { asApiError } from '../../../lib/api-client';
import { useAuth } from '../../../lib/auth-store';
import { type AvatarSelection, AvatarUpload } from '../../login/avatar-upload';

/**
 * Avatar + diálogo de troca de foto. Uma nova imagem substitui a anterior
 * (o backend guarda uma só por usuário); "Remover" apaga a foto atual.
 */
export function AvatarDialog({ initials }: { initials: string }) {
  const user = useAuth((s) => s.user);
  const uploadAvatarFile = useAuth((s) => s.uploadAvatarFile);
  const uploadAvatarFromUrl = useAuth((s) => s.uploadAvatarFromUrl);
  const removeAvatar = useAuth((s) => s.removeAvatar);

  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<AvatarSelection | null>(null);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState('');

  const hasAvatar = Boolean(user?.avatarUrl);

  function reset() {
    setSelection(null);
    setError('');
    setBusy(null);
  }

  async function onSave() {
    if (!selection) return;
    setError('');
    setBusy('save');
    try {
      if (selection.file) await uploadAvatarFile(selection.file);
      else if (selection.url) await uploadAvatarFromUrl(selection.url);
      setOpen(false);
      reset();
    } catch (err) {
      setBusy(null);
      setError(asApiError(err)?.message ?? 'Não foi possível enviar a foto.');
    }
  }

  async function onRemove() {
    setError('');
    setBusy('remove');
    try {
      await removeAvatar();
      setOpen(false);
      reset();
    } catch (err) {
      setBusy(null);
      setError(asApiError(err)?.message ?? 'Não foi possível remover a foto.');
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <div className="flex items-center gap-4">
        <Avatar className="size-16 text-lg">
          {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <ImageUp />
            Alterar foto
          </Button>
        </DialogTrigger>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
          <DialogDescription>
            Envie uma imagem ou cole um link. A nova foto substitui a anterior.
          </DialogDescription>
        </DialogHeader>

        <AvatarUpload value={selection} onChange={setSelection} disabled={busy !== null} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="sm:justify-between">
          {hasAvatar ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              disabled={busy !== null}
            >
              <Trash2 />
              {busy === 'remove' ? 'Removendo…' : 'Remover foto'}
            </Button>
          ) : (
            <span />
          )}
          <Button type="button" onClick={onSave} disabled={!selection || busy !== null}>
            {busy === 'save' ? 'Salvando…' : 'Salvar foto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
