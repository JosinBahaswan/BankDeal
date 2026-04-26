/* global process */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import supertest from 'supertest';
import express from 'express';

vi.mock('../lib/server/stripeConnectShared.js', async () => {
  const actual = await vi.importActual('../lib/server/stripeConnectShared.js');

  const supabaseAdminFake = {
    from: (table) => {
      const chain = {
        _table: table,
        select() { return this; },
        eq() { return this; },
        in() { return this; },
        order() { return this; },
        maybeSingle: async function() {
          if (this._table === 'users') return { data: { id: 'benef-1' }, error: null };
          return { data: null, error: null };
        },
        insert: function() {
          const self = this;
          return {
            select: function() {
              return {
                single: async function() {
                  if (self._table === 'escrow_transactions') return { data: { id: 'escrow-xyz', status: 'pending' }, error: null };
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        single: async function() {
          if (this._table === 'escrow_transactions') return { data: { id: 'escrow-xyz', status: 'pending' }, error: null };
          return { data: null, error: null };
        },
      };
      return chain;
    },
    auth: {
      getUser: async () => ({ data: { user: { id: 'payer-uuid', email: 'payer@example.com' } }, error: null }),
    },
  };

  return {
    ...actual,
    createSupabaseAdminClient: () => supabaseAdminFake,
    verifyStripeActor: async () => ({ userId: 'payer-uuid', email: 'payer@example.com', name: 'Payer', userType: 'dealmaker', isAdmin: false }),
    createStripeClient: () => ({
      paymentIntents: {
        create: vi.fn(async (payload) => ({
          id: 'pi_stub_123',
          amount: payload.amount,
          client_secret: 'cs_stub_abc',
          currency: payload.currency || 'usd',
        })),
        cancel: vi.fn(async (id) => ({ id })),
      },
    }),
  };
});

describe('Stripe escrow create (supertest + nock)', () => {
  let request;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    // using stubbed createStripeClient() in the mock above

    const app = express();
    app.use(express.json());

    const handlerModule = await import('../api_deferred/stripe-escrow-create.js');
    app.post('/api/stripe-escrow', handlerModule.default);

    request = supertest(app);
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    vi.restoreAllMocks();
  });

  it('creates a PaymentIntent and persists escrow row', async () => {
    const res = await request
      .post('/api/stripe-escrow')
      .set('Authorization', 'Bearer test-token')
      .send({ beneficiaryUserId: 'benef-1', amount: 1000, currency: 'usd' });

    expect(res.status).toBe(200);
    expect(res.body.paymentIntentId).toBe('pi_stub_123');
    expect(res.body.escrowId).toBe('escrow-xyz');
    expect(res.body.clientSecret).toBe('cs_stub_abc');
  });
});
