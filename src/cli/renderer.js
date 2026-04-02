import figlet from 'figlet';
import gradient from 'gradient-string';
import { palette } from '../utils/colors.js';
import { ICON } from '../utils/icons.js';
import { INDENT, RULER_WIDTH } from '../utils/terminalLayout.js';

const bannerGradient = gradient(['#ff8c42', '#ffb347', '#00d4e8']);

function ruler() {
  return palette.muted('─'.repeat(RULER_WIDTH));
}

/**
 * Extra vertical space between major flow steps (banner → configuration → …).
 */
export function sectionGap() {
  console.log('');
  console.log('');
}

/**
 * ASCII banner: TEJASETUP (figlet + gradient).
 */
export async function showBanner() {
  console.log('');
  try {
    const ascii = await new Promise((resolve, reject) => {
      figlet.text(
        'TEJASETUP',
        { font: 'Small', horizontalLayout: 'default' },
        (err, data) => {
          if (err) reject(err);
          else resolve(data ?? '');
        },
      );
    });
    const styled = bannerGradient.multiline(ascii);
    console.log(
      styled
        .split('\n')
        .map((line) => `${INDENT}${line}`)
        .join('\n'),
    );
  } catch {
    console.log(`${INDENT}${palette.primary.bold('TEJASETUP')}`);
  }
  console.log(
    `${INDENT}${palette.muted('Interactive project system generator')}`,
  );
  console.log('');
}

/**
 * Section title + rule (one leading newline keeps rhythm with sectionGap).
 * @param {string} title
 */
export function showSection(title) {
  console.log('');
  console.log(`${INDENT}${palette.primary.bold(title)}`);
  console.log(`${INDENT}${ruler()}`);
}

/**
 * @param {string} message
 */
export function showSuccess(message) {
  console.log(`${INDENT}${palette.success(ICON.ok)} ${message}`);
}

/**
 * @param {string} message
 */
export function showError(message) {
  console.error(`${INDENT}${palette.error(ICON.err)} ${message}`);
}

/**
 * @param {string} message
 */
export function showInfo(message) {
  console.log(`${INDENT}${palette.secondary(ICON.info)} ${message}`);
}

/**
 * @param {string} message
 */
export function showWarning(message) {
  console.log(`${INDENT}${palette.warning(ICON.warn)} ${message}`);
}
