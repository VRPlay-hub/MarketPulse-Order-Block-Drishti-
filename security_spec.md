# Security Specification & Test-Driven Security Plan

## 1. Data Invariants
1. **User Identity Invariant**: All data in `/users/{userId}/**` strictly requires `request.auth != null` and `request.auth.uid == userId`. Cross-user reads or writes are unconditionally denied.
2. **Watchlist Integrity**: Every watchlist record must belong to the authenticated owner (`incoming().userId == request.auth.uid`). A user cannot create or manipulate watchlists in another user's space.
3. **Trade Ledger Integrity**: Trades contain financial execution records. `entryPrice > 0`, `exitPrice > 0`, `quantity > 0`, and numerical metrics must be bounded numbers. Owner ID cannot be altered post-creation.
4. **Zero-Trust Default**: All paths outside `/users/{userId}` fall under the global deny-all gate (`allow read, write: if false;`).
5. **No Custom Claim Delegation**: Authorization strictly derives from the authenticated path variable and document ownership.

## 2. The "Dirty Dozen" Payloads (Must return PERMISSION_DENIED)
1. **Unauthenticated Read**: Attempting to read `/users/{userId}/trades/{tradeId}` with `request.auth == null`.
2. **Cross-User Snooping**: Authenticated user `user_alice` querying `/users/user_bob/watchlists`.
3. **Cross-User Trade Injection**: User `user_alice` writing to `/users/user_bob/trades/trade_123`.
4. **Ghost Field Shadow Update**: Injecting arbitrary extra fields (e.g. `{ isAdmin: true }`) into `/users/{userId}`.
5. **ID Poisoning Attack**: Submitting 1.5KB junk string document ID or path traversal sequence.
6. **Negative Price/Volume Violation**: Trade payload with negative price `entryPrice: -500`.
7. **Negative Quantity Poisoning**: Trade payload with `quantity: -100`.
8. **Immutability Breach**: Updating `userId` on existing trade document to steal or transfer ownership.
9. **Blanket Query Scraping**: Attempting to list all users' trades across collection group without owner filter.
10. **Malicious Giant String Payload**: Injecting 50KB notes string to exhaust storage quota (DoS).
11. **Spoofed User Creation**: User `user_alice` creating profile at `/users/user_bob`.
12. **Unmitigated Non-numeric PnL**: Injecting malicious script strings into `netPnL` or `grossPnL`.

## 3. Security Rules Architecture
- Root catch-all: `match /{document=**} { allow read, write: if false; }`
- Hardened validators: `isValidId()`, `isValidUserProfile()`, `isValidWatchlist()`, `isValidTrade()`, `isValidPreferences()`
- Owner isolation: `request.auth != null && request.auth.uid == userId`
