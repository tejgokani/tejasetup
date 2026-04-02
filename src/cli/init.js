/**
 * Main interactive init pipeline:
 * 1. Banner
 * 2. Configuration (prompts)
 * 3. Recommended Setup (blueprint) → accept / original
 * 4. Project Structure → File Changes
 * 5. Final confirmation → generate
 */
import {
  getUserConfig,
  confirmProjectPreview,
  promptBlueprintDecision,
} from './prompts.js';
import {
  showBanner,
  showSection,
  showSuccess,
  showWarning,
  sectionGap,
} from './renderer.js';
import { showGenerationPreview } from './preview.js';
import { printFileChangesPreview } from '../preview/diff.js';
import { showRecommendedSetup } from './blueprintDisplay.js';
import {
  applyBlueprintPatches,
  generateBlueprint,
} from '../engine/blueprint.js';
import { generateProject } from '../generators/project.js';
import {
  FEATURE_CATEGORIES,
  PROJECT_TYPES,
  SYSTEM_MODES,
  normalizeFeatures,
} from '../config/userConfig.js';

function cancelError() {
  const err = new Error('Setup cancelled.');
  err.name = 'UserCancelledError';
  return err;
}

/** Single line between tightly coupled UI steps. */
function stepSpacer() {
  console.log('');
}

/**
 * @param {unknown} config
 */
function assertValidConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Invalid configuration.');
  }
  const c = /** @type {import('../config/userConfig.js').UserConfig} */ (
    config
  );
  if (typeof c.projectName !== 'string' || !c.projectName.trim()) {
    throw new Error('Invalid configuration: project name is required.');
  }
  if (!PROJECT_TYPES.includes(c.type)) {
    throw new Error('Invalid configuration: unknown project type.');
  }
  if (!SYSTEM_MODES.includes(c.mode)) {
    throw new Error('Invalid configuration: unknown system mode.');
  }
  if (!c.stack || typeof c.stack !== 'object') {
    throw new Error('Invalid configuration: stack is missing.');
  }
  const feats = normalizeFeatures(c.features);
  for (const k of FEATURE_CATEGORIES) {
    if (!Array.isArray(feats[k])) {
      throw new Error(`Invalid configuration: features.${k} must be a list.`);
    }
  }
}

/**
 * @returns {Promise<import('../config/userConfig.js').UserConfig>}
 */
async function collectUserConfig() {
  showSection('Configuration');
  const config = await getUserConfig();
  assertValidConfig(config);
  return /** @type {import('../config/userConfig.js').UserConfig} */ (config);
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
async function runBlueprintPhase(config) {
  const blueprint = generateBlueprint(config);
  showRecommendedSetup(blueprint);
  stepSpacer();

  const choice = await promptBlueprintDecision();
  if (choice === 'accept') {
    return applyBlueprintPatches(config, blueprint);
  }
  return config;
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
async function runStructurePreviewSafe(config) {
  try {
    await showGenerationPreview(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showWarning(
      `Structure preview unavailable (${msg}). You can still generate.`,
    );
  }
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
function runDiffPreviewSafe(config) {
  try {
    printFileChangesPreview(config);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    showWarning(
      `File preview unavailable (${msg}). You can still generate.`,
    );
  }
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
async function runPreviewPhases(config) {
  await runStructurePreviewSafe(config);
  sectionGap();
  runDiffPreviewSafe(config);
}

/**
 * Full interactive init: banner → config → blueprint → previews → confirm → generate.
 */
export async function runInitFlow() {
  await showBanner();
  sectionGap();

  /** @type {import('../config/userConfig.js').UserConfig | null} */
  let finalConfig = null;

  setup: for (;;) {
    const config = await collectUserConfig();
    sectionGap();

    const afterBlueprint = await runBlueprintPhase(config);
    sectionGap();

    for (;;) {
      await runPreviewPhases(afterBlueprint);
      stepSpacer();

      const action = await confirmProjectPreview();

      if (action === 'continue') {
        finalConfig = afterBlueprint;
        break setup;
      }
      if (action === 'cancel') {
        throw cancelError();
      }
      continue setup;
    }
  }

  if (!finalConfig) {
    throw new Error('Configuration was not completed.');
  }

  await generateProject(finalConfig);
  stepSpacer();
  showSuccess(
    `Project "${finalConfig.projectName}" is ready. If you skipped install, run npm install, then npm run dev.`,
  );
}
