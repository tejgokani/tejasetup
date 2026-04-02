import fs from 'fs-extra';
import path from 'path';
import { hasScaffoldFeature } from '../../config/userConfig.js';

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {string[]}
 */
export function planLoggingDirectories(config) {
  if (!hasScaffoldFeature(config, 'logging')) return [];
  const d = ['logs'];
  if (config.stack.backend === 'node-express') {
    d.push('server/src/lib');
  }
  return d;
}

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {Record<string, string>}
 */
export function loggingServerDependencies(config) {
  if (!hasScaffoldFeature(config, 'logging')) return {};
  if (config.stack.backend === 'node-express') {
    return { 'fs-extra': '^11.3.0' };
  }
  return {};
}

export function serverLoggerModule() {
  return `import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logDir = path.join(__dirname, '../../..', 'logs');
const logFile = path.join(logDir, 'app.log');

async function ensureLogDir() {
  await fs.ensureDir(logDir);
}

function stamp() {
  return new Date().toISOString();
}

export const logger = {
  async info(message, meta) {
    await ensureLogDir();
    const line = JSON.stringify({ level: 'info', time: stamp(), message, ...meta }) + '\\n';
    await fs.appendFile(logFile, line, 'utf8');
    console.log('[info]', message, meta ?? '');
  },
  async warn(message, meta) {
    await ensureLogDir();
    const line = JSON.stringify({ level: 'warn', time: stamp(), message, ...meta }) + '\\n';
    await fs.appendFile(logFile, line, 'utf8');
    console.warn('[warn]', message, meta ?? '');
  },
  async error(message, meta) {
    await ensureLogDir();
    const line = JSON.stringify({ level: 'error', time: stamp(), message, ...meta }) + '\\n';
    await fs.appendFile(logFile, line, 'utf8');
    console.error('[error]', message, meta ?? '');
  },
};
`;
}

export function sharedLoggerModule() {
  return `/** Minimal shared logger (console). Replace with pino/winston on the server. */

export const log = {
  info: (...args) => console.log('[info]', ...args),
  warn: (...args) => console.warn('[warn]', ...args),
  error: (...args) => console.error('[error]', ...args),
};
`;
}

/**
 * @param {import('../../core/featureRegistry.js').FeatureContext} ctx
 */
export async function applyLogging({ projectRoot, config }) {
  if (!hasScaffoldFeature(config, 'logging')) return;

  if (config.stack.backend === 'node-express') {
    await fs.writeFile(
      path.join(projectRoot, 'server/src/lib/logger.js'),
      serverLoggerModule(),
      'utf8',
    );
  } else {
    await fs.writeFile(
      path.join(projectRoot, 'shared/src/logger.js'),
      sharedLoggerModule(),
      'utf8',
    );
  }
}
