/**
 * Map low-level fs errors to short, actionable CLI copy.
 * @param {unknown} err
 * @param {string} [context] e.g. "Could not create project"
 */
export function formatFsError(err, context) {
  const base =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : String(err);

  /** @type {{ code?: string; path?: string }} */
  const e = err && typeof err === 'object' ? err : {};

  let detail = base;
  if (e.code === 'EACCES' || e.code === 'EPERM') {
    detail = 'Permission denied. Try another directory or fix folder permissions.';
  } else if (e.code === 'ENOENT') {
    detail = e.path
      ? `Path not found: ${e.path}`
      : 'Path not found.';
  } else if (e.code === 'ENOSPC') {
    detail = 'Disk is full.';
  } else if (e.code === 'EEXIST') {
    detail = 'File or folder already exists.';
  }

  if (context) {
    return `${context}: ${detail}`;
  }
  return detail;
}
