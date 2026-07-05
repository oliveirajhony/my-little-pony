'use client';

import { Highlight } from '@tiptap/extension-highlight';
import { Placeholder } from '@tiptap/extension-placeholder';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { Fragment, type Node as PMNode, Slice } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Check, PanelRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { PaginationPlus } from 'tiptap-pagination-plus';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { asApiError } from '../../../lib/api-client';
import {
  createDocument,
  type DocStatus,
  getDocument,
  publishDocument,
  saveDocument,
  unpublishDocument,
} from '../../../lib/documents-api';
import { slugify, useDocumentsStore } from '../../../lib/documents-store';
import { DocumentDetailsPanel } from './document-details-panel';
import { EditorToolbar } from './editor-toolbar';
import { FloatingImage, type FloatingImageData } from './floating-image';
import { LineHeight } from './line-height';
import { DEFAULT_GEOMETRY, readableTextColor } from './page-config';
import { ResizableImage } from './resizable-image';
import { usePageConfig } from './use-page-config';

export type ImageMode = 'inline' | 'floating';

const INITIAL_CONTENT = '<p></p>';

const ZOOM_LEVELS = [
  { value: 'fit', label: 'Ajustar' },
  { value: '0.5', label: '50%' },
  { value: '0.75', label: '75%' },
  { value: '1', label: '100%' },
  { value: '1.25', label: '125%' },
  { value: '1.5', label: '150%' },
];

