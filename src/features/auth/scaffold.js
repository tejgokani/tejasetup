import fs from 'fs-extra';
import path from 'path';
import { hasScaffoldFeature, useTypeScript } from '../../config/userConfig.js';

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {string[]}
 */
export function planAuthDirectories(config) {
  if (!hasScaffoldFeature(config, 'auth')) return [];
  const d = [];
  if (config.stack.backend === 'node-express') {
    d.push('server/src/auth');
  }
  if (config.stack.frontend === 'react-vite') {
    d.push('client/src/lib');
  }
  return d;
}

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 * @returns {Record<string, string>}
 */
export function authServerDependencies(config) {
  if (!hasScaffoldFeature(config, 'auth')) return {};
  if (config.stack.backend === 'node-express') {
    return { jsonwebtoken: '^9.0.2' };
  }
  return {};
}

export function serverAuthMiddleware() {
  return `import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'change-me-in-production';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }
  try {
    req.user = jwt.verify(token, secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function signPayload(payload) {
  return jwt.sign(payload, secret, { expiresIn: '8h' });
}
`;
}

/**
 * @param {import('../../config/userConfig.js').UserConfig} config
 */
export function serverAuthRoutes(config) {
  const name = JSON.stringify(config.projectName);
  return `import { Router } from 'express';
import { signPayload } from '../middleware/jwt.js';

export const authRouter = Router();

/** Demo login — replace with real user lookup */
authRouter.post('/login', (req, res) => {
  const { email } = req.body ?? {};
  const token = signPayload({ sub: email || 'demo', project: ${name} });
  res.json({ token, tokenType: 'Bearer' });
});

authRouter.get('/me', (req, res) => {
  res.json({ message: 'Use Authorization: Bearer <token> with protected routes', project: ${name} });
});
`;
}

export function clientAuthStub() {
  return `/**
 * Client-side token helpers (store tokens from your login API).
 */

const KEY = 'tejasetup_auth_token';

export function getToken() {
  return localStorage.getItem(KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(KEY, token);
  else localStorage.removeItem(KEY);
}

export function authHeader() {
  const t = getToken();
  return t ? { Authorization: \`Bearer \${t}\` } : {};
}
`;
}

/**
 * @param {import('../../core/featureRegistry.js').FeatureContext} ctx
 */
export async function applyAuth({ projectRoot, config }) {
  if (!hasScaffoldFeature(config, 'auth')) return;

  if (config.stack.backend === 'node-express') {
    await fs.writeFile(
      path.join(projectRoot, 'server/src/middleware/jwt.js'),
      serverAuthMiddleware(),
      'utf8',
    );
    await fs.writeFile(
      path.join(projectRoot, 'server/src/routes/auth.js'),
      serverAuthRoutes(config),
      'utf8',
    );
  }

  if (config.stack.frontend === 'react-vite') {
    const name = useTypeScript(config) ? 'auth.ts' : 'auth.js';
    await fs.writeFile(
      path.join(projectRoot, 'client/src/lib', name),
      clientAuthStub(),
      'utf8',
    );
  }
}
