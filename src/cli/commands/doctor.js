import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import path from 'node:path';
import { listFeatures } from '../../core/featureRegistry.js';
import { readProjectManifest } from '../../core/manifest.js';
import { flattenConfigFeatures } from '../../config/userConfig.js';
import { showSection, showInfo, showSuccess, showWarning, showError } from '../renderer.js';

/**
 * @param {{ chdir?: string }} options
 */
export async function runDoctorCommand(options) {
  const projectRoot = path.resolve(options.chdir ?? process.cwd());
  let here = path.relative(process.cwd(), projectRoot) || '.';
  if (here.startsWith('..')) {
    here = projectRoot;
  }

  showSection('Environment');
  const major = Number.parseInt(process.versions.node.split('.')[0], 10);
  showInfo(`Node ${process.version}`);
  if (Number.isFinite(major) && major < 20) {
    showWarning('Node.js 20+ is recommended.');
  }

  try {
    showInfo(`npm ${execSync('npm --version', { encoding: 'utf8' }).trim()}`);
  } catch {
    showWarning('npm not on PATH');
  }

  try {
    showInfo(execSync('git --version', { encoding: 'utf8' }).trim());
  } catch {
    showWarning('git not on PATH');
  }

  const feats = listFeatures();
  showInfo(
    `Features you can add: ${feats.map((f) => f.id).join(', ')}`,
  );

  showSection(`Project (${here})`);

  try {
    if (!(await fs.pathExists(projectRoot))) {
      showError(`Path does not exist: ${projectRoot}`);
      return;
    }
    if (!(await fs.stat(projectRoot)).isDirectory()) {
      showError(`Not a directory: ${projectRoot}`);
      return;
    }
  } catch {
    showError('Could not read project path.');
    return;
  }

  const m = await readProjectManifest(projectRoot);
  if (!m) {
    showWarning('No .tejasetup/manifest.json (not a generated project here).');
    return;
  }

  const featFlat = flattenConfigFeatures(
    /** @type {{ features?: unknown }} */ (m),
  );
  showSuccess(
    `${m.projectName} · ${featFlat.length ? featFlat.join(', ') : 'no features'}`,
  );

  const pkgPath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    showInfo('package.json OK');
  } else {
    showError('package.json missing');
  }

  if (m.stack?.backend === 'node-express') {
    const sp = path.join(projectRoot, 'server/package.json');
    if (await fs.pathExists(sp)) showInfo('server workspace OK');
    else showWarning('server/package.json missing');
  }
}
