/**
 * @typedef {'react-vite' | null} StackFrontend
 * @typedef {'node-express' | null} StackBackend
 * @typedef {'node' | null} StackCli
 *
 * @typedef {Object} StackConfig
 * @property {StackFrontend} frontend
 * @property {StackBackend} backend
 * @property {StackCli} cli
 */

/**
 * @typedef {'web' | 'api' | 'cli' | 'fullstack' | 'microservices' | 'library' | 'ai-ml' | 'chrome-extension' | 'electron' | 'react-native' | 'static-site' | 'dev-tooling' | 'custom'} ProjectType
 */

/**
 * @typedef {'minimal' | 'standard' | 'scalable' | 'enterprise' | 'experimental' | 'custom'} SystemMode
 */

/**
 * @typedef {'core' | 'dev' | 'infra' | 'frontend' | 'backend' | 'advanced'} FeatureCategory
 */

/**
 * Structured feature selections (prompt output + manifest).
 * @typedef {Object} FeaturesShape
 * @property {string[]} core
 * @property {string[]} dev
 * @property {string[]} infra
 * @property {string[]} frontend
 * @property {string[]} backend
 * @property {string[]} advanced
 */

/**
 * @typedef {Object} UserConfig
 * @property {string} projectName
 * @property {ProjectType} type
 * @property {SystemMode} mode
 * @property {StackConfig} stack
 * @property {FeaturesShape} features
 * @property {{ git: boolean, installDeps: boolean }} extras
 */

/**
 * Legacy scaffold plugin ids (auth / database / logging generators).
 * @typedef {'auth' | 'database' | 'logging'} ScaffoldFeatureId
 */

export const FEATURE_CATEGORIES = /** @type {const} */ ([
  'core',
  'dev',
  'infra',
  'frontend',
  'backend',
  'advanced',
]);

/** @type {ProjectType[]} */
export const PROJECT_TYPES = [
  'web',
  'api',
  'cli',
  'fullstack',
  'microservices',
  'library',
  'ai-ml',
  'chrome-extension',
  'electron',
  'react-native',
  'static-site',
  'dev-tooling',
  'custom',
];

/** @type {SystemMode[]} */
export const SYSTEM_MODES = [
  'minimal',
  'standard',
  'scalable',
  'enterprise',
  'experimental',
  'custom',
];

/**
 * @returns {FeaturesShape}
 */
export function createEmptyFeatures() {
  return {
    core: [],
    dev: [],
    infra: [],
    frontend: [],
    backend: [],
    advanced: [],
  };
}

/**
 * @param {FeaturesShape} a
 * @param {Partial<FeaturesShape>} b
 * @returns {FeaturesShape}
 */
