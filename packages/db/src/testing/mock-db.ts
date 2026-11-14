import type { DbOrTx } from "../types.js";

export interface MockDbOverrides {
  selectResult?: unknown[];
  selectResults?: unknown[][];
  insertResult?: unknown[];
  insertResults?: unknown[][];
  updateResult?: unknown[];
  updateResults?: unknown[][];
  deleteResult?: unknown[];
  executeResult?: unknown[];
}

export function createMockDb(overrides: MockDbOverrides = {}): DbOrTx {
  const selectQueue = overrides.selectResults ? [...overrides.selectResults] : null;
  const insertQueue = overrides.insertResults ? [...overrides.insertResults] : null;
  const updateQueue = overrides.updateResults ? [...overrides.updateResults] : null;
  const nextResult = (queue: unknown[][] | null, fallback?: unknown[]) =>
    queue && queue.length > 0 ? queue.shift() : (fallback ?? []);

  const chainable = (resolvedValue: unknown) => {
    const chain: Record<string, unknown> = {};
    const methods = [
      "from",
      "where",
      "innerJoin",
      "leftJoin",
      "rightJoin",
      "fullJoin",
      "orderBy",
      "groupBy",
      "having",
      "limit",
      "offset",
      "set",
      "values",
      "returning",
      "onConflictDoNothing",
      "onConflictDoUpdate",
    ];

    methods.forEach((method) => {
      chain[method] = (..._args: unknown[]) => chain;
    });

    chain.then = (resolve: (val: unknown) => void) => Promise.resolve(resolvedValue).then(resolve);
    chain.catch = (reject: (err: unknown) => void) => Promise.resolve(resolvedValue).catch(reject);

    return chain;
  };

  const mock = {
    select: (..._args: unknown[]) => chainable(nextResult(selectQueue, overrides.selectResult)),
    insert: (..._args: unknown[]) => chainable(nextResult(insertQueue, overrides.insertResult)),
    update: (..._args: unknown[]) => chainable(nextResult(updateQueue, overrides.updateResult)),
    delete: (..._args: unknown[]) => chainable(overrides.deleteResult ?? []),
    execute: async (..._args: unknown[]) => overrides.executeResult ?? [],
    transaction: async <T>(cb: (tx: DbOrTx) => Promise<T>): Promise<T> => cb(mock as unknown as DbOrTx),
    query: {},
  };

  return mock as unknown as DbOrTx;
}
