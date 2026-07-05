import { Suspense } from 'react';
import { DocumentEditor } from '../../../components/app/editor/document-editor';
import '../../../components/app/editor/editor.css';

export default function EditorPage() {
  return (
    // Definite height (viewport minus the 56px app header) so the editor owns a
    // bounded box: the canvas scrolls internally while the toolbar, status bar
    // and side panel stay fixed.
    <div className="h-[calc(100svh-3.5rem)] overflow-hidden">
      <Suspense>
        <DocumentEditor />
      </Suspense>
    </div>
  );
}
