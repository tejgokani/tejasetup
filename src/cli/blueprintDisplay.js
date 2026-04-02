import chalk from 'chalk';
import { INDENT, LABEL_COL } from '../utils/terminalLayout.js';
import { palette } from '../utils/colors.js';
import { ICON } from '../utils/icons.js';
import { showSection } from './renderer.js';

/**
 * @param {import('../engine/blueprint.js').Blueprint} blueprint
 */
export function showRecommendedSetup(blueprint) {
  showSection('Recommended Setup');

  const stackRows = [
    ['Frontend', blueprint.stack.frontend],
    ['Backend', blueprint.stack.backend],
    ['Database', blueprint.stack.database],
    ['CLI', blueprint.stack.cli],
  ];

  for (const [label, value] of stackRows) {
    if (value == null || value === '') continue;
    const tag = label.padEnd(LABEL_COL);
    console.log(
      `${INDENT}${palette.success(ICON.ok)} ${palette.muted(tag)} ${chalk.white(value)}`,
    );
  }

  if (blueprint.features.length > 0) {
    console.log('');
    for (const name of blueprint.features) {
      console.log(
        `${INDENT}${palette.success(ICON.ok)} ${chalk.white(name)}`,
      );
    }
  }

  if (blueprint.reasoning.length > 0) {
    console.log('');
    console.log(`${INDENT}${palette.primary.bold('Reasoning')}`);
    for (const line of blueprint.reasoning) {
      console.log(
        `${INDENT}${palette.secondary(ICON.info)} ${palette.muted(line)}`,
      );
    }
  }

  if (blueprint.patches.addFeatures.length > 0) {
    const patchLabels = blueprint.patches.addFeatures.map(
      (id) =>
        ({ auth: 'Auth', database: 'Database', logging: 'Logging' })[id] ??
        id,
    );
    console.log('');
    console.log(
      `${INDENT}${palette.secondary(ICON.info)} ${palette.muted(`Accept can add: ${patchLabels.join(', ')}`)}`,
    );
  }
}
