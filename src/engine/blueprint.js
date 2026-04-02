/**
 * Blueprint Intelligence: advisory recommendations from user config.
 *
 * @typedef {import('../config/userConfig.js').UserConfig} UserConfig
 * @typedef {import('../config/userConfig.js').ScaffoldFeatureId} ScaffoldFeatureId
 */

import {
  addScaffoldFeature,
  flattenConfigFeatures,
  hasScaffoldFeature,
  isApiFocusedType,
  normalizeFeatures,
} from '../config/userConfig.js';

/**
 * @typedef {Object} BlueprintStack
 * @property {string | null} frontend
 * @property {string | null} backend
 * @property {string | null} database
 * @property {string | null} [cli]
 */

/**
 * @typedef {Object} BlueprintPatches
 * @property {ScaffoldFeatureId[]} addFeatures
 */

/**
 * @typedef {Object} Blueprint
 * @property {BlueprintStack} stack
 * @property {string[]} features
 * @property {string[]} reasoning
 * @property {BlueprintPatches} patches
 */

const FRONTEND_LABEL = { 'react-vite': 'React (Vite)' };
const BACKEND_LABEL = { 'node-express': 'Node (Express)' };
const CLI_LABEL = { node: 'Node.js CLI' };

const SCAFFOLD_LABEL = {
  auth: 'Auth',
  database: 'Database',
  logging: 'Logging',
};

/** Display names for structured feature ids (blueprint summary). */
const FEATURE_DISPLAY = {
  'auth-jwt': 'Auth (JWT)',
  'auth-oauth': 'Auth (OAuth)',
  authentication: 'Authentication',
  database: 'Database',
  'api-layer': 'API layer',
  'state-management': 'State management',
  routing: 'Routing',
  eslint: 'ESLint',
  prettier: 'Prettier',
  husky: 'Husky',
  testing: 'Testing',
  typescript: 'TypeScript',
  docker: 'Docker',
  cicd: 'CI/CD',
  'env-validation': 'Env validation',
  logging: 'Logging',
  'rate-limiting': 'Rate limiting',
  tailwind: 'Tailwind CSS',
  'ui-library': 'UI library',
  forms: 'Forms',
  animations: 'Animations',
  rest: 'REST',
  graphql: 'GraphQL',
  websockets: 'WebSockets',
  'background-jobs': 'Background jobs',
  'redis-cache': 'Redis cache',
  'feature-flags': 'Feature flags',
  monitoring: 'Monitoring',
  analytics: 'Analytics',
  'multi-tenant': 'Multi-tenant',
};

/**
 * @param {UserConfig} config
 * @returns {BlueprintStack}
 */
