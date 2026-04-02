/**
 * @param {string} name
 * @returns {true | string}
 */
export function validateProjectName(name) {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return 'Project name is required';
  }
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-_]*$/.test(trimmed)) {
    return 'Use letters, numbers, hyphens, or underscores; must start with a letter or number';
  }
  if (trimmed.length > 214) {
    return 'Name is too long';
  }
  return true;
}
