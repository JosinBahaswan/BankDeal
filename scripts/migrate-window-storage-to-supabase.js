/*
  DealBank migration helper
  - Reads legacy records from window.storage (fallback: localStorage)
  - Calls new API endpoints to migrate users, deals, and CRM data
  - Triggers forced password reset for migrated users

  Browser usage example:
    import { migrateWindowStorage } from './scripts/migrate-window-storage-to-supabase.js';
    await migrateWindowStorage({
      apiBaseUrl: 'https://your-api.example.com/api/v1',
      authToken: '<admin-or-service-token>'
    });
*/

const DEFAULT_ENDPOINTS = {
  registerUser: '/auth/register',
  forgotPassword: '/auth/forgot-password',
  deals: '/deals',
  leads: '/crm/leads',
  callLogs: '/crm/call-logs',
  sequences: '/crm/sequences',
  sequenceSteps: (sequenceId) => `/crm/sequences/${sequenceId}/steps`,
};

const DEAL_STAGES = new Set([
  'Analyzing',
  'Under Contract',
  'Renovating',
  'Listing',
  'Selling',
  'Closed',
]);

const CALL_OUTCOMES = new Set([
  'No Answer',
  'Left Voicemail',
  'Callback Scheduled',
  'Not Interested',
  'Wrong Number',
  'Deal Potential',
  'Offer Sent',
]);

const ROLE_MAP = {
  dealmaker: 'dealmaker',
  contractor: 'contractor',
  realtor: 'realtor',
  admin: 'admin',
};

const RENO_KEY_MAP = {
  kitchen: 'renoKitchen',
  bathrooms: 'renoBathrooms',
  flooring: 'renoFlooring',
  paint: 'renoPaint',
  hvac: 'renoHvac',
  plumbing: 'renoPlumbing',
  electrical: 'renoElectrical',
  roof: 'renoRoof',
  windows: 'renoWindows',
  landscaping: 'renoLandscaping',
  foundation: 'renoFoundation',
  misc: 'renoMisc',
};

function randomTempPassword() {
  const suffix = Math.random().toString(36).slice(2, 10);
  return `DealBank!${suffix}1A`;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return Math.round(parsed);
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) return date.toISOString();

  // Handle short US dates like M/D/YYYY from legacy savedAt fields.
  const matched = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!matched) return null;

  const mm = matched[1].padStart(2, '0');
  const dd = matched[2].padStart(2, '0');
  const yyyy = matched[3].length === 2 ? `20${matched[3]}` : matched[3];
  const rebuilt = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
  return Number.isNaN(rebuilt.getTime()) ? null : rebuilt.toISOString();
}

function normalizeRole(input) {
  const key = String(input || '').toLowerCase();
  return ROLE_MAP[key] || 'dealmaker';
}

function normalizeStage(input) {
  if (DEAL_STAGES.has(input)) return input;
  return 'Analyzing';
}

function normalizeOutcome(input) {
  if (CALL_OUTCOMES.has(input)) return input;

  const value = String(input || '').toLowerCase();
  if (value.includes('voicemail')) return 'Left Voicemail';
  if (value.includes('callback')) return 'Callback Scheduled';
  if (value.includes('not interested')) return 'Not Interested';
  if (value.includes('wrong')) return 'Wrong Number';
  if (value.includes('potential')) return 'Deal Potential';
  if (value.includes('offer')) return 'Offer Sent';
  return 'No Answer';
}

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [];
}

