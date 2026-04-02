import { registerFeature } from '../../core/featureRegistry.js';
import {
  applyDatabase,
  databaseServerDependencies,
  planDatabaseDirectories,
} from './scaffold.js';

registerFeature({
  id: 'database',
  label: 'Database (PostgreSQL / SQLite)',
  order: 20,
  planDirectories: planDatabaseDirectories,
  apply: applyDatabase,
  serverDependencies: databaseServerDependencies,
});
