import { Image } from '@tiptap/extension-image';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ResizableImageView } from './resizable-image-view';

/**
 * Inline image that flows with the text (alignable via the paragraph) and can
 * be resized with a corner handle.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = element.style.width || element.getAttribute('width');
          return value ? Number.parseInt(value, 10) : null;
        },
        renderHTML: (attributes) =>
          attributes.width ? { style: `width: ${attributes.width}px` } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