function parseMaybeJson(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function extractEmailFromUserKey(key) {
  const prefix = 'user:';
  if (!String(key).startsWith(prefix)) return null;
  return key.slice(prefix.length);
}

export class WindowStorageMigrator {
  constructor({
    apiBaseUrl,
    authToken,
    storageClient,
    fetchImpl,
    endpoints,
    dryRun = false,
    logger = console,
  }) {
    if (!apiBaseUrl) throw new Error('apiBaseUrl is required');

    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.authToken = authToken || null;
    this.storage = storageClient || (typeof window !== 'undefined' ? window.storage : null);
    this.fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.endpoints = { ...DEFAULT_ENDPOINTS, ...(endpoints || {}) };
    this.dryRun = dryRun;
    this.logger = logger;

    this.report = {
      users: { migrated: 0, failed: 0 },
      deals: { migrated: 0, failed: 0 },
      leads: { migrated: 0, failed: 0 },
      callLogs: { migrated: 0, failed: 0 },
      sequences: { migrated: 0, failed: 0 },
      errors: [],
    };
  }

  async request(path, payload) {
    if (this.dryRun) {
      this.logger.info('[dry-run]', path, payload);
      return { success: true, data: { dryRun: true } };
    }

    if (!this.fetchImpl) {
      throw new Error('fetch implementation not found');
    }

    const headers = { 'Content-Type': 'application/json' };
    if (this.authToken) headers.Authorization = `Bearer ${this.authToken}`;

    const response = await this.fetchImpl(`${this.apiBaseUrl}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    const body = text ? parseMaybeJson(text) : null;

    if (!response.ok) {
      const message = body?.error?.message || body?.message || `${response.status} ${response.statusText}`;
      const error = new Error(message);
      error.status = response.status;
      error.body = body;
      throw error;
    }

    return body || { success: true };
  }

  async listKeys(prefix) {
    if (this.storage && typeof this.storage.list === 'function') {
      const result = await this.storage.list(prefix);
      if (!result) return [];
      if (Array.isArray(result)) return result;
      if (Array.isArray(result.keys)) return result.keys;
      return [];
    }

    if (typeof localStorage !== 'undefined') {
      return Object.keys(localStorage).filter((key) => key.startsWith(prefix));
    }

    return [];
  }

  async getValueByKey(key) {
    if (this.storage && typeof this.storage.get === 'function') {
      const result = await this.storage.get(key);
      if (!result) return null;

      if (typeof result === 'string') return parseMaybeJson(result);
      if (result && typeof result === 'object' && 'value' in result) return parseMaybeJson(result.value);
      return parseMaybeJson(result);
    }

    if (typeof localStorage !== 'undefined') {
      return parseMaybeJson(localStorage.getItem(key));
    }

    return null;
  }

  async getAllUsers() {
    const keys = await this.listKeys('user:');
    const users = [];

    for (const key of keys) {
      const user = await this.getValueByKey(key);
      if (!user || typeof user !== 'object') continue;
      users.push({ key, user });
    }

    return users;
  }

  async migrateUsers() {
    const users = await this.getAllUsers();

    for (const item of users) {
      const legacy = item.user;
      const email = legacy.email || extractEmailFromUserKey(item.key);
      if (!email) continue;

      const payload = {
        email,
        password: randomTempPassword(),
        name: legacy.name || email,
        type: normalizeRole(legacy.type),
        company: legacy.company || null,
        phone: legacy.phone || null,
        forcePasswordReset: true,
        metadata: {
          migrationSource: 'window.storage',
          legacyJoinedAt: toIsoDate(legacy.joined),
          legacyTrade: legacy.trade || null,
          legacyLocation: legacy.location || null,
          legacyPasswordPresent: Boolean(legacy.password || legacy.password_hash),
        },
      };

      try {
        await this.request(this.endpoints.registerUser, payload);
        await this.request(this.endpoints.forgotPassword, { email });
        this.report.users.migrated += 1;
      } catch (error) {
        // If account already exists, still force reset path.
        if (error.status === 409) {
          try {
            await this.request(this.endpoints.forgotPassword, { email });
            this.report.users.migrated += 1;
            continue;
          } catch (forgotError) {
            this.report.users.failed += 1;
            this.report.errors.push({ scope: 'users', email, message: forgotError.message });
            continue;
          }
        }

        this.report.users.failed += 1;
        this.report.errors.push({ scope: 'users', email, message: error.message });
      }
    }
  }

  async getDealsByEmail(email) {
    const keys = await this.listKeys(`deal:${email}:`);
    const rows = [];

    for (const key of keys) {
      const value = await this.getValueByKey(key);
      if (!value || typeof value !== 'object') continue;
      rows.push({ key, value });
    }

    return rows;
  }

  mapDealPayload(email, rawDeal, key) {
    const reno = rawDeal.reno && typeof rawDeal.reno === 'object' ? rawDeal.reno : {};

    const payload = {
      externalId: rawDeal.id || key,
      ownerEmail: email,
      address: rawDeal.address || null,
      stage: normalizeStage(rawDeal.stage),
      arv: toNumber(rawDeal.arvNum ?? rawDeal.arv),
      offerPct: toNumber(rawDeal.offerPct) ?? 60,
      offerPrice: toNumber(rawDeal.offer ?? rawDeal.offerPrice),

      renoKitchen: toNumber(reno.kitchen),
      renoBathrooms: toNumber(reno.bathrooms),
      renoFlooring: toNumber(reno.flooring),
      renoPaint: toNumber(reno.paint),
      renoHvac: toNumber(reno.hvac),
      renoPlumbing: toNumber(reno.plumbing),
      renoElectrical: toNumber(reno.electrical),
      renoRoof: toNumber(reno.roof),
      renoWindows: toNumber(reno.windows),
      renoLandscaping: toNumber(reno.landscaping),
      renoFoundation: toNumber(reno.foundation),
      renoMisc: toNumber(reno.misc),

      hmRate: toNumber(rawDeal.hardRate ?? rawDeal.hmRate),
      hmMonths: toInteger(rawDeal.loanMo ?? rawDeal.hmMonths),
      hmPoints: toNumber(rawDeal.loanPts ?? rawDeal.hmPoints),
      softCosts: toNumber(rawDeal.softCosts),

      notes: rawDeal.notes || null,
      savedAt: toIsoDate(rawDeal.savedAt) || new Date().toISOString(),

      metadata: {
        migrationSource: 'window.storage',
        sourceKey: key,
      },
    };

    // Backfill reno values if legacy payload used top-level keys.
    for (const [legacyKey, mappedKey] of Object.entries(RENO_KEY_MAP)) {
      if (payload[mappedKey] === null && rawDeal[legacyKey] !== undefined) {
        payload[mappedKey] = toNumber(rawDeal[legacyKey]);
      }
    }

    return payload;
  }

  async migrateDealsForEmail(email) {
    const rows = await this.getDealsByEmail(email);

    for (const row of rows) {
      const payload = this.mapDealPayload(email, row.value, row.key);

      if (!payload.address) {
        this.report.deals.failed += 1;
        this.report.errors.push({ scope: 'deals', key: row.key, message: 'Missing address' });
        continue;
      }

      try {
        await this.request(this.endpoints.deals, payload);
        this.report.deals.migrated += 1;
      } catch (error) {
        this.report.deals.failed += 1;
        this.report.errors.push({ scope: 'deals', key: row.key, message: error.message });
      }
    }
  }

  async getCollectionRows(email, singularPrefix, pluralPrefix) {
    const rows = [];

    const itemKeys = await this.listKeys(`${singularPrefix}:${email}:`);
    for (const key of itemKeys) {
      const value = await this.getValueByKey(key);
      if (value && typeof value === 'object') rows.push({ key, value });
    }

    const aggregateKey = `${pluralPrefix}:${email}`;
    const aggregateValue = await this.getValueByKey(aggregateKey);
    if (Array.isArray(aggregateValue)) {
      aggregateValue.forEach((value, index) => {
        if (value && typeof value === 'object') {
          rows.push({ key: `${aggregateKey}#${index}`, value });
        }
      });
    }

    return rows;
  }

  async migrateLeadsForEmail(email) {
    const rows = await this.getCollectionRows(email, 'lead', 'leads');

    for (const row of rows) {
      const lead = row.value;
      const payload = {
        ownerEmail: email,
        name: lead.name || lead.leadName || null,
        phone: lead.phone || null,
        address: lead.address || null,
        equity: toNumber(lead.equity),
        avmValue: toNumber(lead.avmValue ?? lead.avm),
        status: lead.status || 'new',
        leadType: lead.leadType || lead.type || null,
        tags: toArray(lead.tags),
        source: lead.source || 'legacy',
        addedAt: toIsoDate(lead.addedAt) || new Date().toISOString(),
        lastContacted: toIsoDate(lead.lastContacted),
        metadata: { migrationSource: 'window.storage', sourceKey: row.key },
      };

      try {
        await this.request(this.endpoints.leads, payload);
        this.report.leads.migrated += 1;
      } catch (error) {
        this.report.leads.failed += 1;
        this.report.errors.push({ scope: 'leads', key: row.key, message: error.message });
      }
    }
  }

  async migrateCallLogsForEmail(email) {
    const rows = await this.getCollectionRows(email, 'call', 'calls');

    for (const row of rows) {
      const call = row.value;
      const payload = {
        callerEmail: email,
        leadName: call.leadName || call.name || null,
        phone: call.phone || null,
        address: call.address || null,
        outcome: normalizeOutcome(call.outcome),
        notes: call.notes || null,
        durationSec: toInteger(call.durationSec ?? call.duration),
        calledAt: toIsoDate(call.calledAt ?? call.date) || new Date().toISOString(),
        metadata: { migrationSource: 'window.storage', sourceKey: row.key },
      };

      try {
        await this.request(this.endpoints.callLogs, payload);
        this.report.callLogs.migrated += 1;
      } catch (error) {
        this.report.callLogs.failed += 1;
        this.report.errors.push({ scope: 'call_logs', key: row.key, message: error.message });
      }
    }
  }

  async migrateSequencesForEmail(email) {
    const rows = await this.getCollectionRows(email, 'sequence', 'sequences');

    for (const row of rows) {
      const sequence = row.value;
      const sequencePayload = {
        ownerEmail: email,
        name: sequence.name || 'Legacy Sequence',
        status: sequence.status || 'draft',
        leadCount: toInteger(sequence.leadCount) || 0,
        metadata: { migrationSource: 'window.storage', sourceKey: row.key },
      };

      try {
        const created = await this.request(this.endpoints.sequences, sequencePayload);
        const sequenceId = created?.data?.id || created?.id;

        const steps = toArray(sequence.steps).map((step, idx) => ({
          stepOrder: toInteger(step.stepOrder ?? step.order ?? idx + 1) || idx + 1,
          dayOffset: toInteger(step.dayOffset ?? step.day ?? 0) || 0,
          type: step.type || 'sms',
          message: step.message || null,
        }));

        if (sequenceId && steps.length > 0) {
          await this.request(this.endpoints.sequenceSteps(sequenceId), { steps });
        }

        this.report.sequences.migrated += 1;
      } catch (error) {
        this.report.sequences.failed += 1;
        this.report.errors.push({ scope: 'sequences', key: row.key, message: error.message });
      }
    }
  }

  async run({ emails } = {}) {
    await this.migrateUsers();

    let targetEmails = emails;
    if (!Array.isArray(targetEmails) || targetEmails.length === 0) {
      const users = await this.getAllUsers();
      targetEmails = users
        .map(({ key, user }) => user.email || extractEmailFromUserKey(key))
        .filter(Boolean);
    }

    const uniqueEmails = [...new Set(targetEmails)];

    for (const email of uniqueEmails) {
      await this.migrateDealsForEmail(email);
      await this.migrateLeadsForEmail(email);
      await this.migrateCallLogsForEmail(email);
      await this.migrateSequencesForEmail(email);
    }

    this.logger.info('Migration complete', this.report);
    return this.report;
  }
}

export async function migrateWindowStorage(options) {
  const migrator = new WindowStorageMigrator(options);
  return migrator.run();
}

if (typeof window !== 'undefined') {
  window.dealbankMigration = {
    migrateWindowStorage,
    WindowStorageMigrator,
  };
}
