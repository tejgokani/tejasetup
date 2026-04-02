/**
 * Searchable single- and multi-select prompts via @inquirer/search.
 * Filtering is case-insensitive; matched substrings are highlighted in the list.
 */
import { search } from '@inquirer/prompts';
import chalk from 'chalk';

export const SEARCH_HINT = 'Type to search, use arrow keys to select';

const HELP_LINE = SEARCH_HINT;

/**
 * @param {string} text
 * @param {string | undefined} term
 */
export function highlightMatch(text, term) {
  const needle = (term ?? '').trim();
  if (!needle) return text;
  const lower = text.toLowerCase();
  const n = needle.toLowerCase();
  const idx = lower.indexOf(n);
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + needle.length);
  const after = text.slice(idx + needle.length);
  return `${before}${chalk.bold.yellow(mid)}${after}`;
}

/**
 * @template {{ name: string; value: string }} T
 * @param {T[]} choices
 * @param {string | undefined} term
 * @returns {T[]}
 */
export function filterByTerm(choices, term) {
  const t = (term ?? '').trim().toLowerCase();
  if (!t) return choices;
  return choices.filter(
    (c) =>
      c.name.toLowerCase().includes(t) ||
      String(c.value).toLowerCase().includes(t),
  );
}

/**
 * @template T
 * @param {T[]} choices
 * @param {string | undefined} defaultValue
 * @returns {T[]}
 */
function sortDefaultFirst(choices, defaultValue) {
  if (defaultValue == null) return choices;
  const i = choices.findIndex((c) => c.value === defaultValue);
  if (i <= 0) return choices;
  const copy = [...choices];
  const [item] = copy.splice(i, 1);
  return [item, ...copy];
}

const DONE_VALUE = '__search_done__';

/**
 * Single-select with live filter + highlight.
 * @param {object} opts
 * @param {string} opts.message
 * @param {{ name: string; value: string }[]} opts.choices
 * @param {string} [opts.defaultValue]
 * @returns {Promise<string>}
 */
export async function promptSearchSelect({
  message,
  choices,
  defaultValue,
}) {
  const ordered = sortDefaultFirst(choices, defaultValue);

  return search({
    message: `${message}\n${SEARCH_HINT}`,
    pageSize: 12,
    instructions: { navigation: HELP_LINE, pager: HELP_LINE },
    source: async (term) => {
      const filtered = filterByTerm(ordered, term);
      return filtered.map((c) => ({
        value: c.value,
        name: highlightMatch(c.name, term),
      }));
    },
  });
}

/**
 * Multi-select via repeated search: pick items to toggle, then "Done".
 * @param {object} opts
 * @param {string} opts.message
 * @param {{ name: string; value: string }[]} opts.choices
 * @param {string[]} [opts.defaultSelected]
 * @returns {Promise<string[]>}
 */
export async function promptSearchMultiToggle({
  message,
  choices,
  defaultSelected = [],
}) {
  const allowed = new Set(choices.map((c) => c.value));
  const selected = new Set(
    defaultSelected.filter((v) => allowed.has(v)),
  );

  for (;;) {
    const pick = await search({
      message: `${message}\n${SEARCH_HINT}\nSelected: ${selected.size ? [...selected].join(', ') : 'none'}`,
      pageSize: 14,
      instructions: { navigation: HELP_LINE, pager: HELP_LINE },
      source: async (term) => {
        const filtered = filterByTerm(choices, term);
        const rows = filtered.map((c) => {
          const mark = selected.has(c.value) ? '[✓]' : '[ ]';
          return {
            value: c.value,
            name: `${mark} ${highlightMatch(c.name, term)}`,
          };
        });
        return [
          {
            value: DONE_VALUE,
            name: highlightMatch('→ Done', term),
          },
          ...rows,
        ];
      },
    });

    if (pick === DONE_VALUE) break;
    if (selected.has(pick)) selected.delete(pick);
    else selected.add(pick);
  }

  return [...selected];
}
