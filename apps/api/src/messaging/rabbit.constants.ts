// Topology shared with the Python indexing service (Spec 2). Keep in sync.
export const DOCUMENTS_EXCHANGE = 'mlp.documents';
export const RK_INDEX_REQUESTED = 'document.index.requested';
export const RK_INDEX_COMPLETED = 'document.index.completed';
// Queue the Nest API consumes: completion events published by the Python worker.
export const INDEX_COMPLETED_QUEUE = 'mlp.index.completed';
