import { createClient } from "@supabase/supabase-js";

import fs from "node:fs";
import path from "node:path";

function readDotEnvValue(key) {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return "";

  const raw = fs.readFileSync(envPath, "utf8");
  const line = raw
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));

  if (!line) return "";
  const value = line.slice(line.indexOf("=") + 1).trim();
  return value.replace(/^"|"$/g, "").replace(/^'|'$/g, "");
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || readDotEnvValue("SUPABASE_URL") || readDotEnvValue("VITE_SUPABASE_URL");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || readDotEnvValue("SUPABASE_SERVICE_ROLE_KEY");
const defaultPassword = process.env.SEED_AUTH_PASSWORD || readDotEnvValue("SEED_AUTH_PASSWORD") || "DealBank2025!";

const missingVars = [];
if (!supabaseUrl) missingVars.push("SUPABASE_URL or VITE_SUPABASE_URL");
if (!serviceRoleKey) missingVars.push("SUPABASE_SERVICE_ROLE_KEY");

if (missingVars.length > 0) {
  console.error(`Missing env vars: ${missingVars.join(", ")}.`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const seedUsers = [
  { email: "daniel@dealbank.local", name: "Daniel", type: "admin" },
  { email: "nora.dealmaker@dealbank.local", name: "Nora Carter", type: "dealmaker" },
  { email: "ryan.contractor@dealbank.local", name: "Ryan Brooks", type: "contractor" },
  { email: "claire.realtor@dealbank.local", name: "Claire Morgan", type: "realtor" },
  { email: "admin@dealbank.local", name: "DealBank Admin", type: "admin" },
  { email: "admin@dealbank.io", name: "Admin", type: "admin" },
  { email: "aria@dealbank.local", name: "Aria Wilson", type: "dealmaker" },
  { email: "mike.plumbing@dealbank.local", name: "Mike Johnson", type: "contractor" },
  { email: "sarah.electric@dealbank.local", name: "Sarah Martinez", type: "contractor" },
  { email: "david.roofing@dealbank.local", name: "David Kim", type: "contractor" },
  { email: "rebecca.hvac@dealbank.local", name: "Rebecca Chen", type: "contractor" },
  { email: "carlos.flooring@dealbank.local", name: "Carlos Lopez", type: "contractor" },
  { email: "james.renovation@dealbank.local", name: "James Wilson", type: "contractor" },
  { email: "jennifer.realty@dealbank.local", name: "Jennifer Thompson", type: "realtor" },
  { email: "michael.homes@dealbank.local", name: "Michael Rodriguez", type: "realtor" },
  { email: "amanda.prop@dealbank.local", name: "Amanda Foster", type: "realtor" },
];

function isAlreadyRegisteredError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return code === "email_exists" || message.includes("already registered") || message.includes("already been registered");
}

async function findUserByEmail(email) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const found = users.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;

    if (users.length < perPage) return null;
    page += 1;
  }
}

async function ensureUser(seedUser) {
  const existing = await findUserByEmail(seedUser.email);

  if (existing) {
    const { error: updateError } = await supabase.auth.admin.updateUserById(existing.id, {
      password: defaultPassword,
      user_metadata: {
        ...(existing.user_metadata || {}),
        name: seedUser.name,
        type: seedUser.type,
      },
    });

    if (updateError) throw updateError;
    return { action: "updated", email: seedUser.email };
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email: seedUser.email,
    password: defaultPassword,
    email_confirm: true,
    user_metadata: {
      name: seedUser.name,
      type: seedUser.type,
    },
  });

  if (createError) {
    if (isAlreadyRegisteredError(createError)) {
      const user = await findUserByEmail(seedUser.email);
      if (!user) throw createError;

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: defaultPassword,
        user_metadata: {
          ...(user.user_metadata || {}),
          name: seedUser.name,
          type: seedUser.type,
        },
      });

      if (updateError) throw updateError;
      return { action: "updated", email: seedUser.email };
    }

    throw createError;
  }

  return { action: "created", email: seedUser.email };
}

async function main() {
  let created = 0;
  let updated = 0;

  for (const seedUser of seedUsers) {
    try {
      const result = await ensureUser(seedUser);
      if (result.action === "created") created += 1;
      if (result.action === "updated") updated += 1;
      console.log(`${result.action.toUpperCase()}: ${result.email}`);
    } catch (error) {
      console.error(`FAILED: ${seedUser.email} -> ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log("---");
  console.log(`Done. created=${created}, updated=${updated}`);
  console.log(`Default password for seeded auth users: ${defaultPassword}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
