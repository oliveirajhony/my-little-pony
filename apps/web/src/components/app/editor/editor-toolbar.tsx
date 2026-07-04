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
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  PaintBucket,
  RectangleHorizontal,
  RectangleVertical,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react';
import { type ReactNode, useRef } from 'react';
import { Button } from '@/components/ui/button';
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
import type { Orientation } from './document-editor';

type Props = {
  editor: Editor | null;
  orientation: Orientation;
  onOrientationChange: (value: Orientation) => void;
  onPageBgChange: (value: string) => void;
};

const FONTS = [
  { value: 'default', label: 'Fonte padrão' },
  { value: 'var(--font-inter)', label: 'Inter' },
  { value: 'var(--font-poppins)', label: 'Poppins' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' },
];

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
const PAGE_BGS = ['#ffffff', '#fbfbfd', '#f7f5ef', '#eef3fb', '#f4f0fb', '#1d1d1f'];

function Swatches({
  colors,
  onPick,
  allowReset,
  onReset,
}: {
  colors: string[];
  onPick: (color: string) => void;
  allowReset?: boolean;
  onReset?: () => void;
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
            className="size-6 rounded-md border ring-offset-2 transition hover:scale-110"
            style={{ background: color }}
          />
        ))}
      </div>
      {allowReset ? (
        <Button variant="ghost" size="sm" className="h-7 justify-start" onClick={onReset}>
          Remover
        </Button>
      ) : null}
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
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={label}>
          {icon}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        {children}
      </PopoverContent>
    </Popover>
  );
}

export function EditorToolbar({ editor, orientation, onOrientationChange, onPageBgChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);

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
        block: e.isActive('heading', { level: 1 })
          ? 'h1'
          : e.isActive('heading', { level: 2 })
            ? 'h2'
            : e.isActive('heading', { level: 3 })
              ? 'h3'
              : 'paragraph',
        fontFamily: (style.fontFamily as string) ?? 'default',
        fontSize: (style.fontSize as string) ?? 'default',
      };
    },
  });

  if (!editor || !state) return null;

  const chain = () => editor.chain().focus();

  function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editor) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor
        .chain()
        .focus()
        .setImage({ src: reader.result as string })
        .run();
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-xl border bg-card p-1.5 shadow-sm">
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

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Select
        value={state.block}
        onValueChange={(value) => {
          if (value === 'paragraph') chain().setParagraph().run();
          else
            chain()
              .toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 })
              .run();
        }}
      >
        <SelectTrigger size="sm" className="w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">Texto</SelectItem>
          <SelectItem value="h1">Título 1</SelectItem>
          <SelectItem value="h2">Título 2</SelectItem>
          <SelectItem value="h3">Título 3</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={FONTS.some((f) => f.value === state.fontFamily) ? state.fontFamily : 'default'}
        onValueChange={(value) => {
          if (value === 'default') chain().unsetFontFamily().run();
          else chain().setFontFamily(value).run();
        }}
      >
        <SelectTrigger size="sm" className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={SIZES.includes(state.fontSize) ? state.fontSize : 'default'}
        onValueChange={(value) => {
          if (value === 'default') chain().unsetFontSize().run();
          else chain().setFontSize(value).run();
        }}
      >
        <SelectTrigger size="sm" className="w-[76px]">
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

      <Toggle
        size="sm"
        pressed={state.isBold}
        onPressedChange={() => chain().toggleBold().run()}
        aria-label="Negrito"
      >
        <Bold />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isItalic}
        onPressedChange={() => chain().toggleItalic().run()}
        aria-label="Itálico"
      >
        <Italic />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isUnderline}
        onPressedChange={() => chain().toggleUnderline().run()}
        aria-label="Sublinhado"
      >
        <UnderlineIcon />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isStrike}
        onPressedChange={() => chain().toggleStrike().run()}
        aria-label="Tachado"
      >
        <Strikethrough />
      </Toggle>

      <ColorPopover icon={<Baseline />} label="Cor do texto">
        <Swatches
          colors={TEXT_COLORS}
          onPick={(color) => chain().setColor(color).run()}
          allowReset
          onReset={() => chain().unsetColor().run()}
        />
      </ColorPopover>
      <ColorPopover icon={<Highlighter />} label="Marca-texto">
        <Swatches
          colors={HIGHLIGHTS}
          onPick={(color) => chain().toggleHighlight({ color }).run()}
          allowReset
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
        <ToggleGroupItem value="left" aria-label="Alinhar à esquerda">
          <AlignLeft />
        </ToggleGroupItem>
        <ToggleGroupItem value="center" aria-label="Centralizar">
          <AlignCenter />
        </ToggleGroupItem>
        <ToggleGroupItem value="right" aria-label="Alinhar à direita">
          <AlignRight />
        </ToggleGroupItem>
        <ToggleGroupItem value="justify" aria-label="Justificar">
          <AlignJustify />
        </ToggleGroupItem>
      </ToggleGroup>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={state.isBullet}
        onPressedChange={() => chain().toggleBulletList().run()}
        aria-label="Lista com marcadores"
      >
        <List />
      </Toggle>
      <Toggle
        size="sm"
        pressed={state.isOrdered}
        onPressedChange={() => chain().toggleOrderedList().run()}
        aria-label="Lista numerada"
      >
        <ListOrdered />
      </Toggle>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Linha horizontal"
        onClick={() => chain().setHorizontalRule().run()}
      >
        <Minus />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        aria-label="Inserir imagem"
        onClick={() => fileInput.current?.click()}
      >
        <ImagePlus />
      </Button>
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onPickImage} />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToggleGroup
        type="single"
        size="sm"
        value={orientation}
        onValueChange={(value) => value && onOrientationChange(value as Orientation)}
      >
        <ToggleGroupItem value="portrait" aria-label="Retrato">
          <RectangleVertical />
        </ToggleGroupItem>
        <ToggleGroupItem value="landscape" aria-label="Paisagem">
          <RectangleHorizontal />
        </ToggleGroupItem>
      </ToggleGroup>

      <ColorPopover icon={<PaintBucket />} label="Cor da página">
        <Swatches
          colors={PAGE_BGS}
          onPick={onPageBgChange}
          allowReset
          onReset={() => onPageBgChange('#ffffff')}
        />
      </ColorPopover>
    </div>
  );
}
