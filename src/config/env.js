export function validateEnv() {
  const required = ["DATABASE_URL","SESSION_SECRET"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  if (process.env.NODE_ENV === "production" && process.env.SESSION_SECRET.length < 32)
    throw new Error("SESSION_SECRET must be at least 32 characters in production.");
}
