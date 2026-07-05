import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyboardShortcuts } from '../../../components/app/settings/keyboard-shortcuts';
import { SettingsSection } from '../../../components/app/settings/settings-section';
import { mockUser } from '../../../lib/mock-data';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie seu perfil, senha e atalhos.</p>
      </header>

      <div className="mt-8">
        <SettingsSection title="Perfil" description="Como seu nome e e-mail aparecem no app.">
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 text-lg">
                <AvatarFallback>{mockUser.initials}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">
                <Camera />
                Trocar avatar
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" defaultValue={mockUser.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" defaultValue={mockUser.email} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button>Salvar alterações</Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Senha" description="Use uma senha longa e única para esta conta.">
          <div className="max-w-sm space-y-5">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input id="current-password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input id="new-password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" />
            </div>
            <div className="flex justify-end">
              <Button>Atualizar senha</Button>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          title="Atalhos"
          description="Teclas para navegar sem tirar as mãos do teclado."
        >
          <KeyboardShortcuts />
        </SettingsSection>
      </div>
    </div>
  );
}
