import { describe, it, expect, vi } from 'vitest';

// Mock stripeConnectShared to use test doubles for Stripe and Supabase
vi.mock('../lib/server/stripeConnectShared.js', async () => {
  const actual = await vi.importActual('../lib/server/stripeConnectShared.js');

  const stripeMock = {
    paymentIntents: {
      create: vi.fn(async (payload) => {
        return {
          id: 'pi_fake_123',
          amount: payload.amount,
          client_secret: 'cs_fake_abc',
          currency: payload.currency || 'usd',
        };
      }),
      cancel: vi.fn(async (id) => ({ id })),
    },
  };

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
    storage: {
      from: () => ({ createSignedUrl: async () => ({ data: { signedUrl: '' } }) }),
    },
  };

  return {
    ...actual,
    createStripeClient: () => stripeMock,
    createSupabaseAdminClient: () => supabaseAdminFake,
    verifyStripeActor: async () => ({ userId: 'payer-uuid', email: 'payer@example.com', name: 'Payer', userType: 'dealmaker', isAdmin: false }),
  };
});

describe('Stripe escrow create integration', () => {
  it('creates a PaymentIntent and persists escrow row', async () => {
    const mod = await import('../api_deferred/stripe-escrow-create.js');
    const handler = mod.default;

    const req = {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        host: 'localhost',
      },
      body: {
        beneficiaryUserId: 'benef-1',
        amount: 1000,
        currency: 'usd',
      },
    };

    const res = {
      statusCode: 200,
      headers: {},
      _body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(payload) { this._body = payload; return this; },
      end() { return this; },
    };

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res._body).toBeTruthy();
    expect(res._body.paymentIntentId).toBe('pi_fake_123');
    expect(res._body.escrowId).toBe('escrow-xyz');
    expect(res._body.clientSecret).toBe('cs_fake_abc');
    expect(res._body.amount).toBe(1000);
    expect(res._body.currency).toBe('usd');
  });
});