export function mergeFeatureObjects(a, b) {
  const out = createEmptyFeatures();
  for (const k of FEATURE_CATEGORIES) {
    const base = a[k] ?? [];
    const extra = b[k] ?? [];
    out[k] = [...new Set([...base, ...extra])];
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {FeaturesShape}
 */
export function normalizeFeatures(raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const o = /** @type {Record<string, unknown>} */ (raw);
    const out = createEmptyFeatures();
    for (const k of FEATURE_CATEGORIES) {
      const v = o[k];
      out[k] = Array.isArray(v)
        ? [...new Set(v.map((x) => String(x)))]
        : [];
    }
    return out;
  }
  if (Array.isArray(raw)) {
    const out = createEmptyFeatures();
    for (const id of raw.map((x) => String(x))) {
      if (id === 'auth') out.core.push('auth-jwt');
      else if (id === 'database') out.core.push('database');
      else if (id === 'logging') out.infra.push('logging');
    }
    for (const k of FEATURE_CATEGORIES) {
      out[k] = [...new Set(out[k])];
    }
    return out;
  }
  return createEmptyFeatures();
}

/**
 * @param {FeaturesShape} features
 * @returns {string[]}
 */
export function flattenFeatures(features) {
  const out = [];
  for (const k of FEATURE_CATEGORIES) {
    out.push(...(features[k] ?? []));
  }
  return [...new Set(out)];
}

/**
 * @param {UserConfig | { features?: unknown }} config
 * @returns {string[]}
 */
export function flattenConfigFeatures(config) {
  return flattenFeatures(normalizeFeatures(config.features));
}

/**
 * @param {string[]} flat
 * @returns {boolean}
 */
function flatHasAuth(flat) {
  return (
    flat.includes('authentication') ||
    flat.includes('auth-jwt') ||
    flat.includes('auth-oauth')
  );
}

/**
 * @param {UserConfig | { features?: unknown }} config
 * @param {ScaffoldFeatureId} id
 * @returns {boolean}
 */
export function hasScaffoldFeature(config, id) {
  const flat = flattenConfigFeatures(config);
  if (id === 'auth') return flatHasAuth(flat);
  if (id === 'database') return flat.includes('database');
  if (id === 'logging') return flat.includes('logging');
  return false;
}

/**
 * @returns {ScaffoldFeatureId[]}
 */
export function scaffoldFeatureIdsFromConfig(config) {
  /** @type {ScaffoldFeatureId[]} */
  const out = [];
  if (hasScaffoldFeature(config, 'auth')) out.push('auth');
  if (hasScaffoldFeature(config, 'database')) out.push('database');
  if (hasScaffoldFeature(config, 'logging')) out.push('logging');
  return out;
}

/**
 * @param {SystemMode} mode
 * @returns {FeaturesShape}
 */
export function defaultFeaturesForMode(mode) {
  const z = createEmptyFeatures();
  switch (mode) {
    case 'minimal':
      return z;
    case 'standard':
      return mergeFeatureObjects(z, {
        dev: ['typescript', 'eslint', 'prettier'],
        infra: ['logging'],
      });
    case 'scalable':
      return mergeFeatureObjects(z, {
        core: ['api-layer'],
        dev: ['typescript', 'eslint', 'prettier', 'testing'],
        infra: ['docker', 'logging', 'env-validation', 'rate-limiting'],
        backend: ['rest'],
      });
    case 'enterprise':
      return mergeFeatureObjects(z, {
        core: ['authentication', 'database', 'api-layer'],
        dev: ['typescript', 'eslint', 'prettier', 'husky', 'testing'],
        infra: ['docker', 'cicd', 'env-validation', 'logging', 'rate-limiting'],
        backend: ['rest'],
        advanced: ['monitoring'],
      });
    case 'experimental':
      return mergeFeatureObjects(z, {
        dev: ['typescript', 'eslint', 'testing'],
        infra: ['logging'],
        advanced: ['feature-flags'],
      });
    case 'custom':
    default:
      return z;
  }
}

/**
 * @param {ProjectType} type
 * @returns {StackConfig | null}
 */
export function defaultStackForProjectType(type) {
  switch (type) {
    case 'web':
    case 'chrome-extension':
    case 'static-site':
      return { frontend: 'react-vite', backend: null, cli: null };
    case 'api':
    case 'microservices':
    case 'ai-ml':
      return { frontend: null, backend: 'node-express', cli: null };
    case 'cli':
    case 'dev-tooling':
      return { frontend: null, backend: null, cli: 'node' };
    case 'fullstack':
      return { frontend: 'react-vite', backend: 'node-express', cli: null };
    case 'electron':
      return { frontend: 'react-vite', backend: null, cli: null };
    case 'library':
    case 'react-native':
      return { frontend: null, backend: null, cli: null };
    case 'custom':
      return null;
    default:
      return { frontend: null, backend: null, cli: null };
  }
}

/**
 * @param {ProjectType} type
 */
export function isApiFocusedType(type) {
  return (
    type === 'api' ||
    type === 'microservices' ||
    type === 'ai-ml'
  );
}

/**
 * @param {UserConfig | { type: ProjectType }} config
 */
export function isCliLayout(config) {
  return (
    config.type === 'cli' ||
    config.type === 'dev-tooling' ||
    config.stack?.cli === 'node'
  );
}

/**
 * @param {UserConfig | { stack?: StackConfig }} config
 */
export function hasFrontendStack(config) {
  return config.stack?.frontend === 'react-vite';
}

/**
 * @param {UserConfig | { stack?: StackConfig }} config
 */
export function hasBackendStack(config) {
  return config.stack?.backend === 'node-express';
}

/**
 * @param {SystemMode} mode
 */
export function shouldIncludeDocs(mode) {
  return mode !== 'minimal';
}

/**
 * @param {SystemMode} mode
 */
export function shouldIncludeTestsAndScripts(mode) {
  return mode === 'scalable' || mode === 'enterprise';
}

/**
 * @param {SystemMode} mode
 */
export function shouldIncludeExperiments(mode) {
  return mode === 'experimental';
}

/**
 * @param {FeaturesShape} features
 * @param {ScaffoldFeatureId} scaffoldId
 */
export function addScaffoldFeature(features, scaffoldId) {
  const next = normalizeFeatures(features);
  if (scaffoldId === 'auth') {
    if (!next.core.includes('auth-jwt')) next.core.push('auth-jwt');
  } else if (scaffoldId === 'database') {
    if (!next.core.includes('database')) next.core.push('database');
  } else if (scaffoldId === 'logging') {
    if (!next.infra.includes('logging')) next.infra.push('logging');
  }
  for (const k of FEATURE_CATEGORIES) {
    next[k] = [...new Set(next[k])];
  }
  return next;
}

/**
 * @param {unknown} raw
 * @returns {UserConfig | null}
 */
export function normalizeManifestToUserConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (typeof o.projectName !== 'string') return null;
  const type = o.type;
  const mode = o.mode;
  if (typeof type !== 'string' || !PROJECT_TYPES.includes(type)) return null;
  if (typeof mode !== 'string' || !SYSTEM_MODES.includes(mode)) return null;
  const stack = o.stack;
  if (!stack || typeof stack !== 'object') return null;
  const s = /** @type {StackConfig} */ (stack);
  const extras = o.extras;
  const ex =
    extras && typeof extras === 'object'
      ? /** @type {{ git: boolean; installDeps: boolean }} */ ({
          git: Boolean(/** @type {{ git?: boolean }} */ (extras).git),
          installDeps: Boolean(
            /** @type {{ installDeps?: boolean }} */ (extras).installDeps,
          ),
        })
      : { git: false, installDeps: false };

  return {
    projectName: o.projectName,
    type: /** @type {ProjectType} */ (type),
    mode: /** @type {SystemMode} */ (mode),
    stack: {
      frontend: s.frontend ?? null,
      backend: s.backend ?? null,
      cli: s.cli ?? null,
    },
    features: normalizeFeatures(o.features),
    extras: ex,
  };
}

