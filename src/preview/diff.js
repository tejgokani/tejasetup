import chalk from 'chalk';
import { buildVirtualProjectFiles } from '../generators/files.js';
import { showSection } from '../cli/renderer.js';
import { palette } from '../utils/colors.js';
import { ICON } from '../utils/icons.js';
import { INDENT, RULER_WIDTH } from '../utils/terminalLayout.js';

/** Max content lines shown per file (fast terminal output). */
const MAX_LINES = 10;

const ROOT_FILES = new Set(['package.json', '.env']);

/**
 * @param {string} rel
 */
function includeInDiffPreview(rel) {
  if (ROOT_FILES.has(rel)) return true;
  if (rel.startsWith('server/')) return true;
  if (rel.startsWith('client/')) return true;
  return false;
}

/**
 * Simulated diff for a greenfield project (all additions; no baseline on disk).
 * @param {import('../config/userConfig.js').UserConfig} config
 * @returns {{ path: string; additions: string[]; removals: string[]; truncated: boolean }[]}
 */
export function generateDiffPreview(config) {
  const map = buildVirtualProjectFiles(config);
  const paths = [...map.keys()].filter(includeInDiffPreview).sort();
  return paths.map((p) => {
    const body = map.get(p) ?? '';
    const lines = body.split('\n');
    return {
      path: p,
      additions: lines,
      removals: [],
      truncated: lines.length > MAX_LINES,
    };
  });
}

/**
 * @param {import('../config/userConfig.js').UserConfig} config
 */
export function printFileChangesPreview(config) {
  const entries = generateDiffPreview(config);
  showSection('File Changes');

  const root = config.projectName;
  let first = true;

  for (const entry of entries) {
    const displayPath = `${root}/${entry.path}`;
    if (!first) console.log('');
    first = false;
    console.log(
      `${INDENT}${palette.secondary(ICON.info)} ${chalk.bold.white(displayPath)}`,
    );
    console.log(`${INDENT}${palette.muted('─'.repeat(RULER_WIDTH))}`);

    const slice = entry.additions.slice(0, MAX_LINES);
    for (const line of slice) {
      console.log(`${INDENT}${chalk.green(`+ ${line}`)}`);
    }
    for (const line of entry.removals.slice(0, MAX_LINES)) {
      console.log(`${INDENT}${chalk.red(`- ${line}`)}`);
    }
    if (entry.truncated) {
      console.log(`${INDENT}${palette.muted('...')}`);
    }
  }
}
