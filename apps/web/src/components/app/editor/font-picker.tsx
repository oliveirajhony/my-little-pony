'use client';

import { Check, Type } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type Font = { label: string; family: string; google?: string };

const FONTS: Font[] = [
  { label: 'Padrão', family: 'default' },
  { label: 'Inter', family: 'var(--font-inter)' },
  { label: 'Poppins', family: 'var(--font-poppins)' },
  { label: 'Roboto', family: "'Roboto', sans-serif", google: 'Roboto' },
  { label: 'Lato', family: "'Lato', sans-serif", google: 'Lato' },
  { label: 'Montserrat', family: "'Montserrat', sans-serif", google: 'Montserrat' },
  { label: 'Open Sans', family: "'Open Sans', sans-serif", google: 'Open+Sans' },
  { label: 'Nunito', family: "'Nunito', sans-serif", google: 'Nunito' },
  { label: 'Raleway', family: "'Raleway', sans-serif", google: 'Raleway' },
  { label: 'Oswald', family: "'Oswald', sans-serif", google: 'Oswald' },
  { label: 'Merriweather', family: "'Merriweather', serif", google: 'Merriweather' },
  { label: 'Playfair Display', family: "'Playfair Display', serif", google: 'Playfair+Display' },
  { label: 'Lora', family: "'Lora', serif", google: 'Lora' },
  { label: 'PT Serif', family: "'PT Serif', serif", google: 'PT+Serif' },
  { label: 'Source Code Pro', family: "'Source Code Pro', monospace", google: 'Source+Code+Pro' },
  { label: 'Arial', family: 'Arial, sans-serif' },
  { label: 'Georgia', family: 'Georgia, serif' },
  { label: 'Times New Roman', family: "'Times New Roman', serif" },
  { label: 'Courier New', family: "'Courier New', monospace" },
  { label: 'Verdana', family: 'Verdana, sans-serif' },
];

const GOOGLE_HREF = `https://fonts.googleapis.com/css2?${FONTS.filter((font) => font.google)
  .map((font) => `family=${font.google}:wght@400;600;700`)
  .join('&')}&display=swap`;

export function FontPicker({
  current,
  onPick,
}: {
  current: string;
  onPick: (family: string) => void;
}) {
  const [query, setQuery] = useState('');

  // Load the picker's Google Fonts once so previews (and the document) render them.
  useEffect(() => {
    if (document.getElementById('mlp-google-fonts')) return;
    const link = document.createElement('link');
    link.id = 'mlp-google-fonts';
    link.rel = 'stylesheet';
    link.href = GOOGLE_HREF;
    document.head.appendChild(link);
  }, []);

  const filtered = FONTS.filter((font) => font.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Fonte">
              <Type />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Fonte</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-60 p-0">
        <div className="p-2">
          <Input
            placeholder="Buscar fonte…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-8"
          />
        </div>
        <div className="max-h-72 overflow-auto p-1">
          {filtered.map((font) => (
            <button
              key={font.label}
              type="button"
              onClick={() => onPick(font.family)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              style={{ fontFamily: font.family === 'default' ? undefined : font.family }}
            >
              {font.label}
              {current === font.family ? <Check className="size-4 opacity-70" /> : null}
            </button>
          ))}
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