/**
 * @param {UserConfig | { features?: unknown }} config
 * @param {string} devId
 */
export function hasDevFeature(config, devId) {
  return normalizeFeatures(config.features).dev.includes(devId);
}

/**
 * Dev experience includes TypeScript (drives .ts/.tsx templates).
 * @param {UserConfig | { features?: unknown }} config
 */
export function useTypeScript(config) {
  return hasDevFeature(config, 'typescript');
}

/**
 * Remove feature flags that cannot apply to the current stack / type (idempotent).
 * @param {UserConfig | { type: ProjectType; stack: StackConfig; features?: unknown }} config
 * @returns {FeaturesShape}
 */
export function sanitizeFeaturesForContext(config) {
  const f = normalizeFeatures(config.features);
  /** @type {FeaturesShape} */
  const next = createEmptyFeatures();
  for (const k of FEATURE_CATEGORIES) {
    next[k] = [...(f[k] ?? [])];
  }

  if (!hasBackendStack(config)) {
    next.core = next.core.filter((id) => id !== 'database');
    next.backend = [];
    next.infra = next.infra.filter((id) => id !== 'rate-limiting');
  }

  if (!hasFrontendStack(config)) {
    next.core = next.core.filter(
      (id) => !['state-management', 'routing'].includes(id),
    );
    next.frontend = [];
  }

  if (hasFrontendStack(config) && !next.frontend.includes('tailwind')) {
    next.frontend = next.frontend.filter(
      (id) => !['ui-library', 'forms', 'animations'].includes(id),
    );
  }

  for (const k of FEATURE_CATEGORIES) {
    next[k] = [...new Set(next[k])];
  }
  return next;
}

/**
 * @param {UserConfig} config
 * @returns {UserConfig}
 */
export function withSanitizedFeatures(config) {
  return {
    ...config,
    features: sanitizeFeaturesForContext(config),
  };
}

export {};
