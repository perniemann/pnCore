/**
 * Race `work` against a time budget and clear the timer either way. An uncleared timer keeps
 * Node alive until it fires: the npx smoke passed in about a second and then held CI for the
 * rest of its 120 s budget.
 * @template T
 * @param {Promise<T>} work
 * @param {number} budgetMs
 * @param {string} label used in the timeout error
 * @returns {Promise<T>}
 */
export async function withBudget(work, budgetMs, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} exceeded ${budgetMs}ms`)), budgetMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
