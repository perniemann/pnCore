/**
 * Pure checks used by pn-pr-review-gate.mjs, split out so they can be unit-tested.
 */

/**
 * A bare TODO marker: the uppercase `TODO` convention without an `(#123)` issue reference.
 * Case-sensitive on purpose: lowercase `todo` is ordinary data (a Paperclip status, an i18n
 * key, a task-list id), not a deferred-work marker.
 */
export const BARE_TODO_RE = /\bTODO\b(?!\s*\(#\d+\))/;

export function hasBareTodo(addedText) {
  return BARE_TODO_RE.test(addedText);
}
