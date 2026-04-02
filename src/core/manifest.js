import fs from 'fs-extra';
import path from 'path';

export const MANIFEST_REL = '.tejasetup/manifest.json';

/**
 * @param {string} projectRoot
 * @returns {Promise<(import('../config/userConfig.js').UserConfig & { version?: number }) | null>}
 */
export async function readProjectManifest(projectRoot) {
  const p = path.join(projectRoot, MANIFEST_REL);
  if (!(await fs.pathExists(p))) return null;
  try {
    return await fs.readJson(p);
  } catch {
    return null;
  }
}

/**
 * @param {string} projectRoot
 * @param {import('../config/userConfig.js').UserConfig} config
 */
export async function writeProjectManifest(projectRoot, config) {
  const dir = path.join(projectRoot, '.tejasetup');
  await fs.ensureDir(dir);
  const payload = {
    version: 2,
    projectName: config.projectName,
    type: config.type,
    mode: config.mode,
    stack: config.stack,
    features: config.features,
    extras: config.extras,
  };
  await fs.writeJson(path.join(dir, 'manifest.json'), payload, { spaces: 2 });
}

/**
 * @param {string} projectRoot
 */
export async function isTejasetupProject(projectRoot) {
  const m = await readProjectManifest(projectRoot);
  return m != null;
}