function stackFromUserConfig(config) {
  return {
    frontend: config.stack.frontend
      ? FRONTEND_LABEL[config.stack.frontend] ?? config.stack.frontend
      : null,
    backend: config.stack.backend
      ? BACKEND_LABEL[config.stack.backend] ?? config.stack.backend
      : null,
    database: null,
    cli: config.stack.cli ? CLI_LABEL[config.stack.cli] ?? config.stack.cli : null,
  };
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleApiNoFrontend(config, bp) {
  if (!isApiFocusedType(config.type)) return;
  bp.stack.frontend = null;
  bp.reasoning.push(
    'API-style projects focus on the server layer; a separate SPA scaffold is not recommended here.',
  );
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleCliStack(config, bp) {
  if (config.type !== 'cli' && config.type !== 'dev-tooling') return;
  bp.reasoning.push(
    'CLI targets ship as a single Node entrypoint; keep shared code in `shared/`.',
  );
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleMinimalMode(config, bp) {
  if (config.mode !== 'minimal') return;
  const hasDb = hasScaffoldFeature(config, 'database');
  const hasAuth = hasScaffoldFeature(config, 'auth');

  if (!hasDb && !hasAuth) {
    bp.stack.database = null;
    bp.reasoning.push(
      'Minimal mode favors a lean footprint — skip a database until you need persistence.',
    );
    return;
  }

  if (hasDb || hasAuth) {
    bp.stack.database = 'SQLite (local file)';
    bp.reasoning.push(
      'Minimal mode pairs well with SQLite for zero-infra local development.',
    );
  }
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleScalableMode(config, bp) {
  if (config.mode !== 'scalable' && config.mode !== 'enterprise') return;
  if (config.stack.backend === 'node-express') {
    bp.stack.database = 'PostgreSQL';
    bp.reasoning.push(
      'Scalable / enterprise modes with Express assume a production-grade data tier — PostgreSQL is the default recommendation.',
    );
    if (!hasScaffoldFeature(config, 'database')) {
      bp.patches.addFeatures.push('database');
      bp.reasoning.push(
        'Adding the Database feature aligns the generated API with scalable deployments.',
      );
    }
  } else {
    bp.reasoning.push(
      'Scalable setup: when you add a backend, pair it with PostgreSQL and structured modules.',
    );
  }
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleExperimentalMode(config, bp) {
  if (config.mode !== 'experimental') return;
  if (!bp.stack.database) {
    bp.stack.database = 'SQLite or PostgreSQL (your choice)';
  }
  bp.reasoning.push(
    'Experimental mode allows mixed stacks — pick SQLite for speed or PostgreSQL for realism.',
  );
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleAuthRequiresDatabase(config, bp) {
  if (!hasScaffoldFeature(config, 'auth')) return;
  if (hasScaffoldFeature(config, 'database')) {
    bp.reasoning.push(
      'Auth + Database together support real user persistence instead of demo tokens only.',
    );
    return;
  }
  bp.patches.addFeatures.push('database');
  bp.reasoning.push(
    'JWT flows typically need persisted users or sessions — adding Database is recommended.',
  );
  if (config.mode === 'minimal' && bp.stack.database == null) {
    bp.stack.database = 'SQLite (local file)';
  }
  if (config.mode === 'scalable' || config.mode === 'enterprise') {
    bp.stack.database = 'PostgreSQL';
  }
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleLoggingOps(config, bp) {
  if (!hasScaffoldFeature(config, 'logging')) return;
  bp.reasoning.push(
    'Structured logging early makes production debugging far less painful.',
  );
}

/**
 * @param {UserConfig} config
 * @param {Blueprint} bp
 */
function ruleStackQuality(config, bp) {
  if (config.stack.frontend === 'react-vite') {
    bp.reasoning.push('React with Vite keeps dev feedback loops fast.');
  }
  if (config.stack.backend === 'node-express') {
    bp.reasoning.push('Express offers a small, flexible surface for HTTP APIs.');
  }
}

/** @type {((config: UserConfig, bp: Blueprint) => void)[]} */
const blueprintRules = [
  ruleApiNoFrontend,
  ruleCliStack,
  ruleMinimalMode,
  ruleScalableMode,
  ruleExperimentalMode,
  ruleAuthRequiresDatabase,
  ruleLoggingOps,
  ruleStackQuality,
];

/**
 * @param {string[]} ids
 * @returns {string[]}
 */
function featureIdsToLabels(ids) {
  return [...new Set(ids)]
    .sort()
    .map((id) => FEATURE_DISPLAY[id] ?? SCAFFOLD_LABEL[id] ?? id);
}

/**
 * @param {UserConfig} config
 * @returns {UserConfig}
 */
function configWithBlueprintPatches(config, addFeatures) {
  let features = normalizeFeatures(config.features);
  for (const id of addFeatures) {
    features = addScaffoldFeature(features, id);
  }
  return { ...config, features };
}

/**
 * @param {UserConfig} config
 * @returns {Blueprint}
 */
export function generateBlueprint(config) {
  /** @type {Blueprint} */
  const blueprint = {
    stack: stackFromUserConfig(config),
    features: [],
    reasoning: [],
    patches: { addFeatures: [] },
  };

  for (const rule of blueprintRules) {
    rule(config, blueprint);
  }

  blueprint.patches.addFeatures = [...new Set(blueprint.patches.addFeatures)];

  const virtual = configWithBlueprintPatches(
    config,
    blueprint.patches.addFeatures,
  );

  blueprint.reasoning = [...new Set(blueprint.reasoning)];
  blueprint.features = featureIdsToLabels(flattenConfigFeatures(virtual));

  return blueprint;
}

/**
 * Apply optional feature additions when the user accepts the blueprint.
 *
 * @param {UserConfig} config
 * @param {Blueprint} blueprint
 * @returns {UserConfig}
 */
export function applyBlueprintPatches(config, blueprint) {
  let features = normalizeFeatures(config.features);
  const before = JSON.stringify(features);

  for (const id of blueprint.patches.addFeatures) {
    features = addScaffoldFeature(features, id);
  }

  if (JSON.stringify(features) === before) return config;
  return { ...config, features };
}
