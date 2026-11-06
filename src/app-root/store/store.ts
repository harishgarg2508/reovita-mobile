import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';

import { consentReducer } from '@/entities/consent';
import { preferencesReducer } from '@/entities/preferences';
import { sessionReducer } from '@/entities/session';
import { pendingUploadsReducer } from '@/features/report-upload';

// The signed-in session survives app restarts, so the user stays signed in until they sign out.
const persistedSessionReducer = persistReducer(
  { key: 'session', storage: AsyncStorage, version: 1 },
  sessionReducer,
);

// The consent flow (current screen and each consent choice) survives app restarts.
const persistedConsentReducer = persistReducer(
  { key: 'consent', storage: AsyncStorage, version: 1 },
  consentReducer,
);

// Root reducer. Each slice is owned by its FSD layer and reached only through its index.ts.
const rootReducer = combineReducers({
  session: persistedSessionReducer,
  pendingUploads: pendingUploadsReducer,
  preferences: preferencesReducer,
  consent: persistedConsentReducer,
});

export type RootState = ReturnType<typeof rootReducer>;

export function createAppStore(preloadedState?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // redux-persist dispatches these internal actions.
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });
}

// Single app-wide store instance, and the persistor that writes it to storage.
export const store = createAppStore();
export const persistor = persistStore(store);

export type AppStore = typeof store;
export type AppDispatch = AppStore['dispatch'];
