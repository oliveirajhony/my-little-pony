'use client';

import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DocStatus } from '../../../lib/documents-api';
import { CategoryInput } from './category-input';

type Props = {
  title: string;
  onTitleChange: (value: string) => void;
  slug: string;
  onSlugChange: (value: string) => void;
  categories: string[];
  onCategoriesChange: (value: string[]) => void;
  status: DocStatus;
  onStatusChange: (value: DocStatus) => void;
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function DocumentDetailsPanel({
  title,
  onTitleChange,
  slug,
  onSlugChange,
  categories,
  onCategoriesChange,
  status,
  onStatusChange,
}: Props) {
  return (
    <div className="space-y-5">
      <Field label="Título">
        <Input
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Documento sem título"
          aria-label="Título do documento"
        />
      </Field>

      <Field label="Endereço (slug)">
        <div className="flex items-center rounded-lg border bg-card focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
          <span className="pl-2.5 text-sm text-muted-foreground select-none">/</span>
          <input
            value={slug}
            onChange={(event) => onSlugChange(event.target.value)}
            placeholder="documento"
            aria-label="Endereço (slug) do documento"
            className="min-w-0 flex-1 rounded-r-lg bg-transparent px-1.5 py-2 text-sm outline-none"
          />
        </div>
        <p className="text-xs text-muted-foreground">Endereço público da nota.</p>
      </Field>

      <Field label="Categorias">
        <CategoryInput value={categories} onChange={onCategoriesChange} />
      </Field>

      <Field label="Status">
        <ToggleGroup
          type="single"
          variant="outline"
          value={status}
          onValueChange={(value) => value && onStatusChange(value as DocStatus)}
          className="w-full"
        >
          <ToggleGroupItem value="draft" className="flex-1">
            Rascunho
          </ToggleGroupItem>
          <ToggleGroupItem value="published" className="flex-1">
            Publicado
          </ToggleGroupItem>
        </ToggleGroup>
      </Field>
    </div>
  );
}
