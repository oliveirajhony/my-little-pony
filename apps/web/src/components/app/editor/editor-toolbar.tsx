'use client';

import type { Editor } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Highlighter,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  Move,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ImageMode } from './document-editor';
import { FontPicker } from './font-picker';
import type { PageConfig } from './page-config';
import { PageSetupDialog } from './page-setup-dialog';

type Props = {
  editor: Editor | null;
  pageConfig: PageConfig;
  onPageConfigChange: (config: PageConfig) => void;
  onInsertImage: (src: string, mode: ImageMode) => void;
};

const SIZES = ['12px', '14px', '16px', '18px', '24px', '30px', '36px', '48px'];
const TEXT_COLORS = [
  '#1d1d1f',
  '#5a6478',
  '#e5484d',
  '#f5a524',
  '#17b26a',
  '#1f6bff',
  '#7c3aed',
  '#db2777',
];
const HIGHLIGHTS = ['#fff3bf', '#d3f9d8', '#d0ebff', '#ffd8a8', '#ffc9c9', '#e5dbff'];

function Hint({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Swatches({
  colors,
  onPick,
  onReset,
}: {
  colors: string[];
  onPick: (color: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-6 gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            onClick={() => onPick(color)}
            className="size-6 rounded-md border transition hover:scale-110"
            style={{ background: color }}
          />
        ))}
      </div>
      <Button variant="ghost" size="sm" className="h-7 justify-start" onClick={onReset}>
        Remover
      </Button>
    </div>
  );
}

function ColorPopover({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <Popover>
      <Hint label={label}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={label}>
            {icon}
          </Button>
        </PopoverTrigger>
      </Hint>
      <PopoverContent align="start" className="w-auto p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function EditorToolbar({ editor, pageConfig, onPageConfigChange, onInsertImage }: Props) {
  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return null;
      const style = e.getAttributes('textStyle');
      return {
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        isBold: e.isActive('bold'),
        isItalic: e.isActive('italic'),
        isUnderline: e.isActive('underline'),
        isStrike: e.isActive('strike'),
        isBullet: e.isActive('bulletList'),
        isOrdered: e.isActive('orderedList'),
        align: e.isActive({ textAlign: 'center' })
          ? 'center'
          : e.isActive({ textAlign: 'right' })
            ? 'right'
            : e.isActive({ textAlign: 'justify' })
              ? 'justify'
              : 'left',
        fontFamily: (style.fontFamily as string) ?? 'default',
        fontSize: (style.fontSize as string) ?? 'default',
      };
    },
  });

  if (!editor || !state) return null;

  const chain = () => editor.chain().focus();

  function pickFile(mode: ImageMode) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => onInsertImage(reader.result as string, mode);
      reader.readAsDataURL(file);
    };
    input.click();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1.5 shadow-sm">
      <Hint label="Desfazer">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Desfazer"
          disabled={!state.canUndo}
          onClick={() => chain().undo().run()}
        >
          <Undo2 />
        </Button>
      </Hint>
      <Hint label="Refazer">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Refazer"
          disabled={!state.canRedo}
          onClick={() => chain().redo().run()}
        >
          <Redo2 />
        </Button>
      </Hint>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <FontPicker
        current={state.fontFamily}
        onPick={(family) =>
          family === 'default'
            ? chain().unsetFontFamily().run()
            : chain().setFontFamily(family).run()
        }
      />

      <Select
        value={SIZES.includes(state.fontSize) ? state.fontSize : 'default'}
        onValueChange={(value) =>
          value === 'default' ? chain().unsetFontSize().run() : chain().setFontSize(value).run()
        }
      >
        <SelectTrigger size="sm" className="w-[76px]" aria-label="Tamanho da fonte">
          <SelectValue placeholder="16" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Auto</SelectItem>
          {SIZES.map((size) => (
            <SelectItem key={size} value={size}>
              {size.replace('px', '')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Hint label="Negrito">
        <Toggle
          size="sm"
          pressed={state.isBold}
          onPressedChange={() => chain().toggleBold().run()}
          aria-label="Negrito"
        >
          <Bold />
        </Toggle>
      </Hint>
      <Hint label="Itálico">
        <Toggle
          size="sm"
          pressed={state.isItalic}
          onPressedChange={() => chain().toggleItalic().run()}
          aria-label="Itálico"
        >
          <Italic />
        </Toggle>
      </Hint>
      <Hint label="Sublinhado">
        <Toggle
          size="sm"
          pressed={state.isUnderline}
          onPressedChange={() => chain().toggleUnderline().run()}
          aria-label="Sublinhado"
        >
          <UnderlineIcon />
        </Toggle>
      </Hint>
      <Hint label="Tachado">
        <Toggle
          size="sm"
          pressed={state.isStrike}
          onPressedChange={() => chain().toggleStrike().run()}
          aria-label="Tachado"
        >
          <Strikethrough />
        </Toggle>
      </Hint>

      <ColorPopover icon={<Baseline />} label="Cor do texto">
        <Swatches
          colors={TEXT_COLORS}
          onPick={(color) => chain().setColor(color).run()}
          onReset={() => chain().unsetColor().run()}
        />
      </ColorPopover>
      <ColorPopover icon={<Highlighter />} label="Marca-texto">
        <Swatches
          colors={HIGHLIGHTS}
          onPick={(color) => chain().toggleHighlight({ color }).run()}
          onReset={() => chain().unsetHighlight().run()}
        />
      </ColorPopover>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToggleGroup
        type="single"
        size="sm"
        value={state.align}
        onValueChange={(value) => value && chain().setTextAlign(value).run()}
      >
        <Hint label="Alinhar à esquerda">
          <ToggleGroupItem value="left" aria-label="Alinhar à esquerda">
            <AlignLeft />
          </ToggleGroupItem>
        </Hint>
        <Hint label="Centralizar">
          <ToggleGroupItem value="center" aria-label="Centralizar">
            <AlignCenter />
          </ToggleGroupItem>
        </Hint>
        <Hint label="Alinhar à direita">
          <ToggleGroupItem value="right" aria-label="Alinhar à direita">
            <AlignRight />
          </ToggleGroupItem>
        </Hint>
        <Hint label="Justificar">
          <ToggleGroupItem value="justify" aria-label="Justificar">
            <AlignJustify />
          </ToggleGroupItem>
        </Hint>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Hint label="Lista com marcadores">
        <Toggle
          size="sm"
          pressed={state.isBullet}
          onPressedChange={() => chain().toggleBulletList().run()}
          aria-label="Lista com marcadores"
        >
          <List />
        </Toggle>
      </Hint>
      <Hint label="Lista numerada">
        <Toggle
          size="sm"
          pressed={state.isOrdered}
          onPressedChange={() => chain().toggleOrderedList().run()}
          aria-label="Lista numerada"
        >
          <ListOrdered />
        </Toggle>
      </Hint>
      <Hint label="Linha horizontal">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="Linha horizontal"
          onClick={() => chain().setHorizontalRule().run()}
        >
          <Minus />
        </Button>
      </Hint>
      <DropdownMenu>
        <Hint label="Inserir imagem">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Inserir imagem">
              <ImagePlus />
            </Button>
          </DropdownMenuTrigger>
        </Hint>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => pickFile('inline')}>
            <ImageIcon />
            Imagem em linha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => pickFile('floating')}>
            <Move />
            Imagem flutuante
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <PageSetupDialog config={pageConfig} onChange={onPageConfigChange} />
    </div>
  );
}
