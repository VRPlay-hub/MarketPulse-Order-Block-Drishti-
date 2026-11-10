import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.ts';

test('Cloudflare Worker handles CORS OPTIONS preflight', async () => {
  const req = new Request('http://localhost/api/market/status', {
    method: 'OPTIONS'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('Access-Control-Allow-Origin'), '*');
  assert.equal(res.headers.get('Access-Control-Allow-Methods'), 'GET, POST, OPTIONS');
});

test('Cloudflare Worker serves GET /api/market/status', async () => {
  const req = new Request('http://localhost/api/market/status', {
    method: 'GET'
  });
  const res = await worker.fetch(req, {
    MARKET_DATA_PROVIDER: 'synthetic_demo'
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Content-Type'), 'application/json');

  const json = await res.json() as { success: boolean; data: { providerId: string; upstoxConnection: { isConnected: boolean } } };
  assert.equal(json.success, true);
  assert.ok(json.data);
  assert.ok(json.data.providerId);
  assert.ok(json.data.upstoxConnection);
});

test('Cloudflare Worker serves GET /api/market/quotes with batched symbols', async () => {
  const req = new Request('http://localhost/api/market/quotes?symbols=RELIANCE,TCS', {
    method: 'GET'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);

  const json = await res.json() as { success: boolean; count: number; data: Array<{ symbol: string; lastPrice: number }> };
  assert.equal(json.success, true);
  assert.equal(json.count, 2);
  assert.equal(json.data[0].symbol, 'RELIANCE');
  assert.equal(json.data[1].symbol, 'TCS');
});

test('Cloudflare Worker serves GET /api/market/candles', async () => {
  const req = new Request('http://localhost/api/market/candles?symbol=RELIANCE&timeframe=1D&count=10', {
    method: 'GET'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);

  const json = await res.json() as { success: boolean; symbol: string; count: number; data: Array<{ open: number; close: number }> };
  assert.equal(json.success, true);
  assert.equal(json.symbol, 'RELIANCE');
  assert.ok(json.count > 0);
  assert.ok(json.data.length > 0);
});

test('Cloudflare Worker serves GET /api/market/indices', async () => {
  const req = new Request('http://localhost/api/market/indices', {
    method: 'GET'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);

  const json = await res.json() as { success: boolean; data: Array<{ symbol: string; name: string }> };
  assert.equal(json.success, true);
  assert.ok(json.data.length >= 2);
  assert.ok(json.data.some(idx => idx.symbol === 'NIFTY'));
});

test('Cloudflare Worker serves GET /api/market/upstox/status', async () => {
  const req = new Request('http://localhost/api/market/upstox/status', {
    method: 'GET'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);

  const json = await res.json() as { success: boolean; data: { isConnected: boolean; source: string } };
  assert.equal(json.success, true);
  assert.ok(typeof json.data.isConnected === 'boolean');
});

test('Cloudflare Worker validates POST /api/market/upstox/connect safely', async () => {
  // Test invalid content type
  const badContentReq = new Request('http://localhost/api/market/upstox/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'token'
  });
  const badContentRes = await worker.fetch(badContentReq, {});
  assert.equal(badContentRes.status, 415);

  // Test invalid short token
  const badTokenReq = new Request('http://localhost/api/market/upstox/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'short' })
  });
  const badTokenRes = await worker.fetch(badTokenReq, {});
  assert.equal(badTokenRes.status, 400);
  const badTokenJson = await badTokenRes.json() as { success: boolean; error: string };
  assert.equal(badTokenJson.success, false);
  assert.ok(badTokenJson.error.includes('at least 10 characters'));
});

test('Cloudflare Worker handles POST /api/market/upstox/disconnect cleanly', async () => {
  const req = new Request('http://localhost/api/market/upstox/disconnect', {
    method: 'POST'
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 200);
  const json = await res.json() as { success: boolean; message: string };
  assert.equal(json.success, true);
  assert.ok(json.message.includes('disconnected'));
});

test('Cloudflare Worker delegates static assets to env.ASSETS', async () => {
  let assetFetchCalled = false;
  const mockAssets = {
    fetch: async (r: Request | string) => {
      assetFetchCalled = true;
      return new Response('<html>Mock Index</html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    }
  };

  const req = new Request('http://localhost/dashboard');
  const res = await worker.fetch(req, { ASSETS: mockAssets });
  assert.equal(assetFetchCalled, true);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.equal(text, '<html>Mock Index</html>');
});

test('Cloudflare Worker returns 404 for non-API route when ASSETS binding is missing', async () => {
  const req = new Request('http://localhost/unknown-path');
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 404);
});
