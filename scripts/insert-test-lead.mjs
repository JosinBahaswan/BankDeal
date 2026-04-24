import fs from 'fs';
import path from 'path';

function parseDotEnv(content){
  const env = {};
  content.split(/\r?\n/).forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const idx = line.indexOf('=');
    if (idx === -1) return;
    const key = line.slice(0, idx);
    let val = line.slice(idx+1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  });
  return env;
}

const envPath = path.join(process.cwd(), '.env');
let fileEnv = {};
if (fs.existsSync(envPath)) {
  fileEnv = parseDotEnv(fs.readFileSync(envPath, 'utf8'));
}

const SUPABASE_URL = process.env.SUPABASE_URL || fileEnv.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env or environment');
  process.exit(1);
}

const DEFAULT_EMAIL = process.env.SMOKE_EMAIL || 'mike.plumbing@dealbank.local';

async function getUserByEmail(email) {
  const url = `${SUPABASE_URL}/rest/v1/users?select=id&email=eq.${encodeURIComponent(email)}`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) throw new Error(`Failed to query users: ${res.status}`);
  const items = await res.json();
  return items[0]?.id || null;
}

async function createListing(sellerId) {
  const body = {
    seller_id: sellerId,
    address: 'Test Listing (Copilot)',
    city: 'Testville',
    asking_price: 100000,
    status: 'active'
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/marketplace_listings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Prefer: 'return=representation' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed creating listing: ${res.status} ${txt}`);
  }
  const json = await res.json();
  return json[0]?.id;
}

async function insertLeadForUser(userEmail) {
  const userId = await getUserByEmail(userEmail);
  if (!userId) throw new Error(`No user found with email ${userEmail}`);

  const listingId = await createListing(userId);
  if (!listingId) throw new Error('Failed to create listing');

  const payload2 = {
    contractor_id: null,
    listing_id: listingId,
    created_by: userId,
    trade_required: 'Plumbing',
    budget_min: 5000,
    budget_max: 15000,
    notes: 'Smoke test lead from Copilot',
    status: 'open'
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/contractor_job_leads`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload2)
  });

  const txt = await res.text();
  return { status: res.status, body: txt };
}

(async () => {
  try {
    const result = await insertLeadForUser(DEFAULT_EMAIL);
    console.log('result', result);
    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
