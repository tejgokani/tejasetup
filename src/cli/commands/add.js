import path from 'node:path';
import fs from 'fs-extra';
import {
  addScaffoldFeature,
  hasScaffoldFeature,
  normalizeManifestToUserConfig,
  sanitizeFeaturesForContext,
  scaffoldFeatureIdsFromConfig,
} from '../../config/userConfig.js';
import {
  getEnabledFeatures,
  getFeature,
  listFeatureIds,
} from '../../core/featureRegistry.js';
import { readProjectManifest, writeProjectManifest } from '../../core/manifest.js';
import { resolveFeatureDependenciesAuto } from '../../engine/dependencies.js';
import { ensureRelativeDirs } from '../../generators/structure.js';
import { syncServerWorkspace, updateSharedMetadata } from '../../generators/files.js';
import { toNpmPackageName } from '../../utils/packageName.js';
import { formatFsError } from '../../utils/fsError.js';
import { showError, showSuccess, showWarning } from '../renderer.js';

/** @typedef {'auth' | 'database' | 'logging'} ScaffoldFeatureId */

/**
 * @param {string} featureId
 * @param {{ chdir?: string }} options
 */
export async function runAddCommand(featureId, options) {
  const id = String(featureId ?? '').trim().toLowerCase();
  if (!id || !/^[a-z][a-z0-9-]*$/.test(id)) {
    showError(
      `Invalid feature name "${featureId}". Use letters, numbers, or hyphens (e.g. auth).`,
    );
    process.exitCode = 1;
    return;
  }

  const projectRoot = path.resolve(options.chdir ?? process.cwd());

  try {
    if (!(await fs.pathExists(projectRoot))) {
      showError(`Directory does not exist: ${projectRoot}`);
      process.exitCode = 1;
      return;
    }
    const st = await fs.stat(projectRoot);
    if (!st.isDirectory()) {
      showError(`Not a directory: ${projectRoot}`);
      process.exitCode = 1;
      return;
    }
  } catch (err) {
    showError(formatFsError(err, 'Could not open project path'));
    process.exitCode = 1;
    return;
  }

  const raw = await readProjectManifest(projectRoot);
  if (!raw) {
    showError(
      'Not a tejasetup project (missing .tejasetup/manifest.json). Run tejasetup from a generated project root.',
    );
    process.exitCode = 1;
    return;
  }

  const config = normalizeManifestToUserConfig(raw);
  if (!config) {
    showError('Invalid .tejasetup/manifest.json (could not parse config).');
    process.exitCode = 1;
    return;
  }

  const feature = getFeature(id);
  if (!feature) {
    showError(`Unknown feature "${id}". Available: ${listFeatureIds().join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (hasScaffoldFeature(config, /** @type {ScaffoldFeatureId} */ (id))) {
    showWarning(`Feature "${id}" is already enabled.`);
    return;
  }

  const beforeIds = new Set(scaffoldFeatureIdsFromConfig(config));

  let next = {
    ...config,
    features: addScaffoldFeature(
      config.features,
      /** @type {ScaffoldFeatureId} */ (id),
    ),
  };
  next = {
    ...next,
    features: resolveFeatureDependenciesAuto(next, next.features),
  };
  next = {
    ...next,
    features: sanitizeFeaturesForContext(next),
  };

  if (!hasScaffoldFeature(next, /** @type {ScaffoldFeatureId} */ (id))) {
    showWarning(
      `Feature "${id}" cannot be applied to this project's stack. Manifest unchanged.`,
    );
    return;
  }

  const newlyEnabled = getEnabledFeatures(next).filter((f) => !beforeIds.has(f.id));

  try {
    for (const f of newlyEnabled) {
      await ensureRelativeDirs(projectRoot, f.planDirectories?.(next) ?? []);
      if (f.apply) {
        await f.apply({ projectRoot, config: next });
      }
    }
    await syncServerWorkspace(projectRoot, next);
    await updateSharedMetadata(
      projectRoot,
      next,
      toNpmPackageName(next.projectName),
    );
    await writeProjectManifest(projectRoot, next);
  } catch (err) {
    showError(formatFsError(err, 'Add feature'));
    process.exitCode = 1;
    return;
  }

  const label = newlyEnabled.map((f) => f.id).join(', ');
  showSuccess(
    `Added: ${label}. Run npm install if new server dependencies were added.`,
  );
}
