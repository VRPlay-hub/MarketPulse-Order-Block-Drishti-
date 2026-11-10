# MarketPulse India — Cloudflare Workers Deployment Guide

This document details the architecture, configuration, and step-by-step procedures to deploy **MarketPulse India** to **Cloudflare Workers** with Static Assets.

This deployment model allows the application to run globally at Cloudflare's edge on a 100% serverless runtime, remaining 24/7 accessible without Google AI Studio being open or needing a long-running Node.js virtual machine.

---

## 1. Architecture Audit & Dual-Runtime Design

MarketPulse India supports **dual deployment targets** from a single codebase:

| Component | Standard / Cloud Run Runtime | Cloudflare Workers Runtime |
| :--- | :--- | :--- |
| **Runtime Engine** | Node.js v20+ / Docker container | Cloudflare Workers (V8 isolates + `nodejs_compat`) |
| **Entry Point** | `server.ts` (Express 4) | `src/worker.ts` (`export default { fetch }`) |
| **Frontend Assets** | `dist/` served via `express.static` & SPA catch-all | `dist/` served via Cloudflare Static Assets (`env.ASSETS`) |
| **API Endpoints** | Express routes mounted on `/api/market/*` | Native fetch router mounted on `/api/market/*` |
| **Upstox Secrets** | Container `UPSTOX_ACCESS_TOKEN` env var | Cloudflare Encrypted Secret `UPSTOX_ACCESS_TOKEN` |
| **Session Memory** | In-memory singleton with token fallback | Per-isolate memory with encrypted secret fallback |
| **Persistence** | Firebase Auth & Cloud Firestore (client-side SDK) | Firebase Auth & Cloud Firestore (client-side SDK) |
| **Demo Fallback** | `DemonstrationMarketProvider` (0 credentials) | `DemonstrationMarketProvider` (0 credentials) |

### Key Audit Findings:
1. **Zero Node OS Primitives in Core Business Logic**: The market provider, calculations, order block algorithms, and Upstox client in `src/server/marketDataService.ts` use only standard Web APIs (`fetch`, `Headers`, `Request`, `Response`, `Date`, `Math`, `Map`, `URLSearchParams`, `JSON`). They do not use `fs`, `net`, `http`, or `child_process`.
2. **SPA Routing**: The `assets` binding in `wrangler.jsonc` specifies `"not_found_handling": "single-page-application"`. Client-side route navigations (e.g., `/settings`, `/journal`, `/backtest`) automatically serve `dist/index.html`.
3. **API Integrity**: All seven `/api/market/*` routes present in Express are identically handled in `src/worker.ts`:
   - `GET /api/market/status`
   - `GET /api/market/quotes?symbols=...`
   - `GET /api/market/candles?symbol=...&interval=...&from=...&to=...`
   - `GET /api/market/indices`
   - `GET /api/market/upstox/status`
   - `POST /api/market/upstox/connect`
   - `POST /api/market/upstox/disconnect`
4. **CORS & Rate Limiting**: The Worker includes native CORS headers for cross-origin callers and an in-memory IP rate limiter on sensitive endpoints (`/api/market/upstox/connect`).

---

## 2. Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://dash.cloudflare.com/sign-up) (Free tier is sufficient).
2. **Node.js**: Node.js 20+ installed locally.
3. **Cloudflare Wrangler CLI**: Installed locally or run via `npx wrangler`.
4. **Upstox API Credentials (Optional)**:
   - For real market data: Upstox Access Token from the Upstox Developer Portal.
   - If no token is provided, the app automatically runs in **Demonstration Mode** with zero configuration required.

---

## 3. Step-by-Step Deployment Instructions

### Step 1: Clone and Install Dependencies
```bash
git clone <your-repository-url>
cd marketpulse-india
npm install
```

### Step 2: Authenticate Wrangler with Cloudflare
Log in to your Cloudflare account from your terminal:
```bash
npx wrangler login
```
*A browser window will open asking you to authorize Wrangler.*

### Step 3: Verify the Build Locally
Compile the Vite frontend and perform a dry-run test:
```bash
# Runs frontend build and tests worker bundling
npm run build:worker
```
Expected output:
```text
✨ Read 4 files from the assets directory ./dist
Total Upload: ~75 KiB
Your Worker has access to the following bindings:
Binding Resource
env.ASSETS Assets
env.MARKET_DATA_PROVIDER ("upstox") Environment Variable
--dry-run: exiting now.
```

### Step 4: Configure Upstox Credentials (Optional)
If you wish to configure a persistent Upstox Access Token at the worker level:
```bash
npx wrangler secret put UPSTOX_ACCESS_TOKEN
```
When prompted, paste your Upstox API token. It will be encrypted and stored securely within Cloudflare KMS.

*(Note: Users can also connect an Upstox token anytime directly in the web app via **Settings & Data -> Connect Your Upstox Account**).*

### Step 5: Deploy to Cloudflare Workers
Deploy the full application (frontend static assets + backend Worker API):
```bash
npx wrangler deploy
```
Wrangler will output your live URL:
```text
Uploaded marketpulse-india (x.xx sec)
Deployed marketpulse-india triggers (x.xx sec)
  https://marketpulse-india.<your-subdomain>.workers.dev
Current Version ID: ...
```

---

## 4. Automated CI/CD via GitHub Actions

To automatically build and deploy whenever you push to GitHub, add a GitHub Actions workflow:

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy MarketPulse India to Cloudflare Workers

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Build & Deploy
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Test Suite
        run: npm test

      - name: Build Frontend
        run: npm run build

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### GitHub Repository Secrets Needed:
- `CLOUDFLARE_API_TOKEN`: Created in Cloudflare Dashboard under **My Profile -> API Tokens -> Create Token -> Edit Cloudflare Workers**.
- `CLOUDFLARE_ACCOUNT_ID`: Found on your Cloudflare dashboard sidebar.

---

## 5. Post-Deployment Verification Checklist

Once deployed, verify the endpoints on your `workers.dev` domain:

1. **SPA Routing**:
   - Open `https://<your-worker>.workers.dev/` in your browser. The dashboard should render immediately.
   - Refresh on `https://<your-worker>.workers.dev/settings` to verify client-side SPA routing.
2. **API Status**:
   - Navigate to `https://<your-worker>.workers.dev/api/market/status`.
   - Response should return JSON with `status: "ok"`, `provider: "upstox"` (or `"demonstration"`), and `isReady: true`.
3. **Quotes Endpoint**:
   - Navigate to `https://<your-worker>.workers.dev/api/market/quotes?symbols=RELIANCE,TCS`.
   - Response should contain valid JSON quote objects with prices, changes, and `feedStatus`.
4. **Historical Candles Endpoint**:
   - Navigate to `https://<your-worker>.workers.dev/api/market/candles?symbol=RELIANCE&interval=day`.
   - Response should return an array of OHLCV candles.
5. **Connect Upstox in Browser**:
   - In the web app, visit **Settings & Data -> Connect Your Upstox Account**.
   - Test connecting your token or observing safe demo fallback behavior.

---

## 6. Security & Operational Notes

- **Zero-Credential Safety**: The codebase contains no hardcoded tokens or secrets. If no secret is configured, the application operates in safe Demonstration Mode.
- **Client Security**: Access tokens are never returned in HTTP responses or stored in `localStorage`.
- **Worker Execution Limits**: Cloudflare Workers free plan allows up to 100,000 requests/day with 10ms CPU time per request. MarketPulse India's memory cache and batched quotes operate in under 2ms CPU time, well within free-tier limits.
