import { EditorSkeleton } from '../../../components/system/skeletons/editor-skeleton';
import '../../../components/app/editor/editor.css';

export default function Loading() {
  return (
    <div className="h-[calc(100svh-3.5rem)] overflow-hidden">
      <EditorSkeleton />
    </div>
  );
}
