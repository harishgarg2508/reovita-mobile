// Lint rules: Expo base config + Feature-Sliced Design layer boundaries.
const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
const boundaries = require('eslint-plugin-boundaries');

module.exports = defineConfig([
  expo,
  {
    // Only shared/api/client.ts may import axios. Everything else uses `api` from '@shared/api'.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/shared/api/client.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{ name: 'axios', message: "Import { api } from '@shared/api' instead.", allowTypeImports: true }],
      }],
    },
  },
  {
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'app-root', pattern: 'src/app-root/*' },
        { type: 'widgets', pattern: 'src/widgets/*', capture: ['slice'] },
        { type: 'features', pattern: 'src/features/*', capture: ['slice'] },
        { type: 'entities', pattern: 'src/entities/*', capture: ['slice'] },
        { type: 'shared', pattern: 'src/shared/*' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx'],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            { from: { element: { type: 'app' } }, allow: { to: { element: { type: ['app-root', 'widgets', 'features', 'entities', 'shared'] } } } },
            { from: { element: { type: 'app-root' } }, allow: { to: { element: { type: ['app-root', 'widgets', 'features', 'entities', 'shared'] } } } },
            { from: { element: { type: 'widgets' } }, allow: { to: { element: { type: ['features', 'entities', 'shared'] } } } },
            { from: { element: { type: 'features' } }, allow: { to: { element: { type: ['entities', 'shared'] } } } },
            { from: { element: { type: 'entities' } }, allow: { to: { element: { type: ['shared'] } } } },
            { from: { element: { type: 'shared' } }, allow: { to: { element: { type: ['shared'] } } } },
          ],
        },
      ],
      'boundaries/no-private': ['error', { allowUncles: false }],
    },
  },
]);
