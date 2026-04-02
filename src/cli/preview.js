import chalk from 'chalk';
import {
  FEATURE_CATEGORIES,
  flattenConfigFeatures,
  normalizeFeatures,
} from '../config/userConfig.js';
import { listFeatures } from '../core/featureRegistry.js';
import { INDENT, LABEL_COL } from '../utils/terminalLayout.js';
import { palette } from '../utils/colors.js';
import { ICON } from '../utils/icons.js';
import { showSection } from './renderer.js';
import { planStructure } from '../generators/structure.js';

const TYPE_LABELS = {
  web: 'Web App',
  api: 'API / Backend',
  cli: 'CLI Tool',
  fullstack: 'Fullstack App',
  microservices: 'Microservices System',
  library: 'Library / NPM Package',
  'ai-ml': 'AI / ML Project',
  'chrome-extension': 'Chrome Extension',
  electron: 'Desktop App (Electron)',
  'react-native': 'Mobile App (React Native)',
  'static-site': 'Static Site',
  'dev-tooling': 'Dev Tooling',
  custom: 'Custom',
};
const MODE_LABELS = {
  minimal: 'Minimal (hackathon)',
  standard: 'Standard (balanced)',
  scalable: 'Scalable (production)',
  enterprise: 'Enterprise (strict)',
  experimental: 'Experimental',
  custom: 'Custom (full control)',
};

function featureLabels() {
  return Object.fromEntries(
    listFeatures().map((f) => [f.id, f.label]),
  );
}

/**
 * @param {string[]} paths
 * @returns {Record<string, Record<string, unknown>>}
 */
function buildDirTree(paths) {
  /** @type {Record<string, Record<string, unknown>>} */
  const root = {};
  for (const raw of paths) {
    const parts = raw.split('/').filter(Boolean);
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = {};
      node = node[part];
    }
  }
  return root;
}

/**
 * @param {Record<string, Record<string, unknown>>} node
 * @param {string} prefix
 */
function printDirTree(node, prefix) {
  const keys = Object.keys(node).sort();
  keys.forEach((key, index) => {
    const isLast = index === keys.length - 1;
    const branch = isLast ? '└── ' : '├── ';
    const child = /** @type {Record<string, Record<string, unknown>>} */ (
      node[key]
    );
    const hasKids = Object.keys(child).length > 0;
    console.log(
      `${INDENT}${prefix}${branch}${palette.secondary(key + '/')}`,
    );
    if (hasKids) {
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');
      printDirTree(child, nextPrefix);
    }
  });
}

function plannedRootFiles() {
  return ['.env', 'README.md', 'package.json'];
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
function formatFeaturesList(config, labels) {
  const flat = flattenConfigFeatures(config);
  if (!flat.length) {
    return palette.muted('none');
  }
  const f = normalizeFeatures(config.features);
  const parts = [];
  for (const cat of FEATURE_CATEGORIES) {
    const ids = f[cat] ?? [];
    if (!ids.length) continue;
    const short = ids.map((id) => labels[id] ?? id).join(', ');
    parts.push(`${cat}: ${short}`);
  }
  return chalk.white(parts.length ? parts.join(' · ') : flat.join(', '));
}

function formatStackLine(config) {
  const parts = [];
  if (config.stack.frontend) parts.push(config.stack.frontend);
  if (config.stack.backend) parts.push(config.stack.backend);
  if (config.stack.cli) parts.push(config.stack.cli);
  return parts.length ? chalk.white(parts.join(', ')) : palette.muted('custom');
}

function formatExtrasLine(config) {
  const bits = [];
  if (config.extras.git) bits.push('Git init');
  if (config.extras.installDeps) bits.push('npm install');
  return bits.length ? chalk.white(bits.join(', ')) : palette.muted('none');
}

function printLabeledRow(label, value) {
  console.log(
    `${INDENT}${palette.muted(label.padEnd(LABEL_COL))}  ${value}`,
  );
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
export async function showGenerationPreview(config) {
  const labels = featureLabels();
  const plan = planStructure(config);

  showSection('Project Structure');

  console.log(`${INDENT}${palette.primary.bold('Summary')}`);
  printLabeledRow('Name', chalk.white(config.projectName));
  printLabeledRow('Type', chalk.white(TYPE_LABELS[config.type]));
  printLabeledRow('Mode', chalk.white(MODE_LABELS[config.mode]));
  printLabeledRow('Features', formatFeaturesList(config, labels));
  printLabeledRow('Stack', formatStackLine(config));
  printLabeledRow('Extras', formatExtrasLine(config));

  console.log('');
  console.log(`${INDENT}${palette.primary.bold('Folders')}`);
  const tree = buildDirTree(plan.dirs);
  console.log(`${INDENT}${chalk.white(plan.root + '/')}`);
  printDirTree(tree, '');

  console.log('');
  console.log(`${INDENT}${palette.primary.bold('Planned root files')}`);
  for (const file of plannedRootFiles()) {
    console.log(
      `${INDENT}${palette.success(ICON.ok)} ${palette.secondary(file)}`,
    );
  }
}
