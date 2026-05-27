type RuntimeEnv = Record<string, string | undefined>;
type RuntimeGlobal = typeof globalThis & {
  __APP_RUNTIME_ENV__?: RuntimeEnv;
};

function normalizeRuntimeEnv(env: unknown): RuntimeEnv {
  if (!env || typeof env !== "object") return {};

  const runtimeEnv: RuntimeEnv = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      runtimeEnv[key] = String(value);
    }
  }

  return runtimeEnv;
}

function readEnv(...keys: string[]) {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  const runtimeEnv = runtimeGlobal.__APP_RUNTIME_ENV__ ?? {};
  const processEnv = typeof process !== "undefined" ? (process.env as RuntimeEnv) : {};
  const buildEnv = import.meta.env as RuntimeEnv;

  for (const key of keys) {
    const value = runtimeEnv[key] || processEnv[key] || buildEnv[key];
    if (value) return value;
  }

  return undefined;
}

export function syncRuntimeEnv(env: unknown) {
  const runtimeGlobal = globalThis as RuntimeGlobal;
  const runtimeEnv = normalizeRuntimeEnv(env);

  runtimeGlobal.__APP_RUNTIME_ENV__ = {
    ...(runtimeGlobal.__APP_RUNTIME_ENV__ ?? {}),
    ...runtimeEnv,
  };

  if (typeof process === "undefined") return;

  const processEnv = process.env as RuntimeEnv;
  for (const [key, value] of Object.entries(runtimeEnv)) {
    if (processEnv[key] === undefined) {
      processEnv[key] = value;
    }
  }
}

export function getSupabasePublicEnv() {
  return {
    url: readEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    publishableKey: readEnv(
      "SUPABASE_PUBLISHABLE_KEY",
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
      "VITE_SUPABASE_ANON_KEY",
    ),
  };
}

export function getSupabaseAdminEnv() {
  return {
    url: readEnv("SUPABASE_URL", "VITE_SUPABASE_URL"),
    serviceRoleKey: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}
