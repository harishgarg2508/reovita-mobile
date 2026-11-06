import { createSlice, nanoid, type PayloadAction } from '@reduxjs/toolkit';

export type UploadSource = 'share-intent' | 'camera' | 'file-picker';

export interface PendingUpload {
  id: string;
  /** Local staged file URI. Removed from disk once the upload completes. */
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  source: UploadSource;
  stagedAt: number;
}

export interface PendingUploadsState {
  items: PendingUpload[];
}

const initialState: PendingUploadsState = { items: [] };

export const pendingUploadsSlice = createSlice({
  name: 'pendingUploads',
  initialState,
  reducers: {
    fileStaged: {
      reducer(state, action: PayloadAction<PendingUpload>) {
        state.items.push(action.payload);
      },
      prepare(file: Omit<PendingUpload, 'id' | 'stagedAt'>) {
        return { payload: { ...file, id: nanoid(), stagedAt: Date.now() } };
      },
    },
    fileRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    stagingCleared(state) {
      state.items = [];
    },
  },
});

export const { fileStaged, fileRemoved, stagingCleared } = pendingUploadsSlice.actions;
export const pendingUploadsReducer = pendingUploadsSlice.reducer;
