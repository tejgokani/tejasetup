/**
 * Reusable, extensible quick-start presets (stack + features + structure via type/mode).
 * Register additional presets at runtime with {@link registerPreset}.
 */

import {
  createEmptyFeatures,
  defaultFeaturesForMode,
  mergeFeatureObjects,
  normalizeFeatures,
} from './userConfig.js';

/**
 * @typedef {import('./userConfig.js').ProjectType} ProjectType
 * @typedef {import('./userConfig.js').SystemMode} SystemMode
 * @typedef {import('./userConfig.js').StackConfig} StackConfig
 * @typedef {import('./userConfig.js').FeaturesShape} FeaturesShape
 */

/**
 * @typedef {Object} PresetDefinition
 * @property {string} id Stable id (kebab-case).
 * @property {string} label Short title for menus.
 * @property {string} description One-line summary for search prompts.
 * @property {ProjectType} type Drives layout / workspaces.
 * @property {SystemMode} mode Drives docs, tests, scripts folders.
 * @property {StackConfig} stack Frontend / backend / CLI tooling.
 * @property {FeaturesShape | Partial<FeaturesShape>} features Merged and normalized when applied.
 * @property {{ git: boolean; installDeps: boolean }} extras
 */

/** @type {Map<string, PresetDefinition>} */
const presetRegistry = new Map();

/**
 * @param {PresetDefinition} def
 */
function putPreset(def) {
  presetRegistry.set(def.id, def);
}

/**
 * Built-in presets (order matches product default list).
 * @type {PresetDefinition[]}
 */
const BUILTIN_PRESETS = [
  {
    id: 'hackathon',
    label: 'Hackathon Starter',
    description: 'Minimal SPA — Vite + React, lean features',
    type: 'web',
    mode: 'minimal',
    stack: { frontend: 'react-vite', backend: null, cli: null },
    features: mergeFeatureObjects(createEmptyFeatures(), {
      dev: ['typescript', 'eslint'],
      core: ['routing'],
    }),
    extras: { git: true, installDeps: false },
  },
  {
    id: 'saas',
    label: 'SaaS Starter',
    description: 'Full-stack app — auth, DB, payments-ready stack',
    type: 'fullstack',
    mode: 'scalable',
    stack: { frontend: 'react-vite', backend: 'node-express', cli: null },
    features: mergeFeatureObjects(defaultFeaturesForMode('scalable'), {
      core: [
        'authentication',
        'database',
        'api-layer',
        'state-management',
        'routing',
      ],
      dev: ['husky'],
      frontend: ['tailwind', 'ui-library', 'forms', 'animations'],
      backend: ['rest', 'graphql', 'websockets'],
      infra: ['cicd'],
      advanced: ['analytics', 'monitoring', 'multi-tenant'],
    }),
    extras: { git: true, installDeps: true },
  },
  {
    id: 'api-server',
    label: 'API Server',
    description: 'Express API — REST, persistence, ops',
    type: 'api',
    mode: 'scalable',
    stack: { frontend: null, backend: 'node-express', cli: null },
    features: mergeFeatureObjects(defaultFeaturesForMode('scalable'), {
      core: ['database', 'api-layer'],
      backend: ['rest', 'graphql', 'redis-cache'],
    }),
    extras: { git: true, installDeps: true },
  },
  {
    id: 'fullstack',
    label: 'Fullstack App',
    description: 'Balanced client + API — standard mode',
    type: 'fullstack',
    mode: 'standard',
    stack: { frontend: 'react-vite', backend: 'node-express', cli: null },
    features: mergeFeatureObjects(defaultFeaturesForMode('standard'), {
      core: ['api-layer', 'routing', 'state-management'],
      frontend: ['tailwind', 'forms'],
      backend: ['rest'],
    }),
    extras: { git: true, installDeps: true },
  },
  {
    id: 'npm-package',
    label: 'NPM Package',
    description: 'Library workspace — TS, lint, format',
    type: 'library',
    mode: 'minimal',
    stack: { frontend: null, backend: null, cli: null },
    features: mergeFeatureObjects(createEmptyFeatures(), {
      dev: ['typescript', 'eslint', 'prettier'],
    }),
    extras: { git: true, installDeps: false },
  },
  {
    id: 'ai-project',
    label: 'AI Project',
    description: 'ML/API service — jobs, Docker, observability',
    type: 'ai-ml',
    mode: 'scalable',
    stack: { frontend: null, backend: 'node-express', cli: null },
    features: mergeFeatureObjects(defaultFeaturesForMode('scalable'), {
      core: ['database', 'api-layer'],
      backend: ['rest', 'background-jobs'],
      infra: ['docker', 'logging'],
      advanced: ['monitoring'],
    }),
    extras: { git: true, installDeps: true },
  },
];

for (const def of BUILTIN_PRESETS) {
  putPreset(def);
}

/**
 * Register or replace a preset (e.g. from a plugin). Use unique ids.
 * @param {PresetDefinition} def
 */
export function registerPreset(def) {
  putPreset(def);
}

/**
 * @param {string} id
 * @returns {PresetDefinition | undefined}
 */
export function getPreset(id) {
  return presetRegistry.get(id);
}

/**
 * @returns {PresetDefinition[]}
 */
export function listPresets() {
  return [...presetRegistry.values()];
}

/**
 * Ids in stable display order (built-ins first, then registration order for any extras).
 * @returns {string[]}
 */
export function listPresetIds() {
  return [...presetRegistry.keys()];
}

/**
 * Choices for searchable select prompts.
 * @returns {{ name: string; value: string }[]}
 */
export function listPresetsForPrompt() {
  return listPresets().map((p) => ({
    name: `${p.label} — ${p.description}`,
    value: p.id,
  }));
}

/**
 * Partial user config from a preset (no projectName).
 * @param {string} presetId
 * @returns {Omit<import('./userConfig.js').UserConfig, 'projectName'>}
 */
export function buildUserConfigFromPreset(presetId) {
  const p = getPreset(presetId);
  if (!p) {
    throw new Error(`Unknown preset: ${presetId}`);
  }
  return {
    type: p.type,
    mode: p.mode,
    stack: { ...p.stack },
    features: normalizeFeatures(p.features),
    extras: { ...p.extras },
  };
}
