'use client';

import type { Editor } from '@tiptap/react';
import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_PAGE_CONFIG, type PageConfig, resolveGeometry } from './page-config';

/**
 * Owns the page layout (paper size, orientation, margins, color) and keeps the
 * pagination extension in sync from a single place.
 */
export function usePageConfig(editor: Editor | null) {
  const [config, setConfig] = useState<PageConfig>(DEFAULT_PAGE_CONFIG);
  const geometry = useMemo(() => resolveGeometry(config), [config]);

  useEffect(() => {
    if (!editor) return;
    editor
      .chain()
      .updatePageWidth(geometry.width)
      .updatePageHeight(geometry.height)
      .updateMargins(geometry.margins)
      .run();
  }, [editor, geometry]);

  const updateConfig = (patch: Partial<PageConfig>) => setConfig((prev) => ({ ...prev, ...patch }));

  return { config, updateConfig, geometry };
}
