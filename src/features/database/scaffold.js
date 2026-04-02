import fs from 'fs-extra';
import path from 'path';
import { hasScaffoldFeature } from '../../config/userConfig.js';

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {string[]}
 */
export function planDatabaseDirectories(config) {
  if (!hasScaffoldFeature(config, 'database')) return [];
  if (config.stack.backend === 'node-express') {
    return ['server/src/db'];
  }
  return ['shared/src/db'];
}

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {Record<string, string>}
 */
export function databaseServerDependencies(config) {
  if (!hasScaffoldFeature(config, 'database')) return {};
  if (config.stack.backend === 'node-express') {
    return { 'better-sqlite3': '^11.8.1' };
  }
  return {};
}

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 */
export function serverDbModule(config) {
  const name = JSON.stringify(config.projectName);
  return `import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../..', 'data', 'app.db');

/** SQLite for local dev. For PostgreSQL, use \`pg\` with DATABASE_URL instead. */
export function openDb() {
  return new Database(dbPath);
}

export function healthCheck() {
  try {
    const db = openDb();
    db.prepare('select 1 as ok').get();
    db.close();
    return { ok: true, project: ${name} };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
`;
}

export function sharedDbReadme() {
  return `# Database

- Server apps: see \`server/src/db\` (SQLite via better-sqlite3).
- Set \`DATABASE_URL\` for PostgreSQL when you switch drivers.
`;
}

export function serverDbRoutes() {
  return `import { Router } from 'express';
import { healthCheck } from '../db/index.js';

export const dbRouter = Router();

dbRouter.get('/health', (_req, res) => {
  res.json(healthCheck());
});
`;
}

/**
 * @param {import('../../core/featureRegistry.js').FeatureContext} ctx
 */
export async function applyDatabase({ projectRoot, config }) {
  if (!hasScaffoldFeature(config, 'database')) return;

  if (config.stack.backend === 'node-express') {
    await fs.ensureDir(path.join(projectRoot, 'data'));
    await fs.writeFile(
      path.join(projectRoot, 'server/src/db/index.js'),
      serverDbModule(config),
      'utf8',
    );
    await fs.writeFile(
      path.join(projectRoot, 'server/src/routes/db.js'),
      serverDbRoutes(),
      'utf8',
    );
  } else {
    await fs.writeFile(
      path.join(projectRoot, 'shared/src/db/README.md'),
      sharedDbReadme(),
      'utf8',
    );
  }
}
