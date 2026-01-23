import "server-only";

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const ENV = {
  APP_PASSCODE: req("APP_PASSCODE"),
  SUPABASE_URL: req("SUPABASE_URL"),
  SUPABASE_ANON_KEY: req("SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: req("SUPABASE_SERVICE_ROLE_KEY"),
  BLOB_READ_WRITE_TOKEN: req("BLOB_READ_WRITE_TOKEN"),
};
