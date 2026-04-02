import { registerFeature } from '../../core/featureRegistry.js';
import {
  applyAuth,
  authServerDependencies,
  planAuthDirectories,
} from './scaffold.js';

registerFeature({
  id: 'auth',
  label: 'Authentication (JWT)',
  order: 30,
  planDirectories: planAuthDirectories,
  apply: applyAuth,
  serverDependencies: authServerDependencies,
});