function countWords(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function DocumentEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get('id');
  const upsert = useDocumentsStore((s) => s.upsert);

  const [docId, setDocId] = useState<string | null>(editingId);
  const [version, setVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [status, setStatus] = useState<DocStatus>('draft');
  // Slug follows the title until the user overrides it.
  const [slugOverride, setSlugOverride] = useState<string | null>(null);
  const [images, setImages] = useState<FloatingImageData[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  // Height of the paginated flow — keeps floating images inside the document bounds.
  const [flowHeight, setFlowHeight] = useState(DEFAULT_GEOMETRY.height);
  const [zoom, setZoom] = useState('1');
  const [deskWidth, setDeskWidth] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const nextImageId = useRef(0);
  const deskRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, underline: false }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Placeholder.configure({ placeholder: 'Comece a escrever…' }),
      ResizableImage.configure({ inline: true, allowBase64: true }),
      // Real A4 pagination: content reflows across pages, like Word / Google Docs.
      // Size and margins are then driven by usePageConfig (single source of truth).
      PaginationPlus.configure({
        pageWidth: DEFAULT_GEOMETRY.width,
        pageHeight: DEFAULT_GEOMETRY.height,
        pageGap: 28,
        // Gap fill; the theme-aware desk color is enforced via editor.css.
        pageBreakBackground: '#e8eaef',
        pageGapBorderSize: 0,
        pageGapBorderColor: 'transparent',
        marginTop: DEFAULT_GEOMETRY.margins.top,
        marginBottom: DEFAULT_GEOMETRY.margins.bottom,
        marginLeft: DEFAULT_GEOMETRY.margins.left,
        marginRight: DEFAULT_GEOMETRY.margins.right,
        contentMarginTop: 0,
        contentMarginBottom: 0,
        // Clean pages — no default page numbers / headers / footers.
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '',
      }),
    ],
    content: INITIAL_CONTENT,
    editorProps: {
      attributes: { class: 'tiptap' },
      // Drop empty paragraphs from pasted content (Word / Docs / web / editor
      // copies) so pasting doesn't leave blank lines in the middle of the document.
      transformPasted: (slice) => {
        const kept: PMNode[] = [];
        slice.content.forEach((node) => {
          if (node.type.name === 'paragraph' && node.textContent.trim() === '') {
            // Blank line (empty / whitespace / nbsp / <br>) — drop it, unless it
            // actually holds an image.
            let hasImage = false;
            node.forEach((child) => {
              if (child.type.name === 'image') hasImage = true;
            });
            if (!hasImage) return;
          }
          kept.push(node);
        });
        if (kept.length === slice.content.childCount) return slice;
        return new Slice(Fragment.fromArray(kept), 0, 0);
      },
    },
    onCreate: ({ editor: e }) => updateCounts(e.getText()),
    onUpdate: ({ editor: e }) => updateCounts(e.getText()),
  });

  function updateCounts(text: string) {
    setWordCount(countWords(text));
    setCharCount(text.replace(/\n/g, '').length);
  }

  const { config, updateConfig, geometry } = usePageConfig(editor);

  // Load an existing document when opened via /app/editor?id=… — fetches the
  // full detail (content + version) from the backend.
  useEffect(() => {
    if (!editor || !editingId) return;
    let active = true;
    getDocument(editingId)
      .then((doc) => {
        if (!active) return;
        setTitle(doc.title);
        setCategories(doc.categories);
        setStatus(doc.status);
        setSlugOverride(doc.slug);
        setVersion(doc.version);
        editor.commands.setContent(doc.content || '<p></p>');
      })
      .catch(() => {
        // Documento inexistente ou de outro autor — volta para a lista.
        if (active) router.replace('/app');
      });
    return () => {
      active = false;
    };
  }, [editor, editingId, router]);

  const slug = slugOverride ?? slugify(title);

  async function handleSave() {
    if (!editor || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const trimmedTitle = title.trim() || 'Documento sem título';
      let id = docId;
      let ver = version;
      // Cria o rascunho no primeiro save; depois é só autosave por versão.
      if (!id) {
        const created = await createDocument(trimmedTitle);
        id = created.id;
        ver = created.version;
      }
      const saved = await saveDocument(id, {
        version: ver,
        title: trimmedTitle,
        content: editor.getHTML(),
        slug,
        categories,
      });
      let summary = { ...saved };
      // Reconcilia o estado de publicação escolhido no painel de detalhes.
      if (status === 'published' && saved.status !== 'published') {
        summary = { ...summary, ...(await publishDocument(id)) };
      } else if (status === 'draft' && saved.status === 'published') {
        summary = { ...summary, ...(await unpublishDocument(id)) };
      }
      setDocId(id);
      setVersion(summary.version);
      setStatus(summary.status);
      setSlugOverride(summary.slug);
      const { content: _content, ...listItem } = summary;
      upsert(listItem);
      router.push('/app');
    } catch (err) {
      setSaveError(
        asApiError(err)?.code === 'stale-version'
          ? 'Este documento mudou em outra aba. Recarregue para continuar.'
          : (asApiError(err)?.message ?? 'Não foi possível salvar. Tente de novo.'),
      );
    } finally {
      setSaving(false);
    }
  }

  // Measure the paginated flow (floating-image bounds) and the page count.
  useEffect(() => {
    const el = editor?.view.dom as HTMLElement | undefined;
    if (!el) return;
    const measure = () => {
      setFlowHeight(el.scrollHeight);
      setPageCount(el.querySelector('[data-rm-pagination]')?.children.length ?? 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, [editor]);

  // Track the available desk width so "Ajustar" (fit) can size the page to it.
  useEffect(() => {
    const el = deskRef.current;
    if (!el) return;
    const measure = () => {
      const cs = getComputedStyle(el);
      setDeskWidth(
        el.clientWidth - Number.parseFloat(cs.paddingLeft) - Number.parseFloat(cs.paddingRight),
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    measure();
    return () => observer.disconnect();
  }, []);

  function insertImage(src: string, mode: ImageMode) {
    const probe = new window.Image();
    probe.onload = () => {
      const w = Math.min(360, probe.naturalWidth || 360);
      const aspect = probe.naturalWidth / probe.naturalHeight || 1;
      if (mode === 'inline') {
        // Pass the aspect so the node reserves its height up front and pagination
        // stays correct even before the image finishes loading.
        editor
          ?.chain()
          .focus()
          .insertContent({ type: 'image', attrs: { src, width: w, aspect } })
          .run();
        return;
      }
      nextImageId.current += 1;
      const id = nextImageId.current;
      setImages((prev) => [...prev, { id, src, x: 120, y: 140, w, aspect }]);
      setSelectedId(id);
    };
    probe.src = src;
  }

  function updateImage(id: number, patch: Partial<FloatingImageData>) {
    setImages((prev) => prev.map((image) => (image.id === id ? { ...image, ...patch } : image)));
  }

  function removeImage(id: number) {
    setImages((prev) => prev.filter((image) => image.id !== id));
    setSelectedId(null);
  }

  // "Ajustar" scales the page to the desk width; otherwise use the chosen level.
  const zoomValue =
    zoom === 'fit' ? (deskWidth > 0 ? Math.max(0.2, deskWidth / geometry.width) : 1) : Number(zoom);

  const pageStyle = {
    '--page-bg': config.pageColor,
    '--page-fg': readableTextColor(config.pageColor),
    // scale for display only — pagination still measures the unscaled layout.
    transform: `scale(${zoomValue})`,
    transformOrigin: 'top left',
  } as CSSProperties;

  const detailsPanel = (
    <DocumentDetailsPanel
      title={title}
      onTitleChange={setTitle}
      slug={slug}
      onSlugChange={setSlugOverride}
      categories={categories}
      onCategoriesChange={setCategories}
      status={status}
      onStatusChange={setStatus}
    />
  );

  const saveButton = (
    <Button onClick={handleSave} disabled={saving}>
      <Check />
      {saving ? 'Salvando…' : 'Salvar'}
    </Button>
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* Editor column: toolbar docked to top, status bar to bottom, canvas between. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact bar for narrow screens where the side panel is hidden. */}
        <div className="flex shrink-0 items-center gap-2 border-b bg-card px-3 py-2 lg:hidden">
          <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold">
            {title || 'Documento sem título'}
          </span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <PanelRight />
                Detalhes
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="mlp-scrollbar w-80 gap-0 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Detalhes</SheetTitle>
                <SheetDescription>Título, categorias e publicação.</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-6">{detailsPanel}</div>
            </SheetContent>
          </Sheet>
          {saveButton}
        </div>

        <EditorToolbar
          editor={editor}
          pageConfig={config}
          onPageConfigChange={updateConfig}
          onInsertImage={insertImage}
        />

        <div
          ref={deskRef}
          className="editor-desk mlp-scrollbar min-h-0 flex-1 overflow-auto p-3 sm:p-6 md:p-10"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          {/* Reserves the scaled footprint so the scroll area matches the zoom. */}
          <div
            className="mx-auto"
            style={{ width: geometry.width * zoomValue, height: flowHeight * zoomValue }}
          >
            <div className="relative w-fit" style={pageStyle}>
              <EditorContent editor={editor} />

              {images.map((image) => (
                <FloatingImage
                  key={image.id}
                  data={image}
                  selected={selectedId === image.id}
                  bounds={{ w: geometry.width, h: flowHeight }}
                  onSelect={() => setSelectedId(image.id)}
                  onChange={(patch) => updateImage(image.id, patch)}
                  onRemove={() => removeImage(image.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 rounded-t-xl border-t bg-card px-4 py-2 text-muted-foreground text-xs">
          <span>
            {pageCount} {pageCount === 1 ? 'página' : 'páginas'} · {wordCount}{' '}
            {wordCount === 1 ? 'palavra' : 'palavras'} · {charCount}{' '}
            {charCount === 1 ? 'caractere' : 'caracteres'}
          </span>
          <div className="flex items-center gap-2">
            <span>Zoom</span>
            <Select value={zoom} onValueChange={setZoom}>
              <SelectTrigger size="sm" className="h-7 w-[104px]" aria-label="Zoom">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ZOOM_LEVELS.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Right inspector — the document's metadata, mirroring the left sidebar. */}
      <aside className="hidden w-72 shrink-0 flex-col border-l bg-sidebar lg:flex">
        <div className="shrink-0 border-b px-4 py-3">
          <h2 className="font-display text-sm font-semibold tracking-tight">Detalhes</h2>
          <p className="text-xs text-muted-foreground">Título, categorias e publicação.</p>
        </div>
        <div className="mlp-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">{detailsPanel}</div>
        <div className="shrink-0 border-t px-4 py-3">
          {saveError && (
            <p className="mb-2 text-xs text-destructive" role="alert">
              {saveError}
            </p>
          )}
          <div className="[&>button]:w-full">{saveButton}</div>
        </div>
      </aside>
    </div>
  );
}
