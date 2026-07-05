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
      // Natural width/height ratio, so the node reserves its height before the
      // image loads — keeps pagination from drifting on async loads.
      aspect: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-aspect');
          return value ? Number.parseFloat(value) : null;
        },
        renderHTML: (attributes) =>
          attributes.aspect ? { 'data-aspect': String(attributes.aspect) } : {},
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
