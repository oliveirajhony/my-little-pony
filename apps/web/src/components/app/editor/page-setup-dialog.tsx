'use client';

import { Settings2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  type Margins,
  PAGE_COLORS,
  PAPER_LABELS,
  type PageConfig,
  type PaperSize,
} from './page-config';

type Props = {
  config: PageConfig;
  onChange: (config: PageConfig) => void;
};

const PAPER_ORDER: PaperSize[] = ['A4', 'A3', 'A5', 'LETTER', 'LEGAL', 'TABLOID'];
const MARGIN_FIELDS: { key: keyof Margins; label: string }[] = [
  { key: 'top', label: 'Início' },
  { key: 'bottom', label: 'Fim' },
  { key: 'left', label: 'Esquerda' },
  { key: 'right', label: 'Direita' },
];

export function PageSetupDialog({ config, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PageConfig>(config);

  function handleOpenChange(next: boolean) {
    // Start each session from the live config; edits stay local until "OK".
    if (next) setDraft(config);
    setOpen(next);
  }

  function setMargin(side: keyof Margins, value: string) {
    const n = Number(value);
    setDraft((d) => ({
      ...d,
      margins: { ...d.margins, [side]: Number.isFinite(n) ? Math.max(0, n) : 0 },
    }));
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label="Configuração da página"
            >
              <Settings2 />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Configuração da página</TooltipContent>
      </Tooltip>

      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Configuração da página</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-1">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Orientação</legend>
            <RadioGroup
              className="flex gap-6"
              value={draft.orientation}
              onValueChange={(value) =>
                setDraft((d) => ({ ...d, orientation: value as PageConfig['orientation'] }))
              }
            >
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="portrait" /> Retrato
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <RadioGroupItem value="landscape" /> Paisagem
              </Label>
            </RadioGroup>
          </fieldset>

          <div className="flex items-end gap-4">
            <div className="flex flex-1 flex-col gap-2">
              <Label htmlFor="paper-size" className="text-sm font-medium">
                Tamanho do papel
              </Label>
              <Select
                value={draft.paperSize}
                onValueChange={(value) =>
                  setDraft((d) => ({ ...d, paperSize: value as PaperSize }))
                }
              >
                <SelectTrigger id="paper-size" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_ORDER.map((size) => (
                    <SelectItem key={size} value={size}>
                      {PAPER_LABELS[size]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Cor da página</span>
              <ColorField
                value={draft.pageColor}
                onChange={(color) => setDraft((d) => ({ ...d, pageColor: color }))}
              />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Margens (centímetros)</legend>
            <div className="grid grid-cols-4 gap-3">
              {MARGIN_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <Label htmlFor={`margin-${key}`} className="text-xs text-muted-foreground">
                    {label}
                  </Label>
                  <Input
                    id={`margin-${key}`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    value={draft.margins[key]}
                    onChange={(event) => setMargin(key, event.target.value)}
                  />
                </div>
              ))}
            </div>
          </fieldset>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={apply}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="h-9 w-[86px] justify-start gap-2 px-2"
          aria-label="Cor da página"
        >
          <span className="size-5 rounded-full border" style={{ background: value }} aria-hidden />
          <span className="text-xs text-muted-foreground uppercase">{value.slice(1)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-6 gap-1.5">
            {PAGE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                onClick={() => onChange(color)}
                className="size-6 rounded-md border transition hover:scale-110"
                style={{ background: color }}
              />
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="size-7 cursor-pointer rounded border bg-transparent p-0"
            />
            Personalizada
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
