import { input, checkbox } from '@inquirer/prompts';
import { validateProjectName } from '../utils/validator.js';
import { buildUserConfigFromPreset, listPresetsForPrompt } from '../config/presets.js';
import {
  defaultFeaturesForMode,
  defaultStackForProjectType,
  hasBackendStack,
  hasFrontendStack,
  mergeFeatureObjects,
  normalizeFeatures,
  sanitizeFeaturesForContext,
} from '../config/userConfig.js';
import { resolveFeatureDependenciesInteractive } from '../engine/dependencies.js';
import { promptSearchMultiToggle, promptSearchSelect } from './searchPrompts.js';

/** @typedef {import('../config/userConfig.js').UserConfig} UserConfig */
/** @typedef {import('../config/userConfig.js').FeaturesShape} FeaturesShape */
/** @typedef {import('../config/userConfig.js').FeatureCategory} FeatureCategory */
/** @typedef {import('../config/userConfig.js').ProjectType} ProjectType */
/** @typedef {import('../config/userConfig.js').SystemMode} SystemMode */

const PROJECT_TYPE_CHOICES = [
  { name: 'Web App', value: 'web' },
  { name: 'API / Backend', value: 'api' },
  { name: 'CLI Tool', value: 'cli' },
  { name: 'Fullstack App', value: 'fullstack' },
  { name: 'Microservices System', value: 'microservices' },
  { name: 'Library / NPM Package', value: 'library' },
  { name: 'AI / ML Project', value: 'ai-ml' },
  { name: 'Chrome Extension', value: 'chrome-extension' },
  { name: 'Desktop App (Electron)', value: 'electron' },
  { name: 'Mobile App (React Native)', value: 'react-native' },
  { name: 'Static Site', value: 'static-site' },
  { name: 'Dev Tooling', value: 'dev-tooling' },
  { name: 'Custom (manual layout)', value: 'custom' },
];

const MODE_CHOICES = [
  { name: 'Minimal — hackathon / prototype', value: 'minimal' },
  { name: 'Standard — balanced defaults', value: 'standard' },
  { name: 'Scalable — production-ready', value: 'scalable' },
  { name: 'Enterprise — strict architecture', value: 'enterprise' },
  { name: 'Experimental — bleeding edge', value: 'experimental' },
  { name: 'Custom — full control', value: 'custom' },
];

const EXTRA_CHOICES = [
  { name: 'Initialize Git', value: 'git' },
  { name: 'Install dependencies', value: 'installDeps' },
];

const CUSTOM_LAYOUT_CHOICES = [
  { name: 'Web — React (Vite) SPA', value: 'web' },
  { name: 'API — Node (Express)', value: 'api' },
  { name: 'CLI — Node', value: 'cli' },
  { name: 'Full-stack — client + Express', value: 'fullstack' },
  { name: 'Shared package only (library-style)', value: 'library' },
];

/** @type {Record<FeatureCategory, { name: string; value: string }[]>} */
const CATEGORY_CHOICES = {
  core: [
    { name: 'Authentication (JWT)', value: 'auth-jwt' },
    { name: 'Authentication (OAuth)', value: 'auth-oauth' },
    { name: 'Database', value: 'database' },
    { name: 'API layer', value: 'api-layer' },
    { name: 'State management', value: 'state-management' },
    { name: 'Routing', value: 'routing' },
  ],
  dev: [
    { name: 'Linting (ESLint)', value: 'eslint' },
    { name: 'Formatting (Prettier)', value: 'prettier' },
    { name: 'Git hooks (Husky)', value: 'husky' },
    { name: 'Testing (Jest / Vitest)', value: 'testing' },
    { name: 'TypeScript', value: 'typescript' },
  ],
  infra: [
    { name: 'Docker', value: 'docker' },
    { name: 'CI/CD config', value: 'cicd' },
    { name: 'Environment validation', value: 'env-validation' },
    { name: 'Logging system', value: 'logging' },
    { name: 'Rate limiting', value: 'rate-limiting' },
  ],
  frontend: [
    { name: 'Tailwind CSS', value: 'tailwind' },
    { name: 'UI library (MUI, ShadCN, …)', value: 'ui-library' },
    { name: 'Form handling', value: 'forms' },
    { name: 'Animations', value: 'animations' },
  ],
  backend: [
    { name: 'REST API', value: 'rest' },
    { name: 'GraphQL', value: 'graphql' },
    { name: 'WebSockets', value: 'websockets' },
    { name: 'Background jobs', value: 'background-jobs' },
    { name: 'Caching (Redis)', value: 'redis-cache' },
  ],
  advanced: [
    { name: 'Feature flags', value: 'feature-flags' },
    { name: 'Monitoring hooks', value: 'monitoring' },
    { name: 'Analytics', value: 'analytics' },
    { name: 'Multi-tenant support', value: 'multi-tenant' },
  ],
};

