'use client';

import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockUser } from '../../lib/mock-data';
import { useUserPanel } from '../../lib/user-panel-store';

const SHORTCUTS = [
  { label: 'Abrir busca / comandos', keys: ['Alt', 'B'] },
  { label: 'Abrir / fechar menu lateral', keys: ['Ctrl', 'B'] },
  { label: 'Criar nova nota', keys: ['N'] },
  { label: 'Ir para Publicados', keys: ['G', 'P'] },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border bg-muted px-1.5 font-mono text-[11px] font-medium text-muted-foreground">
      {children}
    </kbd>
  );
}

export function UserPanel() {
  const open = useUserPanel((s) => s.open);
  const setOpen = useUserPanel((s) => s.setOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Sua conta</DialogTitle>
          <DialogDescription>Gerencie seu perfil, senha e atalhos.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="perfil" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
            <TabsTrigger value="senha">Senha</TabsTrigger>
            <TabsTrigger value="atalhos">Atalhos</TabsTrigger>
          </TabsList>

          <TabsContent value="perfil" className="mt-4 space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 text-lg">
                <AvatarFallback>{mockUser.initials}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera />
                Trocar avatar
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-name">Nome</Label>
              <Input id="up-name" defaultValue={mockUser.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-email">E-mail</Label>
              <Input id="up-email" type="email" defaultValue={mockUser.email} />
            </div>
            <div className="flex justify-end">
              <Button>Salvar alterações</Button>
            </div>
          </TabsContent>

          <TabsContent value="senha" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="up-current">Senha atual</Label>
              <Input id="up-current" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-new">Nova senha</Label>
              <Input id="up-new" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="up-confirm">Confirmar nova senha</Label>
              <Input id="up-confirm" type="password" placeholder="••••••••" />
            </div>
            <div className="flex justify-end">
              <Button>Atualizar senha</Button>
            </div>
          </TabsContent>

          <TabsContent value="atalhos" className="mt-4 space-y-1">
            <p className="mb-3 text-sm text-muted-foreground">
              Clique em um atalho para reconfigurar (em breve).
            </p>
            {SHORTCUTS.map((shortcut) => (
              <button
                type="button"
                key={shortcut.label}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <span>{shortcut.label}</span>
                <span className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
