import { isSqlite } from "../config/env.js";

/**
 * Convert a query that uses ? placeholders into the correct dialect.
 * For Postgres we convert ? → $1, $2, ...
 */
export function sql(strings, ...values) {
  // Simple helper not used yet — we will normalize in query layer
}

export function normalize(sqlText, params = []) {
  if (isSqlite()) {
    return { text: sqlText.replace(/\$\d+/g, "?"), params };
  }
  // Convert ? to $1, $2...
  let i = 0;
  const text = sqlText.replace(/\?/g, () => `$${++i}`);
  return { text, params };
}
