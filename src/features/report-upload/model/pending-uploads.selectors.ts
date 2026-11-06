import type { PendingUploadsState } from './pending-uploads.slice';

interface PendingUploadsRootState {
  pendingUploads: PendingUploadsState;
}

export const selectPendingUploads = (state: PendingUploadsRootState) => state.pendingUploads.items;
export const selectPendingCount = (state: PendingUploadsRootState) => state.pendingUploads.items.length;
