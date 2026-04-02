import { registerFeature } from '../../core/featureRegistry.js';
import {
  applyLogging,
  loggingServerDependencies,
  planLoggingDirectories,
} from './scaffold.js';

registerFeature({
  id: 'logging',
  label: 'Logging',
  order: 10,
  planDirectories: planLoggingDirectories,
  apply: applyLogging,
  serverDependencies: loggingServerDependencies,
});
