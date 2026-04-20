import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function readEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    result[key] = value;
  }

  return result;
}

const env = readEnvFile(".env");
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);
const baseUrl = String(process.argv[4] || "http://localhost:3000").replace(/\/$/, "");

const auth = await supabase.auth.signInWithPassword({
  email: process.argv[2] || "admin@dealbank.local",
  password: process.argv[3] || "DealBank2025!",
});

if (auth.error) {
  console.error(`AUTH_ERROR: ${auth.error.message}`);
  process.exit(1);
}

const accessToken = auth.data?.session?.access_token;
const prompt = "Real estate analyst. Return ONLY raw JSON no markdown: {\"property\":{},\"avm\":{},\"comps\":[]}";

const response = await fetch(`${baseUrl}/api/claude`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ prompt, maxTokens: 1200 }),
});

const payload = await response.json().catch(() => ({}));
console.log(`STATUS=${response.status}`);
console.log(`DEMO=${Boolean(payload?.demo)}`);
console.log(`PROVIDER=${String(payload?.provider || "")}`);
console.log(`HAS_PROPERTY=${typeof payload?.text === "string" && payload.text.includes("\"property\"")}`);

await supabase.auth.signOut();
