'use client';

import { FileText, LogOut, PenLine, SquarePlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useCommandMenu } from '../../lib/command-menu-store';
import { useDocuments } from '../../lib/documents-store';
import { screens } from '../../lib/mock-data';

export function CommandMenu() {
  const router = useRouter();
  const { documents } = useDocuments();
  const open = useCommandMenu((s) => s.open);
  const setOpen = useCommandMenu((s) => s.setOpen);
  const toggle = useCommandMenu((s) => s.toggle);

  // Alt+B opens the command palette.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        toggle();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggle]);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Menu de comandos"
      description="Busque telas, arquivos e ações rápidas"
    >
      <CommandInput placeholder="Buscar telas, arquivos e ações…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Ações rápidas">
          <CommandItem
            onSelect={() => run(() => router.push('/app/editor'))}
            keywords={['criar', 'nova', 'nota', 'documento']}
          >
            <SquarePlus />
            <span>Criar nova nota</span>
            <CommandShortcut>N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push('/'))} keywords={['sair', 'logout']}>
            <LogOut />
            <span>Sair da conta</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Ir para">
          {screens.map((screen) => (
            <CommandItem
              key={screen.href}
              onSelect={() => run(() => router.push(screen.href))}
              keywords={[screen.title]}
            >
              <screen.icon />
              <span>{screen.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Arquivos">
          {documents.map((doc) => (
            <CommandItem
              key={doc.id}
              onSelect={() => run(() => router.push(`/app/editor?id=${doc.id}`))}
              keywords={doc.categories}
            >
              {doc.status === 'draft' ? <PenLine /> : <FileText />}
              <span>{doc.title}</span>
              <CommandShortcut>{doc.categories[0]}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