const CATEGORY_LABELS = /** @type {Record<FeatureCategory, string>} */ ({
  core: 'Core features',
  dev: 'Dev experience',
  infra: 'Infrastructure',
  frontend: 'Frontend options',
  backend: 'Backend options',
  advanced: 'Advanced',
});

/**
 * Resolve cross-feature deps (interactive), then stack-aware sanitization.
 * @param {UserConfig} draftConfig
 * @param {FeaturesShape | unknown} features
 */
async function finalizeFeatures(draftConfig, features) {
  const resolved = await resolveFeatureDependenciesInteractive(
    draftConfig,
    features,
  );
  return sanitizeFeaturesForContext({ ...draftConfig, features: resolved });
}

/** @returns {import('../config/userConfig.js').StackConfig} */
function emptyStack() {
  return { frontend: null, backend: null, cli: null };
}

/**
 * @param {ProjectType} layout
 * @returns {import('../config/userConfig.js').StackConfig}
 */
function stackFromLayoutChoice(layout) {
  const d = defaultStackForProjectType(layout);
  return d ?? emptyStack();
}

/**
 * @param {SystemMode} mode
 * @returns {string[]}
 */
function defaultExtraKeys(mode) {
  if (mode === 'scalable' || mode === 'enterprise') {
    return ['git', 'installDeps'];
  }
  if (mode === 'minimal') return ['git'];
  return ['git'];
}

/**
 * @param {FeatureCategory} cat
 * @param {string[]} selected
 * @param {{ name: string; value: string }[]} allowedChoices
 * @returns {string[]}
 */
function filterValidCategoryValues(cat, selected, allowedChoices) {
  const allowed = new Set(allowedChoices.map((c) => c.value));
  return selected.filter((id) => allowed.has(id));
}

/**
 * Context-aware options for a category (stack + merged features).
 * @param {UserConfig} draftConfig
 * @param {FeatureCategory} cat
 * @returns {{ name: string; value: string }[]}
 */
function getChoicesForCategory(draftConfig, cat) {
  const all = CATEGORY_CHOICES[cat];
  let out = [...all];

  if (cat === 'core') {
    if (!hasBackendStack(draftConfig)) {
      out = out.filter((c) => c.value !== 'database');
    }
    if (!hasFrontendStack(draftConfig)) {
      out = out.filter(
        (c) => !['state-management', 'routing'].includes(c.value),
      );
    }
  }

  if (cat === 'infra' && !hasBackendStack(draftConfig)) {
    out = out.filter((c) => c.value !== 'rate-limiting');
  }

  if (cat === 'backend' && !hasBackendStack(draftConfig)) {
    return [];
  }

  return out;
}

/**
 * Two-step frontend: Tailwind unlocks UI library / forms / animations.
 * @param {FeaturesShape} merged
 * @param {UserConfig} draftConfig
 * @returns {Promise<string[]>}
 */
async function promptFrontendFeatures(merged, draftConfig) {
  const existing = merged.frontend ?? [];

  const step1 = await promptSearchMultiToggle({
    message:
      'Frontend — styling (enable Tailwind to unlock UI components, forms, animations)',
    choices: [{ name: 'Tailwind CSS', value: 'tailwind' }],
    defaultSelected: existing.includes('tailwind') ? ['tailwind'] : [],
  });

  let next = existing.filter(
    (v) =>
      v !== 'tailwind' &&
      !['ui-library', 'forms', 'animations'].includes(v),
  );
  if (step1.includes('tailwind')) {
    next = [...new Set([...next, 'tailwind'])];
  }

  if (!next.includes('tailwind')) {
    return next;
  }

  const step2Choices = [
    { name: 'UI library (MUI, ShadCN, …)', value: 'ui-library' },
    { name: 'Form handling', value: 'forms' },
    { name: 'Animations', value: 'animations' },
  ];
  const s2 = await promptSearchMultiToggle({
    message: 'Frontend — components & motion',
    choices: step2Choices,
    defaultSelected: existing.filter((v) =>
      ['ui-library', 'forms', 'animations'].includes(v),
    ),
  });

  return [...new Set([...next, ...s2])];
}

