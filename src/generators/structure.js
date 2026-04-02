import fs from 'fs-extra';
import path from 'path';
import { collectFeatureDirectories } from '../core/featureRegistry.js';
import {
  isCliLayout,
  shouldIncludeDocs,
  shouldIncludeExperiments,
  shouldIncludeTestsAndScripts,
} from '../config/userConfig.js';

/**
 * Stack + mode layout (generator core — not feature plugins).
 * @param {import('../config/userConfig.js').UserConfig} config
 * @param {Set<string>} dirs
 */
function addStackAndModeDirectories(config, dirs) {
  dirs.add('shared');
  dirs.add('shared/src');

  if (config.stack.frontend === 'react-vite') {
    dirs.add('client');
    dirs.add('client/public');
    dirs.add('client/src');
  }

  if (config.stack.backend === 'node-express') {
    dirs.add('server');
    dirs.add('server/src');
    dirs.add('server/src/routes');
    dirs.add('server/src/middleware');
  }

  if (isCliLayout(config) && config.stack.cli === 'node') {
    dirs.add('bin');
    dirs.add('cli');
    dirs.add('cli/src');
  }

  if (config.type === 'electron') {
    dirs.add('electron');
  }
  if (config.type === 'chrome-extension') {
    dirs.add('extension');
  }
  if (config.type === 'react-native') {
    dirs.add('mobile');
  }

  if (shouldIncludeDocs(config.mode)) dirs.add('docs');
  if (shouldIncludeTestsAndScripts(config.mode)) {
    dirs.add('tests');
    dirs.add('scripts');
  }
  if (shouldIncludeExperiments(config.mode)) dirs.add('experiments');

  for (const d of collectFeatureDirectories(config)) {
    dirs.add(d);
  }
}

/**
 * Planned directories relative to project root (preview + scaffold).
 * @param {import('../config/userConfig.js').UserConfig} config
 * @returns {{ root: string; type: string; mode: string; dirs: string[] }}
 */
export function planStructure(config) {
  const dirs = new Set();
  addStackAndModeDirectories(config, dirs);

  return {
    root: config.projectName,
    type: config.type,
    mode: config.mode,
    dirs: [...dirs].sort(),
  };
}

/**
 * @param {string} projectRoot absolute path to project folder
 * @param {import('../config/userConfig.js').UserConfig} config
 */
export async function createDirectoryStructure(projectRoot, config) {
  await fs.ensureDir(projectRoot);
  const plan = planStructure(config);
  for (const dir of plan.dirs) {
    await fs.ensureDir(path.join(projectRoot, dir));
  }
  return plan;
}

/**
 * Ensure only the given relative directories exist (for incremental `add`).
 * @param {string} projectRoot
 * @param {string[]} relativeDirs
 */
export async function ensureRelativeDirs(projectRoot, relativeDirs) {
  for (const dir of relativeDirs) {
    await fs.ensureDir(path.join(projectRoot, dir));
  }
}
