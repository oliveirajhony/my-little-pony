import { KeyboardShortcuts } from '../../../components/app/settings/keyboard-shortcuts';
import { PasswordForm } from '../../../components/app/settings/password-form';
import { ProfileForm } from '../../../components/app/settings/profile-form';
import { SettingsSection } from '../../../components/app/settings/settings-section';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gerencie seu perfil, senha e atalhos.</p>
      </header>

      <div className="mt-8">
        <SettingsSection title="Perfil" description="Como seu nome e e-mail aparecem no app.">
          <ProfileForm />
        </SettingsSection>

        <SettingsSection title="Senha" description="Use uma senha longa e única para esta conta.">
          <PasswordForm />
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
