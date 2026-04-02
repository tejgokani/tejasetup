import { palette } from './colors.js';
import { ICON } from './icons.js';
import { INDENT } from './terminalLayout.js';

export const logger = {
  info: (msg) => console.log(`${INDENT}${palette.secondary(ICON.info)} ${msg}`),
  success: (msg) =>
    console.log(`${INDENT}${palette.success(ICON.ok)} ${msg}`),
  error: (msg) => console.error(`${INDENT}${palette.error(ICON.err)} ${msg}`),
  warn: (msg) => console.warn(`${INDENT}${palette.warning(ICON.warn)} ${msg}`),
};