/**
 * @param {UserConfig} config
 * @returns {FeatureCategory[]}
 */
function applicableFeatureCategories(config) {
  /** @type {FeatureCategory[]} */
  const out = ['core', 'dev', 'infra', 'advanced'];
  if (hasFrontendStack(config)) out.push('frontend');
  if (hasBackendStack(config)) out.push('backend');
  return out;
}

/**
 * @param {FeaturesShape} base
 * @param {FeatureCategory[]} applicable
 * @param {UserConfig} draftConfig type / mode / stack + projectName for context
 * @returns {Promise<FeaturesShape>}
 */
async function promptFeatureCategories(base, applicable, draftConfig) {
  const groups = await promptSearchMultiToggle({
    message:
      'Customize feature groups (others keep mode defaults). Toggle groups, then choose → Done.',
    choices: applicable.map((value) => ({
      name: CATEGORY_LABELS[value],
      value,
    })),
    defaultSelected: [],
  });

  /** @type {FeatureCategory[]} */
  const toCustomize = /** @type {FeatureCategory[]} */ (groups);
  if (toCustomize.length === 0) {
    return finalizeFeatures(draftConfig, normalizeFeatures(base));
  }

  let merged = normalizeFeatures(base);

  for (const cat of toCustomize) {
    if (!applicable.includes(cat)) continue;

    if (cat === 'frontend' && hasFrontendStack(draftConfig)) {
      merged.frontend = await promptFrontendFeatures(merged, draftConfig);
      merged = normalizeFeatures(merged);
      continue;
    }

    const choices = getChoicesForCategory(draftConfig, cat);
    if (!choices.length) continue;

    const preset = filterValidCategoryValues(
      cat,
      merged[cat] ?? [],
      choices,
    );

    const picked = await promptSearchMultiToggle({
      message: `${CATEGORY_LABELS[cat]} — select options (toggle each, then → Done)`,
      choices,
      defaultSelected: preset,
    });

    merged = mergeFeatureObjects(merged, { [cat]: picked ?? [] });
    merged = normalizeFeatures(merged);
  }

  return finalizeFeatures(draftConfig, merged);
}

/**
 * @param {string} projectName
 * @param {Omit<UserConfig, 'projectName'>} partial
 * @returns {Promise<UserConfig>}
 */
async function promptPresetModification(projectName, partial) {
  const extraDefaults = [];
  if (partial.extras.git) extraDefaults.push('git');
  if (partial.extras.installDeps) extraDefaults.push('installDeps');

  const extrasList = await checkbox({
    message: 'Extras',
    choices: EXTRA_CHOICES.map((c) => ({
      ...c,
      checked: extraDefaults.includes(c.value),
    })),
  });

  const baseFeatures = normalizeFeatures(partial.features);
  const draftConfig = /** @type {UserConfig} */ ({
    projectName,
    type: partial.type,
    mode: partial.mode,
    stack: partial.stack,
    features: baseFeatures,
    extras: { git: false, installDeps: false },
  });

  const applicable = applicableFeatureCategories(draftConfig);
  const features = await promptFeatureCategories(
    baseFeatures,
    applicable,
    draftConfig,
  );

  return {
    projectName,
    type: partial.type,
    mode: partial.mode,
    stack: partial.stack,
    features,
    extras: {
      git: extrasList.includes('git'),
      installDeps: extrasList.includes('installDeps'),
    },
  };
}

/**
 * Full interactive path: type, mode, stack, features, extras.
 * @param {string} projectName
 * @returns {Promise<UserConfig>}
 */
