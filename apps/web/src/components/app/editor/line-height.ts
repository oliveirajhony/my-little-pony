// Import Extension from @tiptap/react (not @tiptap/core) so it's the exact same
// instance the editor uses — otherwise the commands never register on the editor.
import { Extension } from '@tiptap/react';

export type LineHeightOptions = {
  /** Node types the line spacing applies to. */
  types: string[];
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    lineHeight: {
      /** Set the line spacing (e.g. "1", "1.5", "2") on the selected blocks. */
      setLineHeight: (height: string) => ReturnType;
      /** Clear the line spacing, reverting to the stylesheet default. */
      unsetLineHeight: () => ReturnType;
    };
  }
}

/**
 * Adds a `lineHeight` attribute (line spacing) to block nodes, rendered as an
 * inline style. Applies to every block of the configured types in the current
 * selection — select some paragraphs and raise or lower their spacing.
 */
export const LineHeight = Extension.create<LineHeightOptions>({
  name: 'lineHeight',

  addOptions() {
    return { types: ['paragraph'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes.lineHeight ? { style: `line-height: ${attributes.lineHeight}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (height: string) =>
        ({ commands }) =>
          this.options.types.every((type) =>
            commands.updateAttributes(type, { lineHeight: height }),
          ),
      unsetLineHeight:
        () =>
        ({ commands }) =>
          this.options.types.every((type) => commands.resetAttributes(type, 'lineHeight')),
    };
  },
});
