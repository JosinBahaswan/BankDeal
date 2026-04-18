import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing env vars: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const targetEmails = [
  "admin@dealbank.local",
  "admin@dealbank.io",
  "aria@dealbank.local",
  "mike.plumbing@dealbank.local",
  "sarah.electric@dealbank.local",
  "david.roofing@dealbank.local",
  "rebecca.hvac@dealbank.local",
  "carlos.flooring@dealbank.local",
  "james.renovation@dealbank.local",
  "jennifer.realty@dealbank.local",
  "michael.homes@dealbank.local",
  "amanda.prop@dealbank.local",
].map((e) => e.toLowerCase());

const userRefTables = [
  { table: "contractor_profiles", column: "user_id" },
  { table: "realtor_profiles", column: "user_id" },
  { table: "deals", column: "user_id" },
  { table: "marketplace_listings", column: "seller_id" },
  { table: "marketplace_saves", column: "user_id" },
  { table: "contracts", column: "creator_id" },
  { table: "call_logs", column: "caller_id" },
  { table: "leads", column: "owner_id" },
  { table: "sms_sequences", column: "owner_id" },
  { table: "subscriptions", column: "user_id" },
  { table: "credit_purchases", column: "user_id" },
  { table: "contractor_job_leads", column: "created_by" },
];

async function listAuthUsersByEmail() {
  const authMap = new Map();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    for (const user of users) {
      const email = String(user.email || "").toLowerCase();
      if (targetEmails.includes(email)) {
        authMap.set(email, user);
      }
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return authMap;
}

async function getPublicUserById(id) {
  const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function getPublicUserByEmail(email) {
  const { data, error } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return data;
}

async function ensurePublicUserMatchesAuth(authUser) {
  const email = String(authUser.email || "").toLowerCase();
  const authId = authUser.id;
  const existingById = await getPublicUserById(authId);

  if (existingById) {
    const { error } = await supabase
      .from("users")
      .update({
        email,
        name: existingById.name || authUser.user_metadata?.name || email.split("@")[0],
        type: existingById.type || authUser.user_metadata?.type || "dealmaker",
        email_verified: Boolean(authUser.email_confirmed_at),
        last_login: new Date().toISOString(),
      })
      .eq("id", authId);

    if (error) throw error;
    return { action: "already-mapped", email };
  }

  const existingByEmail = await getPublicUserByEmail(email);

  if (!existingByEmail) {
    const { error } = await supabase.from("users").insert({
      id: authId,
      email,
      name: authUser.user_metadata?.name || email.split("@")[0],
      type: authUser.user_metadata?.type || "dealmaker",
      company: null,
      phone: null,
      is_active: true,
      email_verified: Boolean(authUser.email_confirmed_at),
      joined_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
    });

    if (error) throw error;
    return { action: "inserted", email };
  }

  if (existingByEmail.id === authId) {
    return { action: "already-mapped", email };
  }

  const oldId = existingByEmail.id;
  const legacyEmail = `legacy+${oldId.slice(0, 8)}+${Date.now()}@dealbank.local`;

  const { error: renameError } = await supabase
    .from("users")
    .update({ email: legacyEmail })
    .eq("id", oldId)
    .eq("email", existingByEmail.email);
  if (renameError) throw renameError;

  const { error: insertNewError } = await supabase.from("users").insert({
    id: authId,
    email,
    name: existingByEmail.name || authUser.user_metadata?.name || email.split("@")[0],
    type: existingByEmail.type || authUser.user_metadata?.type || "dealmaker",
    company: existingByEmail.company || null,
    phone: existingByEmail.phone || null,
    is_active: existingByEmail.is_active ?? true,
    email_verified: existingByEmail.email_verified ?? Boolean(authUser.email_confirmed_at),
    joined_at: existingByEmail.joined_at || new Date().toISOString(),
    last_login: new Date().toISOString(),
  });
  if (insertNewError) throw insertNewError;

  for (const ref of userRefTables) {
    const updatePayload = { [ref.column]: authId };
    const { error: refError } = await supabase
      .from(ref.table)
      .update(updatePayload)
      .eq(ref.column, oldId);

    if (refError) throw new Error(`${ref.table}.${ref.column} update failed: ${refError.message}`);
  }

  const { error: deleteOldError } = await supabase.from("users").delete().eq("id", oldId);
  if (deleteOldError) throw deleteOldError;

  return { action: "remapped", email, oldId, newId: authId };
}

async function main() {
  const authUsers = await listAuthUsersByEmail();

  let remapped = 0;
  let inserted = 0;
  let alreadyMapped = 0;

  for (const email of targetEmails) {
    const authUser = authUsers.get(email);
    if (!authUser) {
      console.log(`SKIP (no auth user): ${email}`);
      continue;
    }

    try {
      const result = await ensurePublicUserMatchesAuth(authUser);
      if (result.action === "remapped") remapped += 1;
      if (result.action === "inserted") inserted += 1;
      if (result.action === "already-mapped") alreadyMapped += 1;
      console.log(`${result.action.toUpperCase()}: ${email}`);
    } catch (error) {
      console.error(`FAILED: ${email} -> ${error.message}`);
      process.exitCode = 1;
    }
  }

  console.log("---");
  console.log(`Summary: remapped=${remapped}, inserted=${inserted}, already_mapped=${alreadyMapped}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