async function getCustomUserConfig(projectName) {
  const type = /** @type {ProjectType} */ (
    await promptSearchSelect({
      message: 'Project type',
      choices: PROJECT_TYPE_CHOICES,
      defaultValue: 'web',
    })
  );

  const mode = /** @type {SystemMode} */ (
    await promptSearchSelect({
      message: 'System mode',
      choices: MODE_CHOICES,
      defaultValue: 'standard',
    })
  );

  /** @type {import('../config/userConfig.js').StackConfig} */
  let stack = emptyStack();

  if (type === 'custom') {
    const layout = /** @type {ProjectType} */ (
      await promptSearchSelect({
        message: 'Choose base layout (framework)',
        choices: CUSTOM_LAYOUT_CHOICES,
        defaultValue: 'web',
      })
    );
    stack = stackFromLayoutChoice(layout);
  } else {
    const preset = defaultStackForProjectType(type);
    stack = preset ?? emptyStack();
  }

  const extraDefaults = defaultExtraKeys(mode);
  const extrasList = await checkbox({
    message: 'Extras',
    choices: EXTRA_CHOICES.map((c) => ({
      ...c,
      checked: extraDefaults.includes(c.value),
    })),
  });

  const baseFeatures = defaultFeaturesForMode(mode);
  const draftConfig = /** @type {UserConfig} */ ({
    projectName,
    type,
    mode,
    stack,
    features: baseFeatures,
    extras: { git: false, installDeps: false },
  });

  const applicable = applicableFeatureCategories(draftConfig);
  const features = await promptFeatureCategories(
    baseFeatures,
    applicable,
    draftConfig,
  );

  return {
    projectName,
    type,
    mode,
    stack,
    features,
    extras: {
      git: extrasList.includes('git'),
      installDeps: extrasList.includes('installDeps'),
    },
  };
}

/**
 * Interactive configuration: Quick Preset or Custom Setup, then full or preset-driven config.
 * @returns {Promise<UserConfig>}
 */
export async function getUserConfig() {
  const projectName = String(
    await input({
      message: 'Project name',
      default: 'my-app',
      validate: validateProjectName,
    }),
  ).trim();

  const setupStyle = await promptSearchSelect({
    message: 'Choose setup style',
    choices: [
      { name: 'Quick Preset — fast defaults', value: 'preset' },
      { name: 'Custom Setup — deep customization', value: 'custom' },
    ],
    defaultValue: 'preset',
  });

  if (setupStyle === 'custom') {
    return getCustomUserConfig(projectName);
  }

  const presetChoices = listPresetsForPrompt();
  const defaultPresetId =
    presetChoices.find((c) => c.value === 'fullstack')?.value ??
    presetChoices[0]?.value ??
    'fullstack';

  const presetId = await promptSearchSelect({
    message: 'Pick a preset',
    choices: presetChoices,
    defaultValue: defaultPresetId,
  });

  const partial = buildUserConfigFromPreset(presetId);

  const presetAction = await promptSearchSelect({
    message: 'Preset loaded — what next?',
    choices: [
      { name: 'Accept and continue', value: 'accept' },
      { name: 'Modify preset (features & extras)', value: 'modify' },
      { name: 'Switch to Custom Setup', value: 'custom' },
    ],
    defaultValue: 'accept',
  });

  if (presetAction === 'custom') {
    return getCustomUserConfig(projectName);
  }

  if (presetAction === 'accept') {
    const draft = /** @type {UserConfig} */ ({
      projectName,
      type: partial.type,
      mode: partial.mode,
      stack: partial.stack,
      features: partial.features,
      extras: partial.extras,
    });
    const features = await finalizeFeatures(draft, partial.features);
    return { projectName, ...partial, features };
  }

  return promptPresetModification(projectName, partial);
}

/**
 * Blueprint Intelligence: merge suggested features only (stack unchanged).
 * @returns {Promise<'accept' | 'ignore'>}
 */
export async function promptBlueprintDecision() {
  const choice = await promptSearchSelect({
    message: 'Blueprint suggestions',
    choices: [
      {
        name: 'Accept suggestions (add recommended features)',
        value: 'accept',
      },
      {
        name: 'Continue with original config',
        value: 'ignore',
      },
    ],
    defaultValue: 'accept',
  });
  return /** @type {'accept' | 'ignore'} */ (choice);
}

/**
 * After preview: continue, re-run config, or abort.
 * @returns {Promise<'continue' | 'edit' | 'cancel'>}
 */
export async function confirmProjectPreview() {
  const action = await promptSearchSelect({
    message: 'Final confirmation',
    choices: [
      { name: 'Generate project', value: 'continue' },
      { name: 'Edit configuration', value: 'edit' },
      { name: 'Cancel', value: 'cancel' },
    ],
    defaultValue: 'continue',
  });
  return /** @type {'continue' | 'edit' | 'cancel'} */ (action);
}
