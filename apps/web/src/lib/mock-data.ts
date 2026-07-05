import type { LucideIcon } from 'lucide-react';
import { Globe, Settings } from 'lucide-react';

export type Screen = { title: string; href: string; icon: LucideIcon };

export const screens: Screen[] = [
  { title: 'Documentos', href: '/app', icon: Globe },
  { title: 'Configurações', href: '/app/config', icon: Settings },
];

export type Shortcut = { label: string; keys: string[] };

export const shortcuts: Shortcut[] = [
  { label: 'Abrir busca e comandos', keys: ['Alt', 'B'] },
  { label: 'Alternar menu lateral', keys: ['Ctrl', 'B'] },
  { label: 'Criar nova nota', keys: ['N'] },
  { label: 'Ir para Documentos', keys: ['G', 'D'] },
];
