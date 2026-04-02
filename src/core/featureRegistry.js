/**
 * @typedef {import('../config/userConfig.js').UserConfig} UserConfig
 */

import { scaffoldFeatureIdsFromConfig } from '../config/userConfig.js';

/**
 * @typedef {Object} FeatureContext
 * @property {string} projectRoot
 * @property {UserConfig} config
 */

/**
 * @typedef {Object} FeatureDefinition
 * @property {string} id
 * @property {string} label
 * @property {number} [order] apply order (lower first)
 * @property {(config: UserConfig) => string[]} [planDirectories]
 * @property {(ctx: FeatureContext) => Promise<void>} [apply]
 * @property {(config: UserConfig) => Record<string, string>} [serverDependencies]
 */

/** @type {Map<string, FeatureDefinition>} */
const registry = new Map();

/**
 * @param {FeatureDefinition} def
 */
export function registerFeature(def) {
  registry.set(def.id, def);
}

/**
 * @param {string} id
 * @returns {FeatureDefinition | undefined}
 */
export function getFeature(id) {
  return registry.get(id);
}

/**
 * @returns {FeatureDefinition[]}
 */
export function listFeatures() {
  return [...registry.values()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
}

/**
 * @returns {string[]}
 */
export function listFeatureIds() {
  return listFeatures().map((f) => f.id);
}

/**
 * @param {UserConfig} config
 * @returns {FeatureDefinition[]}
 */
export function getEnabledFeatures(config) {
  const enabled = new Set(scaffoldFeatureIdsFromConfig(config));
  return listFeatures()
    .filter((f) => enabled.has(f.id))
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
}

/**
 * @param {UserConfig} config
 * @returns {string[]}
 */
export function collectFeatureDirectories(config) {
  const out = [];
  for (const f of getEnabledFeatures(config)) {
    out.push(...(f.planDirectories?.(config) ?? []));
  }
  return out;
}

/**
 * @param {UserConfig} config
 */
export function mergeFeatureServerDependencies(config) {
  /** @type {Record<string, string>} */
  const m = {};
  for (const f of getEnabledFeatures(config)) {
    Object.assign(m, f.serverDependencies?.(config) ?? {});
  }
  return m;
}

/**
 * @param {FeatureContext} ctx
 */
export async function applyEnabledFeatures(ctx) {
  for (const f of getEnabledFeatures(ctx.config)) {
    if (f.apply) await f.apply(ctx);
  }
}
