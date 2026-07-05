'use client';

import { Tag, X } from 'lucide-react';
import { type KeyboardEvent, useState } from 'react';
import { Badge } from '@/components/ui/badge';

type Props = {
  value: string[];
  onChange: (categories: string[]) => void;
};

/** Tag-style input: type + Enter (or comma) to add a category, × to remove. */
export function CategoryInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState('');

  function add() {
    const label = draft.trim();
    setDraft('');
    if (!label) return;
    if (value.some((c) => c.toLowerCase() === label.toLowerCase())) return;
    onChange([...value, label]);
  }

  function remove(category: string) {
    onChange(value.filter((c) => c !== category));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add();
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
      <Tag className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {value.map((category) => (
        <Badge key={category} variant="secondary" className="gap-1 pr-1 font-normal">
          {category}
          <button
            type="button"
            onClick={() => remove(category)}
            aria-label={`Remover categoria ${category}`}
            className="rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length ? 'Adicionar…' : 'Adicionar categorias…'}
        aria-label="Adicionar categoria"
        className="min-w-[120px] flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-muted-foreground/60"
      />
    </div>
  );
}
