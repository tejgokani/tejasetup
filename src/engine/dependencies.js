/**
 * Feature dependency rules: selected flags must be consistent with stack and each other.
 * Extend with {@link registerDependencyRule} or {@link registerStaticViolation}.
 */

import { confirm } from '@inquirer/prompts';
import {
  FEATURE_CATEGORIES,
  hasBackendStack,
  mergeFeatureObjects,
  normalizeFeatures,
} from '../config/userConfig.js';

/**
 * @typedef {import('../config/userConfig.js').UserConfig} UserConfig
 * @typedef {import('../config/userConfig.js').FeaturesShape} FeaturesShape
 * @typedef {import('../config/userConfig.js').FeatureCategory} FeatureCategory
 */

/** Core ids that count as “auth” for persistence rules. */
export const AUTH_CORE_IDS = ['auth-jwt', 'auth-oauth', 'authentication'];

/**
 * @typedef {Object} DependencyViolation
 * @property {string} id
 * @property {string} message
 * @property {'add' | 'strip-backend'} kind
 * @property {Partial<FeaturesShape>} [add] merge when user accepts (kind === 'add')
 */

/** @type {DependencyViolation[]} */
let extraViolations = [];

/** @type {((config: UserConfig, f: FeaturesShape) => DependencyViolation | null)[]} */
const extraRules = [];

/**
 * @param {(config: UserConfig, f: FeaturesShape) => DependencyViolation | null} fn
 */
export function registerDependencyRule(fn) {
  extraRules.push(fn);
}

/**
 * @param {FeaturesShape} f
 */
function hasAnyAuth(f) {
  return f.core.some((id) => AUTH_CORE_IDS.includes(id));
}

/**
 * @param {UserConfig} config
 * @param {FeaturesShape} raw
 * @returns {DependencyViolation[]}
 */
export function findViolations(config, raw) {
  const f = normalizeFeatures(raw);
  /** @type {DependencyViolation[]} */
  const out = [];

  if (hasAnyAuth(f) && !f.core.includes('database')) {
    out.push({
      id: 'auth-requires-database',
      kind: 'add',
      message:
        'Authentication (JWT/OAuth) typically needs persisted users. Database is required. Add it?',
      add: { core: ['database'] },
    });
  }

  if (f.backend.includes('graphql') && !f.core.includes('api-layer')) {
    out.push({
      id: 'graphql-requires-api-layer',
      kind: 'add',
      message:
        'GraphQL builds on your HTTP API surface. API layer is required. Add it?',
      add: { core: ['api-layer'] },
    });
  }

  const needsServer = [
    'rest',
    'graphql',
    'websockets',
    'background-jobs',
    'redis-cache',
  ];
  const orphanBackend = f.backend.filter((id) => needsServer.includes(id));
  if (!hasBackendStack(config) && orphanBackend.length > 0) {
    out.push({
      id: 'server-features-require-express',
      kind: 'strip-backend',
      message: `WebSockets, GraphQL, REST, and related options need an Express API server in your stack. Remove ${orphanBackend.length} incompatible selection(s)?`,
    });
  }

  for (const fn of extraRules) {
    const v = fn(config, f);
    if (v) out.push(v);
  }
  for (const v of extraViolations) {
    out.push(v);
  }

  return out;
}

/**
 * @param {FeaturesShape} merged
 * @param {DependencyViolation} v
 * @param {boolean} accepted
 * @returns {FeaturesShape}
 */
function applyViolation(merged, v, accepted) {
  const m = normalizeFeatures(merged);

  if (v.kind === 'add' && v.add && accepted) {
    return mergeFeatureObjects(m, v.add);
  }

  if (v.id === 'auth-requires-database' && !accepted) {
    m.core = m.core.filter((id) => !AUTH_CORE_IDS.includes(id));
    for (const k of FEATURE_CATEGORIES) {
      m[k] = [...new Set(m[k])];
    }
    return m;
  }

  if (v.id === 'graphql-requires-api-layer' && !accepted) {
    m.backend = m.backend.filter((id) => id !== 'graphql');
    for (const k of FEATURE_CATEGORIES) {
      m[k] = [...new Set(m[k])];
    }
    return m;
  }

  if (v.kind === 'strip-backend') {
    m.backend = [];
    for (const k of FEATURE_CATEGORIES) {
      m[k] = [...new Set(m[k])];
    }
    return m;
  }

  return m;
}

/**
 * Prompt until no violations remain (or they are resolved by add/strip).
 * @param {UserConfig} config
 * @param {FeaturesShape | unknown} features
 * @returns {Promise<FeaturesShape>}
 */
export async function resolveFeatureDependenciesInteractive(config, features) {
  let merged = normalizeFeatures(features);

  for (;;) {
    const violations = findViolations(config, merged);
    if (violations.length === 0) break;

    const v = violations[0];

    if (v.kind === 'strip-backend') {
      const ok = await confirm({
        message: v.message,
        default: true,
      });
      if (!ok) {
        const err = new Error(
          'Those backend options require Node (Express). Pick a layout with an API server, or allow removing them.',
        );
        err.name = 'UserCancelledError';
        throw err;
      }
      merged = applyViolation(merged, v, true);
      continue;
    }

    const accepted = await confirm({
      message: v.message,
      default: true,
    });

    merged = applyViolation(merged, v, accepted);
    merged = normalizeFeatures(merged);
  }

  return merged;
}

/**
 * Non-interactive: apply automatic fixes (add required features, strip invalid backend flags).
 * @param {UserConfig} config
 * @param {unknown} features
 * @returns {FeaturesShape}
 */
export function resolveFeatureDependenciesAuto(config, features) {
  let merged = normalizeFeatures(features);

  for (let i = 0; i < 20; i++) {
    const violations = findViolations(config, merged);
    if (violations.length === 0) break;
    const v = violations[0];
    if (v.kind === 'add') {
      merged = applyViolation(merged, v, true);
    } else {
      merged = applyViolation(merged, v, true);
    }
    merged = normalizeFeatures(merged);
  }

  return merged;
}

/**
 * @param {DependencyViolation} v
 */
export function registerStaticViolation(v) {
  extraViolations.push(v);
}

export function clearStaticViolations() {
  extraViolations = [];
}
