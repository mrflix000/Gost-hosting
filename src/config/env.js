export function validateEnv() {
  const required = ["SESSION_SECRET"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }
  if (process.env.NODE_ENV === "production" && process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
  }
}

export function isSqlite() {
  const url = process.env.DATABASE_URL || "";
  return !url || url.startsWith("sqlite:");
}

export function getDbPath() {
  const url = process.env.DATABASE_URL || "sqlite:./data/ghost.db";
  if (url.startsWith("sqlite:")) return url.replace("sqlite:", "") || "./data/ghost.db";
  return null;
}
