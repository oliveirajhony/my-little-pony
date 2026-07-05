'use client';

import { Check, Mail } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "Receber por e-mail". Mock: valida e confirma inline (sem envio real). */
export function EmailDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function reset() {
    setEmail('');
    setError('');
    setSent(false);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!EMAIL_RE.test(email)) {
      setError('Informe um e-mail válido.');
      return;
    }
    setSent(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail />
          Receber por e-mail
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Receber por e-mail</DialogTitle>
          <DialogDescription>Enviamos uma cópia deste documento para você.</DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="size-5" />
            </span>
            <p className="font-medium">Enviaremos para {email}</p>
            <p className="text-sm text-muted-foreground">
              Confira sua caixa de entrada em instantes.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email-copy">Seu e-mail</Label>
              <Input
                id="email-copy"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                autoFocus
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <div className="flex justify-end">
              <Button type="submit">
                <Mail />
                Enviar cópia
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
