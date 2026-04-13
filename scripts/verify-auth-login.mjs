import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFromFile(filePath) {
  const result = {};
  const raw = fs.readFileSync(filePath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }

  return result;
}

const env = readEnvFromFile(".env");
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const email = process.argv[2] || "amanda.prop@dealbank.local";
const password = process.argv[3] || "DealBank2025!";

const { data, error } = await supabase.auth.signInWithPassword({ email, password });
if (error) {
  console.error(`LOGIN_ERROR: ${error.message}`);
  process.exit(1);
}

console.log(`LOGIN_OK: ${data.user.email}`);
await supabase.auth.signOut();
