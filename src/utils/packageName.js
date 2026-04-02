/**
 * Safe npm package name (scope-style segments collapsed to one name).
 * @param {string} projectName
 */
export function toNpmPackageName(projectName) {
  const s = projectName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return s || 'app';
}
